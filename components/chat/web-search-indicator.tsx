import { FC } from "react"
import { IconWorld } from "@tabler/icons-react"

interface WebSearchIndicatorProps {
  isSearching: boolean
}

export const WebSearchIndicator: FC<WebSearchIndicatorProps> = ({
  isSearching
}) => {
  if (!isSearching) return null

  return (
    <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
      <IconWorld size={16} className="animate-pulse" />
      <span className="text-sm">Searching the web...</span>
    </div>
  )
}
