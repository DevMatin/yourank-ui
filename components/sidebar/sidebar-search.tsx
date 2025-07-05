import { ContentType } from "@/types"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "../ui/input"

interface SidebarSearchProps {
  contentType: ContentType
  searchTerm: string
  setSearchTerm: Function
}

export const SidebarSearch: FC<SidebarSearchProps> = ({
  contentType,
  searchTerm,
  setSearchTerm
}) => {
  const { t } = useTranslation()

  const CONTENT_KEYS: Record<ContentType, string> = {
    chats: "contentTypePlural.chats",
    presets: "contentTypePlural.presets",
    prompts: "contentTypePlural.prompts",
    files: "contentTypePlural.files",
    collections: "contentTypePlural.collections",
    assistants: "contentTypePlural.assistants",
    tools: "contentTypePlural.tools",
    models: "contentTypePlural.models"
  }

  return (
    <Input
      placeholder={t("sidebar.searchPlaceholder", {
        items: t(CONTENT_KEYS[contentType])
      })}
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
    />
  )
}
