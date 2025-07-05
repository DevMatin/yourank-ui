import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getConfig } from "../config"

export const createClient = async (request: NextRequest) => {
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  const url = await getConfig("NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = await getConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  if (!url || !anonKey) {
    throw new Error("Missing Supabase configuration")
  }
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options
        })
        response = NextResponse.next({
          request: {
            headers: request.headers
          }
        })
        response.cookies.set({
          name,
          value,
          ...options
        })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options
        })
        response = NextResponse.next({
          request: {
            headers: request.headers
          }
        })
        response.cookies.set({
          name,
          value: "",
          ...options
        })
      }
    }
  })

  return { supabase, response }
}
