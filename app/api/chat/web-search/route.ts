import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "edge"

// env vars
const DF_LOGIN = process.env.NEXT_PUBLIC_DATAFORSEO_LOGIN!
const DF_PASSWORD = process.env.NEXT_PUBLIC_DATAFORSEO_PASSWORD!
const AZURE_KEY = process.env.AZURE_OPENAI_KEY!
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!
const AZURE_DEPLOYMENT = process.env.AZURE_GPT_45_TURBO_NAME!

async function checkConnection(): Promise<boolean> {
  const auth = Buffer.from(`${DF_LOGIN}:${DF_PASSWORD}`).toString("base64")
  try {
    const res = await fetch("https://api.dataforseo.com/v3/appendix/status", {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      }
    })
    return res.ok
  } catch {
    return false
  }
}

async function fetchSearchResults(query: string) {
  const auth = Buffer.from(`${DF_LOGIN}:${DF_PASSWORD}`).toString("base64")
  const body = [
    { language_code: "en", location_name: "United States", keyword: query }
  ]
  const res = await fetch(
    "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DataForSEO error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function POST(req: NextRequest) {
  // 1) check network
  if (!(await checkConnection())) {
    return NextResponse.json(
      { error: "🚫 Cannot reach the internet. Try again later." },
      { status: 503 }
    )
  }

  // 2) parse
  const { query, chatSettings, messages } = await req.json()
  if (!query) {
    return NextResponse.json(
      { error: "Missing `query` in body" },
      { status: 400 }
    )
  }

  try {
    // 3) rebuild history - properly filter out null values
    const validMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      []

    if (Array.isArray(messages)) {
      for (const m of messages) {
        const msg = m.message ?? m

        // Skip if no role or content
        if (!msg.role || !msg.content || typeof msg.content !== "string") {
          continue
        }

        // Create properly typed message based on role
        if (msg.role === "user") {
          validMessages.push({
            role: "user",
            content: msg.content
          })
        } else if (msg.role === "assistant") {
          validMessages.push({
            role: "assistant",
            content: msg.content
          })
        } else if (msg.role === "system") {
          validMessages.push({
            role: "system",
            content: msg.content
          })
        }
        // Skip any other roles
      }
    }

    // 4) Always try to generate contextual search query when we have conversation history
    let searchQuery = query

    // If we have conversation history, use AI to determine if query needs context
    // and generate a better search query
    if (validMessages.length > 0) {
      try {
        const client = new OpenAI({
          apiKey: AZURE_KEY,
          baseURL: `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}`,
          defaultHeaders: { "api-key": AZURE_KEY },
          defaultQuery: { "api-version": "2023-12-01-preview" }
        })

        const queryGenerationResponse = await client.chat.completions.create({
          model: AZURE_DEPLOYMENT,
          temperature: 0,
          max_tokens: 150,
          messages: [
            {
              role: "system",
              content:
                "Analyze the user's question and conversation context. If the question relates to or references anything from the conversation history, generate a specific web search query that incorporates that context. If the question is completely independent, return the original query unchanged. Return ONLY the search query, nothing else."
            },
            ...validMessages.slice(-8), // Last 8 messages for more context
            {
              role: "user",
              content: `User question: "${query}"\n\nBased on our conversation above, what specific search query would best help answer this question? If this question relates to anything we discussed (like specific topics, events, people, places, etc.), incorporate that context into the search query. If it's completely unrelated to our conversation, just return the original question.`
            }
          ]
        })

        const generatedQuery =
          queryGenerationResponse.choices[0]?.message?.content?.trim()
        if (
          generatedQuery &&
          generatedQuery.length > 3 &&
          generatedQuery !== query
        ) {
          searchQuery = generatedQuery
          console.log(`Enhanced search query: "${query}" → "${searchQuery}"`)
        }
      } catch (error) {
        console.log(
          "Contextual query generation failed, using original query:",
          error
        )
        // Continue with original query if generation fails
      }
    }

    // 5) fetch SERP with the (possibly improved) search query
    const df = await fetchSearchResults(searchQuery)
    const items = (df.tasks?.[0]?.result?.[0]?.items as any[]) || []

    // 6) normalize
    const search_results = items.map(i => ({
      type: i.type,
      title: i.title,
      link: i.url,
      snippet: i.description,
      image: i.images?.[0]?.url,
      date: i.timestamp?.split(" ")[0],
      channel: i.website_name
    }))

    // 7) setup OpenAI client
    const client = new OpenAI({
      apiKey: AZURE_KEY,
      baseURL: `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}`,
      defaultHeaders: { "api-key": AZURE_KEY },
      defaultQuery: { "api-version": "2023-12-01-preview" }
    })

    const history = validMessages

    // 7) construct prompt with proper typing
    const systemMsg: OpenAI.Chat.Completions.ChatCompletionSystemMessageParam =
      {
        role: "system",
        content:
          "You are ChatGPT, a helpful assistant with web search capabilities. You have access to both the conversation history and current web search results. When answering:\n\n1. ALWAYS consider the full conversation context first\n2. If the user's question relates to anything discussed previously, use that context to inform your answer\n3. Use the provided web search results to supplement your response with current information\n4. Always cite sources by number when using search results\n5. If the question is about something specific from our conversation (like 'point 15', 'that company', 'the event we discussed'), prioritize that context over generic search results\n6. Provide comprehensive answers that combine conversational context with fresh web data"
      }

    const searchResultsMsg: OpenAI.Chat.Completions.ChatCompletionUserMessageParam =
      {
        role: "user",
        content: `Here are current web search results for "${searchQuery}"${searchQuery !== query ? ` (searched for: "${searchQuery}" based on context: "${query}")` : ""}:\n\n${JSON.stringify(search_results, null, 2)}\n\nPlease use these search results to answer the user's question, considering the full conversation context.`
      }

    const userMsg: OpenAI.Chat.Completions.ChatCompletionUserMessageParam = {
      role: "user",
      content: query
    }

    // 8) call Azure with properly typed messages - IMPORTANT: history goes BEFORE search results
    const resp = await client.chat.completions.create({
      model: AZURE_DEPLOYMENT,
      temperature: chatSettings?.temperature ?? 0,
      max_tokens: 1200,
      messages: [systemMsg, ...history, searchResultsMsg, userMsg]
    })

    const assistantContent = resp.choices[0]?.message?.content || ""

    // **NO DATABASE PERSISTENCE HERE** — front end will handle that
    return NextResponse.json({ message: assistantContent }, { status: 200 })
  } catch (err: any) {
    console.error("web-search error:", err)
    return NextResponse.json(
      { error: err.message || "Unexpected server error" },
      { status: 500 }
    )
  }
}
