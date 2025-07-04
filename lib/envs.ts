import { EnvKey } from "@/types/key-type"

// Prüft, ob eine ENV-Variable vorhanden ist (optional nutzbar)
export function isUsingEnvironmentKey(type: EnvKey) {
  return Boolean(process.env[type])
}

// Exportiere alle ENV-Werte zentral
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENAI_API_HOST = process.env.OPENAI_API_HOST!;
export const AZURE_DEPLOYMENT_ID = process.env.AZURE_DEPLOYMENT_ID!;
export const OPENAI_API_VERSION = process.env.OPENAI_API_VERSION!;

// (Optional) Supabase falls weiterhin gebraucht
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
