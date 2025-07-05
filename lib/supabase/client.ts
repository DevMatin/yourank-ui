import { createBrowserClient } from "@supabase/ssr"
import { getConfig } from "../config"

export const createClient = async () => {
  const url = await getConfig("NEXT_PUBLIC_SUPABASE_URL")
  const anonKey = await getConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  if (!url || !anonKey) {
    throw new Error("Missing Supabase configuration")
  }
  return createBrowserClient(url, anonKey)
}
