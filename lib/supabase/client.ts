import { createBrowserClient } from "@supabase/ssr"
import { getConfig } from "../config"

export const createClient = async () =>
  createBrowserClient(
    (await getConfig("NEXT_PUBLIC_SUPABASE_URL"))!,
    (await getConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY"))!
  )
