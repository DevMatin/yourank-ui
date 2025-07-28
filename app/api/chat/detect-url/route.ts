import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

// URL regex pattern that matches various URL formats
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g

interface UrlDetectionResult {
  hasUrl: boolean
  urls: string[]
  cleanedQuery: string
  mainUrl?: string
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query in request body" },
        { status: 400 }
      )
    }

    // Find all URLs in the query
    const matches = Array.from(query.matchAll(URL_REGEX))
    const urls = matches.map(match => match[0])

    // Remove URLs from query to get cleaned text
    const cleanedQuery = query.replace(URL_REGEX, "").trim()

    // Determine if this looks like a crawling request
    const hasUrl = urls.length > 0
    const mainUrl = urls.length > 0 ? urls[0] : undefined

    // Additional context clues that suggest crawling intent
    const crawlKeywords = [
      "analyze this website",
      "crawl this site",
      "what's on this page",
      "summarize this website",
      "extract content from",
      "get content from",
      "read this page",
      "analyze this page",
      "what does this website say",
      "content of this site"
    ]

    const hasCrawlIntent = crawlKeywords.some(keyword =>
      query.toLowerCase().includes(keyword.toLowerCase())
    )

    const result: UrlDetectionResult = {
      hasUrl,
      urls,
      cleanedQuery: cleanedQuery || "Please analyze this website",
      mainUrl
    }

    // More explicit logging
    console.log(`🔍 URL Detection Analysis:`)
    console.log(`   Query: "${query}"`)
    console.log(`   URLs found: ${urls.length} - ${JSON.stringify(urls)}`)
    console.log(`   Has crawl keywords: ${hasCrawlIntent}`)
    console.log(`   Should crawl: ${hasUrl || hasCrawlIntent}`)
    console.log(`   Main URL: ${mainUrl}`)

    return NextResponse.json({
      success: true,
      shouldCrawl: hasUrl || hasCrawlIntent,
      data: result
    })
  } catch (error: any) {
    console.error("URL detection error:", error)
    return NextResponse.json(
      { error: "Failed to detect URLs", success: false, shouldCrawl: false },
      { status: 500 }
    )
  }
}
