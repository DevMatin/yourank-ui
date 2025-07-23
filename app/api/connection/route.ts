// app/api/connection/route.ts
import { NextRequest, NextResponse } from "next/server"
export const runtime = "edge"

export async function GET(request: NextRequest) {
  const login = process.env.NEXT_PUBLIC_DATAFORSEO_LOGIN
  const password = process.env.NEXT_PUBLIC_DATAFORSEO_PASSWORD
  if (!login || !password) {
    return NextResponse.json(
      { ok: false, error: "Missing credentials" },
      { status: 500 }
    )
  }
  const auth = Buffer.from(`${login}:${password}`).toString("base64")
  const res = await fetch("https://api.dataforseo.com/v3/appendix/status", {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    }
  })
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status })
  const info = await res.json()
  return NextResponse.json({ ok: true, info }, { status: 200 })
}
z
