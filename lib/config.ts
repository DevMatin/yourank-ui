import { get } from "@vercel/edge-config"

export async function getConfig(name: string): Promise<string | undefined> {
  if (process.env.EDGE_CONFIG) {
    try {
      return (await get(name)) as string | undefined
    } catch {
      return undefined
    }
  }
  return process.env[name]
}
