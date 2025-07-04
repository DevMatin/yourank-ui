export const chatPresets = {
  seoAssistant: "Du bist ein SEO-Experte. Antworte präzise und hilf dem Kunden, bessere Rankings zu erreichen.",
  marketingHelper: "Du bist ein Marketing-Assistent. Gib kreative und hilfreiche Tipps.",
  supportBot: "Du bist ein technischer Support-Bot. Antworte klar und verständlich.",
} as const

export type ChatPresetKey = keyof typeof chatPresets
