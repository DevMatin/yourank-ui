import { getServerProfile, checkApiKey } from "@/lib/server/server-chat-helpers"
import OpenAI from "openai"

export const runtime = "edge"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query, search_results, chatSettings, messages } = body

    // --- Validate Azure credentials ---
    const profile = await getServerProfile()
    checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")
    const ENDPOINT = profile.azure_openai_endpoint
    const KEY = profile.azure_openai_api_key
    const DEPLOYMENT =
      profile.azure_openai_45_turbo_id || profile.azure_openai_35_turbo_id
    if (!ENDPOINT || !KEY || !DEPLOYMENT) {
      return new Response(
        JSON.stringify({ error: "Azure configuration error" }),
        { status: 500 }
      )
    }

    // --- Organize search results ---
    const news = (search_results || []).filter((r: any) => r.type === "news")
    const images = (search_results || []).filter((r: any) => r.type === "image")
    const videos = (search_results || []).filter((r: any) => r.type === "video")
    const organic = (search_results || []).filter(
      (r: any) => r.type === "organic"
    )

    // --- Build sources for the bottom ---
    const allSources = [
      ...news.map((n: any) => `[${n.title}](${n.link})`),
      ...images.map((i: any) => `[${i.title || "Image"}](${i.link})`),
      ...videos.map((v: any) => `[${v.title}](${v.link})`),
      ...organic.map((o: any) => `[${o.title}](${o.link})`)
    ]

    // --- Find hero image (first image or organic with image) ---
    let heroImage =
      images[0] ||
      (organic.find((o: any) => o.image)
        ? {
            image: organic.find((o: any) => o.image).image,
            link: organic.find((o: any) => o.image).link,
            title: organic.find((o: any) => o.image).title
          }
        : null)

    // --- Improved system prompt ---
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })

    // --- Build rich tool message ---
    let toolContent = ""

    // Add a quick summary
    toolContent +=
      `### Quick Summary\n\n` +
      `Here are the top stories and updates as of **${today}**.\n\n`

    // Add hero image as a banner if available
    if (heroImage) {
      toolContent += `### 🌟 Featured Image\n\n[![${heroImage.title || "Image"}](${heroImage.image})](${heroImage.link})\n\n`
    }

    // Add image gallery as a horizontal banner
    if (images.length > 1) {
      toolContent +=
        `### 🖼️ Image Gallery\n\n` +
        images
          .slice(0, 4)
          .map((img: any) => `![${img.title || "Image"}](${img.image})`)
          .join(" ") +
        "\n\n"
    }

    // Add latest news with structured formatting
    if (news.length) {
      toolContent +=
        `### 📰 Latest News\n\n` +
        news
          .map(
            (n: any) =>
              `* **${n.title}** (${n.date || "Unknown Date"})\n  ${n.snippet}\n  [Source](${n.link})`
          )
          .join("\n") +
        "\n\n"
    } else {
      toolContent += `No specific news articles were found in the search results.\n\n`
    }

    // Add videos as a structured list with titles and links
    if (videos.length) {
      toolContent +=
        `### 🎬 Videos\n\n` +
        videos
          .map(
            (v: any) =>
              `* [${v.title}](${v.link})${v.channel ? ` (${v.channel})` : ""}`
          )
          .join("\n") +
        "\n\n"
    } else {
      toolContent += `No videos were found in the search results.\n\n`
    }

    // Add organic web results with snippets and links
    if (organic.length) {
      toolContent +=
        `### 🌐 Web Results\n\n` +
        organic
          .map(
            (o: any) =>
              `* **${o.title}**\n  ${o.snippet}\n  [Source](${o.link})`
          )
          .join("\n") +
        "\n\n"
    } else {
      toolContent += `No additional web results were found.\n\n`
    }

    // Add sources in a collapsible section for better readability
    if (allSources.length) {
      toolContent +=
        `<details>\n<summary><strong>Sources</strong></summary>\n\n` +
        allSources
          .map((src: any, i: number) => `[${i + 1}] ${src}`)
          .join("  \n") +
        "\n\n</details>\n"
    }

    const systemMsg = {
      role: "system",
      content: `
You are a news assistant with access to the Google search engine. Please:

- At the beginning, confirm whether you are connected to Google and have access to breaking news.
- Search only on Google for today's most important stories (current date: ${today}).
- Concisely present the key information for each story.
- Then cite the exact sources.
- Use a clear format with clear sections and references.

You are to present a web search answer in the style of ChatGPT's browsing tool.

- Start with a **brief summary** (2-4 lines) about the topic.
- Then show a **Latest News** section (if available), listing headlines as bullet points with dates.
- If there are images, show a **horizontal row of images** at the top using markdown image tags.
- If there are videos, show a **Videos** section as a markdown bulleted list with titles and links.
- After all, show a **Sources** section at the end, using a collapsible markdown details/summary section (if possible).
- Use clear sections and modern markdown formatting. DO NOT use HTML except for details/summary if you want collapsible.
- Always cite your sources as [number] and match to the sources list.

Here is a template for you (adapt for content):

---
**Germany: Quick Summary**

Germany is a central European country known for its history, industry, and culture. It leads Europe in technology and exports and is famous for cities like Berlin and Munich, the Black Forest, and Oktoberfest.

---

### Latest News
- **[Headline 1]** (Date)  
  Short summary. [Source][1]

- **[Headline 2]** (Date)  
  Short summary. [Source][2]

---

### Image Gallery

![Image1](url1) ![Image2](url2) ![Image3](url3)

---

### Videos
- [Video title 1](video_link1)
- [Video title 2](video_link2)

---

<details>
<summary><strong>Sources</strong></summary>

[1] [News Source 1](link1)  
[2] [News Source 2](link2)  
...  
</details>

If there are no results in a section, omit that section. Always respond as if you are ChatGPT Bing browsing mode.
      `.replace(/^\s+/gm, "") // remove leading indentation
    }
    const toolMsg = {
      role: "assistant",
      name: "web_search_tool",
      content: toolContent
    }
    const userMsg = {
      role: "user",
      content: `Using the above web search, answer the user's question with sections and sources as instructed.`
    }

    // --- Azure OpenAI call ---
    const azure = new OpenAI({
      apiKey: KEY,
      baseURL: `${ENDPOINT}/openai/deployments/${DEPLOYMENT}`,
      defaultHeaders: { "api-key": KEY },
      defaultQuery: { "api-version": "2023-12-01-preview" }
    })
    const chat = await azure.chat.completions.create({
      model: DEPLOYMENT,
      temperature: chatSettings?.temperature ?? 0,
      messages: [systemMsg, toolMsg, userMsg, ...(messages || [])],
      max_tokens: 1200
    })
    const answer = chat.choices[0]?.message?.content || ""

    return new Response(JSON.stringify({ message: answer }), { status: 200 })
  } catch (err: any) {
    console.error("web-search error:", err)
    return new Response(
      JSON.stringify({ error: err.message || "Unexpected server error" }),
      { status: 500 }
    )
  }
}
