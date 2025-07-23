// app/api/serpapi/route.ts
import { NextRequest, NextResponse } from "next/server"
export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")
  if (!q) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    )
  }

  const login = process.env.NEXT_PUBLIC_DATAFORSEO_LOGIN
  const password = process.env.NEXT_PUBLIC_DATAFORSEO_PASSWORD
  if (!login || !password) {
    return NextResponse.json(
      { error: "Missing DataForSEO credentials" },
      { status: 500 }
    )
  }

  const auth = Buffer.from(`${login}:${password}`).toString("base64")
  const body = [
    { language_code: "en", location_name: "United States", keyword: q }
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
    return NextResponse.json(
      { error: "DataForSEO error" },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
