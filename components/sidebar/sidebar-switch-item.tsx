import { ContentType } from "@/types"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { TabsTrigger } from "../ui/tabs"
import { WithTooltip } from "../ui/with-tooltip"

interface SidebarSwitchItemProps {
  contentType: ContentType
  icon: React.ReactNode
  onContentTypeChange: (contentType: ContentType) => void
}

export const SidebarSwitchItem: FC<SidebarSwitchItemProps> = ({
  contentType,
  icon,
  onContentTypeChange
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
    <WithTooltip
      display={<div>{t(CONTENT_KEYS[contentType])}</div>}
      trigger={
        <TabsTrigger
          className="hover:opacity-50"
          value={contentType}
          onClick={() => onContentTypeChange(contentType as ContentType)}
        >
          {icon}
        </TabsTrigger>
      }
    />
  )
}
