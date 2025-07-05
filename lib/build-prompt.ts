import { Tables } from "@/supabase/types"
import { ChatPayload, MessageImage } from "@/types"
import { encode } from "gpt-tokenizer"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"

/**
 * Baut den Basis-Prompt zusammen (mit Preset, Profil, Workspace, Assistant)
 */
const buildBasePrompt = (
  prompt: string,
  profileContext: string,
  workspaceInstructions: string,
  assistant: Tables<"assistants"> | null
) => {
  let fullPrompt = ""

  if (assistant) {
    fullPrompt += `<INJECT ROLE>\nYou are not an AI. You are ${assistant.name}.\n</INJECT ROLE>\n\n`
  }

  fullPrompt += `Today is ${new Date().toLocaleDateString()}.\n\n`

  if (profileContext) {
    fullPrompt += `User Info:\n${profileContext}\n\n`
  }

  if (workspaceInstructions) {
    fullPrompt += `System Instructions:\n${workspaceInstructions}\n\n`
  }

  fullPrompt += `User Instructions:\n${prompt}`

  return fullPrompt
}

/**
 * Baut die finalen Nachrichten für den API-Aufruf
 */
export async function buildFinalMessages(
  payload: ChatPayload,
  profile: Tables<"profiles">,
  chatImages: MessageImage[]
) {
  const {
    chatSettings,
    workspaceInstructions,
    chatMessages,
    assistant,
    messageFileItems,
    chatFileItems
  } = payload

  const BUILT_PROMPT = buildBasePrompt(
    chatSettings.prompt,
    chatSettings.includeProfileContext ? profile.profile_context || "" : "",
    chatSettings.includeWorkspaceInstructions ? workspaceInstructions : "",
    assistant
  )

  const CHUNK_SIZE = chatSettings.contextLength
  const PROMPT_TOKENS = encode(chatSettings.prompt).length
  let remainingTokens = CHUNK_SIZE - PROMPT_TOKENS
  let usedTokens = PROMPT_TOKENS

  // Anhängen von Quellen, falls notwendig
  const processedChatMessages = chatMessages.map((chatMessage, index) => {
    const nextChatMessage = chatMessages[index + 1]
    if (!nextChatMessage) return chatMessage

    const nextChatMessageFileItems = nextChatMessage.fileItems
    if (nextChatMessageFileItems.length > 0) {
      const findFileItems = nextChatMessageFileItems
        .map(fileItemId =>
          chatFileItems.find(chatFileItem => chatFileItem.id === fileItemId)
        )
        .filter(item => item !== undefined) as Tables<"file_items">[]

      const retrievalText = buildRetrievalText(findFileItems)

      return {
        message: {
          ...chatMessage.message,
          content: `${chatMessage.message.content}\n\n${retrievalText}`
        },
        fileItems: []
      }
    }

    return chatMessage
  })

  let finalMessages: any[] = []

  // Nachrichten von hinten auffüllen
  for (let i = processedChatMessages.length - 1; i >= 0; i--) {
    const message = processedChatMessages[i].message
    const messageTokens = encode(message.content).length
    if (messageTokens <= remainingTokens) {
      remainingTokens -= messageTokens
      usedTokens += messageTokens
      finalMessages.unshift(message)
    } else {
      break
    }
  }

  // System-Prompt als erste Nachricht
  const systemMessage: Tables<"messages"> = {
    chat_id: "",
    assistant_id: null,
    content: BUILT_PROMPT,
    created_at: "",
    id: "system",
    image_paths: [],
    model: payload.chatSettings.model,
    role: "system",
    sequence_number: -1,
    updated_at: "",
    user_id: ""
  }
  finalMessages.unshift(systemMessage)

  // Bilder anpassen
  finalMessages = finalMessages.map(message => {
    if (message.image_paths.length > 0) {
      const imageParts = message.image_paths.map((path: string) => {
        let formedUrl = path
        if (!path.startsWith("data")) {
          const chatImage = chatImages.find(img => img.path === path)
          formedUrl = chatImage?.base64 || path
        }
        return {
          type: "image_url",
          image_url: { url: formedUrl }
        }
      })
      return {
        role: message.role,
        content: [
          { type: "text", text: message.content },
          ...imageParts
        ]
      }
    }
    return {
      role: message.role,
      content: message.content
    }
  })

  // Letzte Nachricht mit Quellen anreichern
  if (messageFileItems.length > 0) {
    const retrievalText = buildRetrievalText(messageFileItems)
    const last = finalMessages[finalMessages.length - 1]
    finalMessages[finalMessages.length - 1] = {
      ...last,
      content: `${last.content}\n\n${retrievalText}`
    }
  }

  return finalMessages
}

function buildRetrievalText(fileItems: Tables<"file_items">[]) {
  const retrievalText = fileItems
    .map(item => `<BEGIN SOURCE>\n${item.content}\n</END SOURCE>`)
    .join("\n\n")
  return `You may use the following sources if needed to answer the user's question. If you don't know the answer, say "I don't know."\n\n${retrievalText}`
}

/**
 * Google Gemini Adapter: Einzelnachricht
 */
function adaptSingleMessageForGoogleGemini(message: any) {
  const rawParts = Array.isArray(message.content)
    ? message.content
    : [{ type: "text", text: message.content }]

  const parts = rawParts.map(part => {
    if (part.type === "text") {
      return { text: part.text }
    } else if (part.type === "image_url") {
      return {
        inlineData: {
          data: getBase64FromDataURL(part.image_url.url),
          mimeType: getMediaTypeFromDataURL(part.image_url.url)
        }
      }
    }
    return null
  }).filter(Boolean)

  const role = ["user", "system"].includes(message.role) ? "user" : "model"

  return { role, parts }
}

/**
 * Google Gemini Vision Adapter
 */
function adaptMessagesForGeminiVision(messages: any[]) {
  const basePrompt = messages[0].parts[0].text
  const baseRole = messages[0].role
  const lastMessage = messages[messages.length - 1]
  const visualParts = lastMessage.parts

  return [{
    role: "user",
    parts: [
      `${baseRole}:\n${basePrompt}\n\nuser:\n${visualParts[0].text}\n\n`,
      ...visualParts.slice(1)
    ]
  }]
}

/**
 * Gesamtadapter für Google Gemini
 */
export async function adaptMessagesForGoogleGemini(
  payload: ChatPayload,
  messages: any[]
) {
  let geminiMessages = messages.map(adaptSingleMessageForGoogleGemini)

  if (payload.chatSettings.model === "gemini-pro-vision") {
    geminiMessages = adaptMessagesForGeminiVision(geminiMessages)
  }

  return geminiMessages
}
