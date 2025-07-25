// app/api/web-search/route.ts

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
    // 3) fetch SERP
    const df = await fetchSearchResults(query)
    const items = (df.tasks?.[0]?.result?.[0]?.items as any[]) || []

    // 4) normalize
    const search_results = items.map(i => ({
      type: i.type,
      title: i.title,
      link: i.url,
      snippet: i.description,
      image: i.images?.[0]?.url,
      date: i.timestamp?.split(" ")[0],
      channel: i.website_name
    }))

    // 5) setup OpenAI client
    const client = new OpenAI({
      apiKey: AZURE_KEY,
      baseURL: `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}`,
      defaultHeaders: { "api-key": AZURE_KEY },
      defaultQuery: { "api-version": "2023-12-01-preview" }
    })

    // 6) rebuild history
    const history = Array.isArray(messages)
      ? messages
          .map((m: any) => {
            const msg = m.message ?? m
            return msg.role && msg.content
              ? { role: msg.role, content: msg.content }
              : null
          })
          .filter((m): m is { role: string; content: string } => !!m)
      : []

    // 7) construct prompt
    const systemMsg = {
      role: "system" as const,
      content:
        "You are ChatGPT, a helpful assistant. Use the up‑to‑date web search results below; cite sources by number."
    }
    const toolMsg = {
      role: "assistant" as const,
      name: "web_search_tool",
      content: JSON.stringify(search_results, null, 2)
    }
    const userMsg = {
      role: "user" as const,
      content: `User asked: "${query}". Use the search results above to answer.`
    }

    // 8) call Azure
    const resp = await client.chat.completions.create({
      model: AZURE_DEPLOYMENT,
      temperature: chatSettings?.temperature ?? 0,
      max_tokens: 1200,
      messages: [systemMsg, toolMsg, userMsg, ...history]
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
