import { createBrowserClient } from "@supabase/ssr"
import { requireConfig } from "../config"

export const createClient = async () =>
  createBrowserClient(
    await requireConfig("NEXT_PUBLIC_SUPABASE_URL"),
    await requireConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  )
