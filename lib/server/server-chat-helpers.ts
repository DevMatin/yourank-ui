import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getConfig } from "../config"

/**
 * Holt das aktuelle Server-User-Profil (mit Azure API-Daten aus ENV)
 */
export async function getServerProfile() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    (await getConfig("NEXT_PUBLIC_SUPABASE_URL"))!,
    (await getConfig("NEXT_PUBLIC_SUPABASE_ANON_KEY"))!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const { data } = await supabase.auth.getUser()
  const user = data.user

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

  return {
    ...profile,
    azure_openai_api_key: await getConfig("AZURE_OPENAI_API_KEY"),
    azure_openai_endpoint: await getConfig("AZURE_OPENAI_ENDPOINT"),
    azure_openai_35_turbo_id: await getConfig("AZURE_GPT_35_TURBO_NAME"),
    azure_openai_45_turbo_id: await getConfig("AZURE_GPT_45_TURBO_NAME"),
    azure_openai_45_vision_id: await getConfig("AZURE_GPT_45_VISION_NAME")
  }
}

/**
 * Prüft, ob ein API-Key vorhanden ist
 */
export function checkApiKey(
  apiKey: string | null | undefined,
  keyName: string
) {
  if (!apiKey) {
    throw new Error(`${keyName} API Key not found`)
  }
}
