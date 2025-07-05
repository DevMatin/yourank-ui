import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getConfig } from "../config"

export const createClient = async (cookieStore: ReturnType<typeof cookies>) => {
  const url = await getConfig("NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = await getConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  if (!url || !anonKey) {
    throw new Error("Missing Supabase configuration")
  }
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options })
        } catch (error) {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    }
  })
}
