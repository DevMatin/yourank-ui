import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"
import { getConfig } from "../config"

const url = await getConfig("NEXT_PUBLIC_SUPABASE_URL")
const anonKey = await getConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if (!url || !anonKey) {
  throw new Error("Missing Supabase configuration")
}

export const supabase = createBrowserClient<Database>(url, anonKey)
