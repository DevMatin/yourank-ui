import { useState, useEffect } from "react"

export function useWebSearchPersistence() {
  // Always start with false for new sessions/chats
  const [useWebSearch, setUseWebSearchState] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Initialize to false on mount (no localStorage persistence)
  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const setUseWebSearch = (value: boolean | ((prev: boolean) => boolean)) => {
    setUseWebSearchState(value)
  }

  return {
    useWebSearch,
    setUseWebSearch,
    isLoaded
  }
}
