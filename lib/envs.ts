import { EnvKey } from "@/types/key-type"
import { getConfig } from "./config"

export async function isUsingEnvironmentKey(type: EnvKey) {
  return Boolean(await getConfig(type))
}

export const OPENAI_API_KEY = (await getConfig("OPENAI_API_KEY"))!
export const OPENAI_API_HOST = (await getConfig("OPENAI_API_HOST"))!
export const AZURE_DEPLOYMENT_ID = (await getConfig("AZURE_DEPLOYMENT_ID"))!
export const OPENAI_API_VERSION = (await getConfig("OPENAI_API_VERSION"))!

export const NEXT_PUBLIC_SUPABASE_URL = (await getConfig(
  "NEXT_PUBLIC_SUPABASE_URL"
))!
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = (await getConfig(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
))!
export const SUPABASE_SERVICE_ROLE_KEY = (await getConfig(
  "SUPABASE_SERVICE_ROLE_KEY"
))!
