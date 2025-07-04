import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Holt das aktuelle Server-User-Profil (ohne API-Keys ins Profil zu mappen)
 */
export async function getServerProfile() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const { data: user } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("User not found")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    throw new Error("Profile not found")
  }

  return profile
}

/**
 * Prüft, ob ein API-Key vorhanden ist
 */
export function checkApiKey(apiKey: string | null, keyName: string) {
  if (!apiKey) {
    throw new Error(`${keyName} API Key not found`)
  }
}
