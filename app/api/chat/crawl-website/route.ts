import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

export const runtime = "edge"

interface CrawlResult {
  url: string
  title: string
  content: string
  description?: string
  metadata: {
    crawledAt: string
    wordCount: number
    status: "success" | "error"
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json(
        { error: "Missing URL in request body" },
        { status: 400 }
      )
    }

    // Validate URL format
    let validUrl: URL
    try {
      validUrl = new URL(url)
      if (!validUrl.protocol.startsWith("http")) {
        throw new Error("Invalid protocol")
      }
    } catch (error) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    console.log(`🕷️ Crawling website: ${validUrl.href}`)

    // Fetch the webpage
    const response = await fetch(validUrl.href, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YouRank-Crawler/1.0)"
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove unwanted elements
    $(
      "script, style, nav, header, footer, aside, .sidebar, .menu, .navigation"
    ).remove()

    // Extract title
    const title =
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      "Untitled Page"

    // Extract description
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      ""

    // Extract main content
    let content = ""

    // Try to find main content areas
    const contentSelectors = [
      "main",
      "article",
      ".content",
      ".main-content",
      ".post-content",
      ".entry-content",
      "#content",
      "#main"
    ]

    let foundContent = false
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0 && element.text().trim().length > 100) {
        content = element.text().trim()
        foundContent = true
        break
      }
    }

    // Fallback to body content if no main content found
    if (!foundContent) {
      $("body")
        .find("*")
        .each((_index: number, element: any) => {
          const tagName = element.tagName?.toLowerCase()
          if (
            [
              "p",
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
              "div",
              "section"
            ].includes(tagName || "")
          ) {
            const text = $(element).text().trim()
            if (text.length > 20) {
              content += text + "\n\n"
            }
          }
        })
    }

    // Clean up content
    content = content
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, "\n\n") // Clean up line breaks
      .trim()

    // Limit content length (approximately 8000 characters for context window)
    if (content.length > 8000) {
      content =
        content.substring(0, 8000) + "...\n\n[Content truncated for length]"
    }

    const result: CrawlResult = {
      url: validUrl.href,
      title,
      content,
      description,
      metadata: {
        crawledAt: new Date().toISOString(),
        wordCount: content.split(/\s+/).length,
        status: "success"
      }
    }

    console.log(
      `✅ Successfully crawled: ${title} (${result.metadata.wordCount} words)`
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully crawled "${title}" with ${result.metadata.wordCount} words of content.`
    })
  } catch (error: any) {
    console.error("Website crawling error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to crawl website",
        details: error.message,
        data: {
          metadata: {
            crawledAt: new Date().toISOString(),
            wordCount: 0,
            status: "error" as const
          }
        }
      },
      { status: 500 }
    )
  }
}
