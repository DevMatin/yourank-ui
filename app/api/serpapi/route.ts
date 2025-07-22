// app/api/serpapi/route.ts (not pages/api)
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const apiKey = process.env.NEXT_PUBLIC_SERPAPI_KEY

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    )
  }

  const res = await fetch(
    `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}`
  )
  const data = await res.json()

  return NextResponse.json(data)
}

// export async function POST(request: Request) {
//   const body = await request.json();
//   const query = body.query;
//   const apiKey = process.env.SERPAPI_KEY;

//   if (!query) {
//     return NextResponse.json({ error: "Missing query in body" }, { status: 400 });
//   }

//   const res = await fetch(`https://serpapi.com/search.json?engine=bing&q=${encodeURIComponent(query)}&api_key=${apiKey}`);
//   const data = await res.json();

//   return NextResponse.json(data);
// }
