import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"
import { getConfig } from "../config"

export const supabase = createBrowserClient<Database>(
  (await getConfig("NEXT_PUBLIC_SUPABASE_URL"))!,
  (await getConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY"))!
)
