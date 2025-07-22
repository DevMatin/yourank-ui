import React, { FC, useContext, useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { ChatbotUIContext } from "@/context/context"
import useHotkey from "@/lib/hooks/use-hotkey"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import {
  IconCirclePlus,
  IconPlayerStopFilled,
  IconSend
} from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Input } from "../ui/input"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { ChatFilesDisplay } from "./chat-files-display"
import { useChatHandler } from "./chat-hooks/use-chat-handler"
import { useChatHistoryHandler } from "./chat-hooks/use-chat-history"
import { usePromptAndCommand } from "./chat-hooks/use-prompt-and-command"
import { useSelectFileHandler } from "./chat-hooks/use-select-file-handler"
import { handleCreateChat } from "./chat-helpers"
import { createMessages } from "@/db/messages"

interface ChatInputProps {}

export const ChatInput: FC<ChatInputProps> = () => {
  const { t } = useTranslation()
  useHotkey("l", () => handleFocusChatInput())

  const [browsingMode, setBrowsingMode] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isBrowsingLoading, setIsBrowsingLoading] = useState(false)

  const {
    userInput,
    chatMessages,
    isGenerating,
    chatSettings,
    selectedAssistant,
    setUserInput,
    setChatMessages,
    profile,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setChatFiles
  } = useContext(ChatbotUIContext)

  const {
    chatInputRef,
    handleSendMessage,
    handleStopMessage,
    handleFocusChatInput
  } = useChatHandler()

  const { handleInputChange } = usePromptAndCommand()
  const { filesToAccept, handleSelectDeviceFile } = useSelectFileHandler()
  const {
    setNewMessageContentToNextUserMessage,
    setNewMessageContentToPreviousUserMessage
  } = useChatHistoryHandler()

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(handleFocusChatInput, 200)
  }, [selectedAssistant])

  const getSearchResults = async (query: string) => {
    setIsSearching(true)
    try {
      const res = await fetch(`/api/serpapi?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error("Search failed")
      const data = await res.json()
      return {
        news: (data.news_results || [])
          .slice(0, 3)
          .map((r: any) => ({ ...r, type: "news" })),
        images: (data.images_results || [])
          .slice(0, 5)
          .map((i: any) => ({ ...i, type: "image" })),
        videos: (data.inline_videos || [])
          .slice(0, 3)
          .map((v: any) => ({ ...v, type: "video" })),
        organic: (data.organic_results || [])
          .slice(0, 5)
          .map((o: any) => ({ ...o, type: "organic" }))
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleSend = async () => {
    if (!userInput?.trim()) return

    if (browsingMode) {
      setIsBrowsingLoading(true)
      try {
        // Defensive: ensure chatSettings is not null
        if (!chatSettings) {
          toast.error("Chat settings missing.")
          setIsBrowsingLoading(false)
          return
        }
        const now = new Date().toISOString()
        let chatId = chatMessages[0]?.message.chat_id || ""
        let userId = chatMessages[0]?.message.user_id || ""
        // If no chatId, create a new chat and update store
        if (!chatId) {
          if (!profile || !selectedWorkspace || !selectedAssistant) {
            toast.error("Profile, workspace, or assistant missing.")
            setIsBrowsingLoading(false)
            return
          }
          const createdChat = await handleCreateChat(
            chatSettings,
            profile,
            selectedWorkspace,
            userInput,
            selectedAssistant,
            [],
            setSelectedChat,
            setChats,
            setChatFiles
          )
          chatId = createdChat.id
          userId = profile.user_id
        }
        const base = {
          model: chatSettings.model,
          assistant_id: selectedAssistant?.id || null,
          chat_id: chatId,
          user_id: userId,
          image_paths: [] as string[]
        }
        // Insert user message immediately
        const userMsg = {
          message: {
            ...base,
            id: `${Date.now()}-user`,
            role: "user",
            content: userInput,
            created_at: now,
            updated_at: now,
            sequence_number: chatMessages.length
          },
          fileItems: []
        }
        // Insert placeholder assistant message immediately
        const placeholderId = `${Date.now()}-assistant-placeholder`
        const assistantMsg = {
          message: {
            ...base,
            id: placeholderId,
            role: "assistant",
            content: "GPT Turbo is thinking...\n",
            created_at: now,
            updated_at: now,
            sequence_number: chatMessages.length + 1
          },
          fileItems: []
        }
        setChatMessages([...chatMessages, userMsg, assistantMsg])
        setUserInput("")

        // Now do the web search and update the placeholder
        const { news, images, videos, organic } =
          await getSearchResults(userInput)
        const combined = [...news, ...videos, ...images, ...organic].slice(0, 8)
        if (!combined.length) {
          toast.error("No search results found.")
          // Remove the placeholder assistant message
          setChatMessages(msgs =>
            msgs.filter(m => m.message.id !== placeholderId)
          )
          return
        }
        const res = await fetch("/api/chat/web-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: userInput,
            search_results: combined,
            chatSettings,
            messages: [] // don't send previous messages for web search
          })
        })
        if (!res.ok) throw new Error("Web-search API failed")
        const { message } = await res.json()
        // Update the placeholder assistant message with the real response
        setChatMessages(msgs =>
          msgs.map(m =>
            m.message.id === placeholderId
              ? { ...m, message: { ...m.message, content: message } }
              : m
          )
        )
        // Persist both user and assistant messages to the database
        try {
          const userDbMsg = {
            chat_id: chatId,
            assistant_id: null,
            user_id: userId,
            content: userInput,
            model: chatSettings.model,
            role: "user",
            sequence_number: chatMessages.length,
            image_paths: [],
            created_at: now,
            updated_at: now
          }
          const assistantDbMsg = {
            chat_id: chatId,
            assistant_id: selectedAssistant?.id || null,
            user_id: userId,
            content: message,
            model: chatSettings.model,
            role: "assistant",
            sequence_number: chatMessages.length + 1,
            image_paths: [],
            created_at: now,
            updated_at: now
          }
          await createMessages([userDbMsg, assistantDbMsg])
        } catch (err) {
          console.error("Failed to persist browsing mode messages:", err)
        }
      } catch (e) {
        console.error(e)
        toast.error("Web search failed.")
        // Optionally update the placeholder with error
        setChatMessages(msgs =>
          msgs.map(m =>
            m.message.content === "GPT Turbo is thinking...\n"
              ? {
                  ...m,
                  message: { ...m.message, content: "Web search failed." }
                }
              : m
          )
        )
      } finally {
        setIsBrowsingLoading(false)
      }
      return
    }

    await handleSendMessage(userInput, chatMessages, false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const allowed = chatSettings
      ? LLM_LIST.find(l => l.modelId === chatSettings.model)?.imageInput
      : false
    Array.from(e.clipboardData.items).forEach(item => {
      if (item.type.startsWith("image") && allowed) {
        const file = item.getAsFile()
        file && handleSelectDeviceFile(file)
      }
    })
  }

  return (
    <>
      <div className="border-input relative mt-3 flex w-full flex-col rounded-xl border-2 bg-white dark:bg-black">
        <TextareaAutosize
          textareaRef={chatInputRef}
          className="w-full resize-none bg-transparent px-4 py-2 focus:outline-none"
          placeholder={t("How can I help you today?")}
          onValueChange={handleInputChange}
          value={userInput}
          minRows={1}
          maxRows={10}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <div className="flex items-center justify-between px-3 pb-2 pt-1">
          <div className="flex items-center space-x-2">
            <IconCirclePlus
              size={24}
              className="cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            />
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={browsingMode}
                onChange={() => setBrowsingMode(!browsingMode)}
              />
              <span className="text-sm">Browsing Mode</span>
            </label>
          </div>
          <div>
            {isGenerating ? (
              <IconPlayerStopFilled
                size={24}
                onClick={handleStopMessage}
                className="cursor-pointer"
              />
            ) : (
              <IconSend
                size={24}
                className={cn(
                  "cursor-pointer",
                  !userInput && "cursor-not-allowed opacity-50"
                )}
                onClick={handleSend}
              />
            )}
          </div>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={e =>
            e.target.files && handleSelectDeviceFile(e.target.files[0])
          }
          accept={filesToAccept}
        />
      </div>
    </>
  )
}
