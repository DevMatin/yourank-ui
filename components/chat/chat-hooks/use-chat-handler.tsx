import { ChatbotUIContext } from "@/context/context"
import { getAssistantCollectionsByAssistantId } from "@/db/assistant-collections"
import { getAssistantFilesByAssistantId } from "@/db/assistant-files"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { updateChat } from "@/db/chats"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { deleteMessagesIncludingAndAfter } from "@/db/messages"
import { buildFinalMessages } from "@/lib/build-prompt"
import { Tables } from "@/supabase/types"
import { ChatMessage, ChatPayload, LLMID, ModelProvider } from "@/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useRef } from "react"
import { LLM_LIST } from "../../../lib/models/llm/llm-list"
import {
  createTempMessages,
  handleCreateChat,
  handleCreateMessages,
  handleHostedChat,
  handleLocalChat,
  handleRetrieval,
  processResponse,
  validateChatSettings
} from "../chat-helpers"

export const useChatHandler = () => {
  const router = useRouter()

  const {
    userInput,
    chatFiles,
    setUserInput,
    setNewMessageImages,
    profile,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setSelectedTools,
    availableLocalModels,
    availableOpenRouterModels,
    abortController,
    setAbortController,
    chatSettings,
    newMessageImages,
    selectedAssistant,
    chatMessages,
    chatImages,
    setChatImages,
    setChatFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    newMessageFiles,
    chatFileItems,
    setChatFileItems,
    setToolInUse,
    useRetrieval,
    sourceCount,
    setIsPromptPickerOpen,
    setIsFilePickerOpen,
    selectedTools,
    selectedPreset,
    setChatSettings,
    models,
    isPromptPickerOpen,
    isFilePickerOpen,
    isToolPickerOpen
  } = useContext(ChatbotUIContext)

  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isPromptPickerOpen || !isFilePickerOpen || !isToolPickerOpen) {
      chatInputRef.current?.focus()
    }
  }, [isPromptPickerOpen, isFilePickerOpen, isToolPickerOpen])

  const handleNewChat = async () => {
    if (!selectedWorkspace) return

    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)
    setChatFileItems([])

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
    setIsPromptPickerOpen(false)
    setIsFilePickerOpen(false)

    setSelectedTools([])
    setToolInUse("none")

    if (selectedAssistant) {
      setChatSettings({
        model: selectedAssistant.model as LLMID,
        prompt: selectedAssistant.prompt,
        temperature: selectedAssistant.temperature,
        contextLength: selectedAssistant.context_length,
        includeProfileContext: selectedAssistant.include_profile_context,
        includeWorkspaceInstructions:
          selectedAssistant.include_workspace_instructions,
        embeddingsProvider: selectedAssistant.embeddings_provider as
          | "openai"
          | "local"
      })

      let allFiles = []

      const assistantFiles = (
        await getAssistantFilesByAssistantId(selectedAssistant.id)
      ).files
      allFiles = [...assistantFiles]
      const assistantCollections = (
        await getAssistantCollectionsByAssistantId(selectedAssistant.id)
      ).collections
      for (const collection of assistantCollections) {
        const collectionFiles = (
          await getCollectionFilesByCollectionId(collection.id)
        ).files
        allFiles = [...allFiles, ...collectionFiles]
      }
      const assistantTools = (
        await getAssistantToolsByAssistantId(selectedAssistant.id)
      ).tools

      setSelectedTools(assistantTools)
      setChatFiles(
        allFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          file: null
        }))
      )

      if (allFiles.length > 0) setShowFilesDisplay(true)
    } else if (selectedPreset) {
      setChatSettings({
        model: selectedPreset.model as LLMID,
        prompt: selectedPreset.prompt,
        temperature: selectedPreset.temperature,
        contextLength: selectedPreset.context_length,
        includeProfileContext: selectedPreset.include_profile_context,
        includeWorkspaceInstructions:
          selectedPreset.include_workspace_instructions,
        embeddingsProvider: selectedPreset.embeddings_provider as
          | "openai"
          | "local"
      })
    } else if (selectedWorkspace) {
      // setChatSettings({
      //   model: (selectedWorkspace.default_model ||
      //     "gpt-4-1106-preview") as LLMID,
      //   prompt:
      //     selectedWorkspace.default_prompt ||
      //     "You are a friendly, helpful AI assistant.",
      //   temperature: selectedWorkspace.default_temperature || 0.5,
      //   contextLength: selectedWorkspace.default_context_length || 4096,
      //   includeProfileContext:
      //     selectedWorkspace.include_profile_context || true,
      //   includeWorkspaceInstructions:
      //     selectedWorkspace.include_workspace_instructions || true,
      //   embeddingsProvider:
      //     (selectedWorkspace.embeddings_provider as "openai" | "local") ||
      //     "openai"
      // })
    }

    return router.push(`/${selectedWorkspace.id}/chat`)
  }

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus()
  }

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    const startingInput = messageContent

    try {
      setUserInput("")
      setIsGenerating(true)
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setNewMessageImages([])

      const newAbortController = new AbortController()
      setAbortController(newAbortController)

      const modelData = [
        ...models.map(model => ({
          modelId: model.model_id as LLMID,
          modelName: model.name,
          provider: "custom" as ModelProvider,
          hostedId: model.id,
          platformLink: "",
          imageInput: false
        })),
        ...LLM_LIST,
        ...availableLocalModels,
        ...availableOpenRouterModels
      ].find(llm => llm.modelId === chatSettings?.model)

      validateChatSettings(
        chatSettings,
        modelData,
        profile,
        selectedWorkspace,
        messageContent
      )

      let currentChat = selectedChat ? { ...selectedChat } : null

      const b64Images = newMessageImages.map(image => image.base64)

      let retrievedFileItems: Tables<"file_items">[] = []

      if (
        (newMessageFiles.length > 0 || chatFiles.length > 0) &&
        useRetrieval
      ) {
        setToolInUse("retrieval")

        retrievedFileItems = await handleRetrieval(
          userInput,
          newMessageFiles,
          chatFiles,
          chatSettings!.embeddingsProvider,
          sourceCount
        )
      }

      const { tempUserChatMessage, tempAssistantChatMessage } =
        createTempMessages(
          messageContent,
          chatMessages,
          chatSettings!,
          b64Images,
          isRegeneration,
          setChatMessages,
          selectedAssistant
        )

      // Auto-detect if URL crawling is needed (prioritize over web search)
      let needsCrawling = false
      let crawlUrl = ""
      let cleanedQuery = messageContent
      try {
        const urlDetectRes = await fetch("/api/chat/detect-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: newAbortController.signal,
          body: JSON.stringify({
            query: messageContent
          })
        })

        if (urlDetectRes.ok) {
          const { shouldCrawl, data } = await urlDetectRes.json()
          needsCrawling = shouldCrawl
          crawlUrl = data.mainUrl || ""
          cleanedQuery = data.cleanedQuery || messageContent
          console.log(
            `🕷️ AUTO-CRAWL DECISION: ${needsCrawling ? "YES" : "NO"} for URL: "${crawlUrl}"`
          )
          console.log(`   Original query: "${messageContent}"`)
          console.log(`   Cleaned query: "${cleanedQuery}"`)
        }
      } catch (error) {
        console.log("URL detection failed, proceeding without crawling:", error)
        needsCrawling = false
      }

      // Auto-detect if web search is needed (only if no crawling needed)
      let needsWebSearch = false
      if (!needsCrawling) {
        console.log("🌐 Checking for web search since no crawling needed...")
        try {
          const autoDetectRes = await fetch(
            "/api/chat/auto-detect-web-search",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: newAbortController.signal,
              body: JSON.stringify({
                query: messageContent,
                messages: isRegeneration
                  ? chatMessages
                  : [...chatMessages, tempUserChatMessage]
              })
            }
          )

          if (autoDetectRes.ok) {
            const { needsWebSearch: detected } = await autoDetectRes.json()
            needsWebSearch = detected
            console.log(
              `🌐 AUTO-WEB-SEARCH DECISION: ${needsWebSearch ? "YES" : "NO"} for query: "${messageContent}"`
            )
          }
        } catch (error) {
          console.log(
            "Auto-detection failed, proceeding without web search:",
            error
          )
          needsWebSearch = false
        }
      } else {
        console.log(
          "🚫 Skipping web search because crawling is needed for URL:",
          crawlUrl
        )
      }

      if (needsWebSearch) {
        setToolInUse("web-search")

        const res = await fetch("/api/chat/web-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: newAbortController.signal,
          body: JSON.stringify({
            query: messageContent,
            chatSettings,
            messages: isRegeneration
              ? chatMessages
              : [...chatMessages, tempUserChatMessage]
          })
        })
        if (!res.ok) throw new Error("Web‑search API error")
        const { message: assistantContent } = await res.json()

        // Create current chat if needed
        if (!currentChat) {
          currentChat = await handleCreateChat(
            chatSettings!,
            profile!,
            selectedWorkspace!,
            messageContent,
            selectedAssistant!,
            newMessageFiles,
            setSelectedChat,
            setChats,
            setChatFiles
          )
        }

        await handleCreateMessages(
          chatMessages, // Use original chatMessages, not the ones with temp messages added
          currentChat,
          profile!,
          modelData!,
          messageContent,
          assistantContent || "",
          newMessageImages,
          isRegeneration,
          [],
          setChatMessages,
          setChatFileItems,
          setChatImages,
          selectedAssistant
        )

        setToolInUse("none")
        setIsGenerating(false)
        setFirstTokenReceived(false)
        return
      }

      // Initialize payload for chat processing
      let payload: ChatPayload = {
        chatSettings: chatSettings!,
        workspaceInstructions: selectedWorkspace!.instructions || "",
        chatMessages: isRegeneration
          ? [...chatMessages]
          : [...chatMessages, tempUserChatMessage],
        assistant: selectedChat?.assistant_id ? selectedAssistant : null,
        messageFileItems: retrievedFileItems,
        chatFileItems: chatFileItems
      }

      // Handle website crawling if detected
      if (needsCrawling && crawlUrl) {
        setToolInUse("website-crawler")

        try {
          const crawlRes = await fetch("/api/chat/crawl-website", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: newAbortController.signal,
            body: JSON.stringify({
              url: crawlUrl
            })
          })

          if (!crawlRes.ok) throw new Error("Website crawling API error")
          const {
            success,
            data: crawlData,
            message: crawlMessage
          } = await crawlRes.json()

          if (success && crawlData) {
            // Create a comprehensive prompt with the crawled content
            const crawlPrompt = `I crawled the website "${crawlData.title}" from ${crawlData.url} and extracted the following content:

**Website Title:** ${crawlData.title}
**URL:** ${crawlData.url}
**Description:** ${crawlData.description || "No description available"}
**Content Length:** ${crawlData.metadata.wordCount} words
**Crawled At:** ${new Date(crawlData.metadata.crawledAt).toLocaleString()}

**Website Content:**
${crawlData.content}

**User's Question/Request:**
${cleanedQuery}

Please analyze the website content and respond to the user's question or request about this website.`

            // Create current chat if needed
            if (!currentChat) {
              currentChat = await handleCreateChat(
                chatSettings!,
                profile!,
                selectedWorkspace!,
                messageContent,
                selectedAssistant!,
                newMessageFiles,
                setSelectedChat,
                setChats,
                setChatFiles
              )
            }

            // Continue with regular chat processing using the crawled content
            payload = {
              chatSettings: chatSettings!,
              workspaceInstructions: selectedWorkspace!.instructions || "",
              chatMessages: isRegeneration
                ? [
                    ...chatMessages.slice(0, -1),
                    {
                      ...chatMessages[chatMessages.length - 1],
                      message: {
                        ...chatMessages[chatMessages.length - 1].message,
                        content: crawlPrompt
                      }
                    }
                  ]
                : [
                    ...chatMessages,
                    {
                      ...tempUserChatMessage,
                      message: {
                        ...tempUserChatMessage.message,
                        content: crawlPrompt
                      }
                    }
                  ],
              assistant: selectedChat?.assistant_id ? selectedAssistant : null,
              messageFileItems: retrievedFileItems,
              chatFileItems: chatFileItems
            }

            // Process the crawled content with the AI model
            let generatedText = ""
            setToolInUse("none")

            if (modelData!.provider === "ollama") {
              generatedText = await handleLocalChat(
                payload,
                profile!,
                chatSettings!,
                tempAssistantChatMessage,
                isRegeneration,
                newAbortController,
                setIsGenerating,
                setFirstTokenReceived,
                setChatMessages,
                setToolInUse
              )
            } else {
              generatedText = await handleHostedChat(
                payload,
                profile!,
                modelData!,
                tempAssistantChatMessage,
                isRegeneration,
                newAbortController,
                newMessageImages,
                chatImages,
                setIsGenerating,
                setFirstTokenReceived,
                setChatMessages,
                setToolInUse
              )
            }

            // Update chat and create messages
            if (!currentChat) {
              currentChat = await handleCreateChat(
                chatSettings!,
                profile!,
                selectedWorkspace!,
                messageContent,
                selectedAssistant!,
                newMessageFiles,
                setSelectedChat,
                setChats,
                setChatFiles
              )
            } else {
              const updatedChat = await updateChat(currentChat.id, {
                updated_at: new Date().toISOString()
              })
              setChats(prevChats => {
                const updatedChats = prevChats.map(prevChat =>
                  prevChat.id === updatedChat.id ? updatedChat : prevChat
                )
                return updatedChats
              })
            }

            await handleCreateMessages(
              chatMessages,
              currentChat,
              profile!,
              modelData!,
              messageContent,
              generatedText,
              newMessageImages,
              isRegeneration,
              retrievedFileItems,
              setChatMessages,
              setChatFileItems,
              setChatImages,
              selectedAssistant
            )

            setIsGenerating(false)
            setFirstTokenReceived(false)
            setToolInUse("none")
            return // Exit here after successful crawling and processing
          } else {
            throw new Error(crawlMessage || "Failed to crawl website")
          }
        } catch (crawlError: any) {
          console.error(
            "🚨 Crawling failed, falling back to web search:",
            crawlError
          )

          // Fallback to web search if crawling fails
          console.log("🔄 Attempting fallback to web search...")
          setToolInUse("web-search")

          try {
            const fallbackRes = await fetch("/api/chat/web-search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: newAbortController.signal,
              body: JSON.stringify({
                query: `${cleanedQuery} ${crawlUrl}`, // Include both cleaned query and URL for search
                chatSettings,
                messages: isRegeneration
                  ? chatMessages
                  : [...chatMessages, tempUserChatMessage]
              })
            })

            if (!fallbackRes.ok)
              throw new Error("Fallback web search also failed")
            const { message: assistantContent } = await fallbackRes.json()

            console.log("✅ Fallback web search successful")

            // Create current chat if needed
            if (!currentChat) {
              currentChat = await handleCreateChat(
                chatSettings!,
                profile!,
                selectedWorkspace!,
                messageContent,
                selectedAssistant!,
                newMessageFiles,
                setSelectedChat,
                setChats,
                setChatFiles
              )
            }

            await handleCreateMessages(
              chatMessages,
              currentChat,
              profile!,
              modelData!,
              messageContent,
              assistantContent || "",
              newMessageImages,
              isRegeneration,
              [],
              setChatMessages,
              setChatFileItems,
              setChatImages,
              selectedAssistant
            )

            setToolInUse("none")
            setIsGenerating(false)
            setFirstTokenReceived(false)
            return
          } catch (fallbackError: any) {
            console.error(
              "🚨 Both crawling and web search fallback failed:",
              fallbackError
            )
            throw new Error(
              `Website crawling failed (${crawlError.message || crawlError}) and web search fallback also failed (${fallbackError.message || fallbackError})`
            )
          }
        }
      }

      let generatedText = ""

      console.log(
        `🔧 TOOLS CHECK: selectedTools.length = ${selectedTools.length}`,
        selectedTools.map(t => t.name || t.id)
      )
      if (selectedTools.length > 0) {
        console.log("🛠️ Calling tools API because selectedTools.length > 0")
        setToolInUse("Tools")

        const formattedMessages = await buildFinalMessages(
          payload,
          profile!,
          chatImages
        )

        const response = await fetch("/api/chat/tools", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chatSettings: payload.chatSettings,
            messages: formattedMessages,
            selectedTools
          })
        })

        setToolInUse("none")

        generatedText = await processResponse(
          response,
          isRegeneration
            ? payload.chatMessages[payload.chatMessages.length - 1]
            : tempAssistantChatMessage,
          true,
          newAbortController,
          setFirstTokenReceived,
          setChatMessages,
          setToolInUse
        )
      } else {
        if (modelData!.provider === "ollama") {
          generatedText = await handleLocalChat(
            payload,
            profile!,
            chatSettings!,
            tempAssistantChatMessage,
            isRegeneration,
            newAbortController,
            setIsGenerating,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
        } else {
          generatedText = await handleHostedChat(
            payload,
            profile!,
            modelData!,
            tempAssistantChatMessage,
            isRegeneration,
            newAbortController,
            newMessageImages,
            chatImages,
            setIsGenerating,
            setFirstTokenReceived,
            setChatMessages,
            setToolInUse
          )
        }
      }

      if (!currentChat) {
        currentChat = await handleCreateChat(
          chatSettings!,
          profile!,
          selectedWorkspace!,
          messageContent,
          selectedAssistant!,
          newMessageFiles,
          setSelectedChat,
          setChats,
          setChatFiles
        )
      } else {
        const updatedChat = await updateChat(currentChat.id, {
          updated_at: new Date().toISOString()
        })

        setChats(prevChats => {
          const updatedChats = prevChats.map(prevChat =>
            prevChat.id === updatedChat.id ? updatedChat : prevChat
          )

          return updatedChats
        })
      }

      // Always persist after state update, and only then update UI state
      await handleCreateMessages(
        chatMessages,
        currentChat,
        profile!,
        modelData!,
        messageContent,
        generatedText,
        newMessageImages,
        isRegeneration,
        retrievedFileItems,
        setChatMessages,
        setChatFileItems,
        setChatImages,
        selectedAssistant
      )

      setIsGenerating(false)
      setFirstTokenReceived(false)
    } catch (error) {
      setIsGenerating(false)
      setFirstTokenReceived(false)
      setUserInput(startingInput)
    }
  }

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    if (!selectedChat) return

    await deleteMessagesIncludingAndAfter(
      selectedChat.user_id,
      selectedChat.id,
      sequenceNumber
    )

    const filteredMessages = chatMessages.filter(
      chatMessage => chatMessage.message.sequence_number < sequenceNumber
    )

    setChatMessages(filteredMessages)

    handleSendMessage(editedContent, filteredMessages, false)
  }

  return {
    chatInputRef,
    prompt,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  }
}
