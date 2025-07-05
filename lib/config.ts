import { get } from "@vercel/edge-config"

export async function getConfig(name: string): Promise<string | undefined> {
  if (process.env.EDGE_CONFIG) {
    try {
      const value = (await get<string | undefined>(name))
      if (value !== undefined) {
        return value
      }
    } catch {
      // ignore edge config errors and fall back to env
    }
  }
  return process.env[name]
}
