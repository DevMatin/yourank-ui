import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "edge"

const AZURE_KEY = process.env.AZURE_OPENAI_KEY!
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!
const AZURE_DEPLOYMENT = process.env.AZURE_GPT_45_TURBO_NAME!

export async function POST(req: NextRequest) {
  try {
    const { query, messages } = await req.json()

    if (!query) {
      return NextResponse.json(
        { error: "Missing query in request body" },
        { status: 400 }
      )
    }

    const client = new OpenAI({
      apiKey: AZURE_KEY,
      baseURL: `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}`,
      defaultHeaders: { "api-key": AZURE_KEY },
      defaultQuery: { "api-version": "2023-12-01-preview" }
    })

    // Build context from recent messages
    const contextMessages = []
    if (Array.isArray(messages) && messages.length > 0) {
      const recentMessages = messages.slice(-4) // Last 4 messages for context
      for (const m of recentMessages) {
        const msg = m.message ?? m
        if (msg.role && msg.content && typeof msg.content === "string") {
          contextMessages.push(`${msg.role}: ${msg.content.substring(0, 200)}`)
        }
      }
    }

    const contextString =
      contextMessages.length > 0
        ? `\n\nRecent conversation context:\n${contextMessages.join("\n")}`
        : ""

    const response = await client.chat.completions.create({
      model: AZURE_DEPLOYMENT,
      temperature: 0,
      max_tokens: 50,
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that determines whether a user's question needs current web search results to be answered properly. 

Respond with exactly "YES" if the question:
- Asks about current events, recent news, or latest information
- Requests real-time data (stock prices, weather, scores)
- Needs recent updates on ongoing situations
- Asks about current status of companies, people, or events
- Requires factual verification of recent claims
- References "latest", "current", "recent", "today", "now", etc.
- Is about trending topics or breaking news

Respond with exactly "NO" if the question:
- Is about general knowledge or historical facts
- Can be answered with conversation context alone
- Is a personal opinion or subjective question
- Is about creative writing, coding, or hypothetical scenarios
- Asks for explanations of established concepts
- Is a follow-up that references previous conversation content

Consider the conversation context when making your decision.`
        },
        {
          role: "user",
          content: `Question: "${query}"${contextString}\n\nDoes this question need current web search results? Answer with exactly "YES" or "NO".`
        }
      ]
    })

    const decision = response.choices[0]?.message?.content?.trim().toUpperCase()
    const needsWebSearch = decision === "YES"

    return NextResponse.json({
      needsWebSearch,
      confidence: decision === "YES" || decision === "NO" ? "high" : "low",
      reasoning: `Query analysis: ${decision}`
    })
  } catch (error: any) {
    console.error("Auto-detection error:", error)
    return NextResponse.json(
      { error: "Failed to analyze query", needsWebSearch: false },
      { status: 500 }
    )
  }
}
