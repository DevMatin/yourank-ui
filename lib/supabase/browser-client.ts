import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"
import { requireConfig } from "../config"

export const supabase = createBrowserClient<Database>(
  await requireConfig("NEXT_PUBLIC_SUPABASE_URL"),
  await requireConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)
