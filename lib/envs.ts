import { EnvKey } from "@/types/key-type"
import { getConfig, requireConfig } from "./config"

export async function isUsingEnvironmentKey(type: EnvKey) {
  return Boolean(await getConfig(type))
}

export const OPENAI_API_KEY = await requireConfig("OPENAI_API_KEY")
export const OPENAI_API_HOST = await requireConfig("OPENAI_API_HOST")
export const AZURE_DEPLOYMENT_ID = await requireConfig("AZURE_DEPLOYMENT_ID")
export const OPENAI_API_VERSION = await requireConfig("OPENAI_API_VERSION")

export const NEXT_PUBLIC_SUPABASE_URL = await requireConfig(
  "NEXT_PUBLIC_SUPABASE_URL"
)
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = await requireConfig(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)
export const SUPABASE_SERVICE_ROLE_KEY = await requireConfig(
  "SUPABASE_SERVICE_ROLE_KEY"
)
