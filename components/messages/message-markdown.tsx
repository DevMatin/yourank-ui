import React, { FC } from "react"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { MessageCodeBlock } from "./message-codeblock"
import { MessageMarkdownMemoized } from "./message-markdown-memoized"

interface MessageMarkdownProps {
  content: string
}

function isImageRow(children: React.ReactNode[]) {
  return (
    Array.isArray(children) &&
    children.length > 1 &&
    children.every(child => React.isValidElement(child) && child.type === "img")
  )
}

// Helper: detect if a paragraph is just a row of videos
function isVideoRow(children: React.ReactNode[]) {
  return (
    Array.isArray(children) &&
    children.length > 0 &&
    children.every(
      child =>
        React.isValidElement(child) &&
        child.type === "a" &&
        child.props.href &&
        (child.props.href.includes("youtube.com") ||
          child.props.href.includes("youtu.be") ||
          child.props.href.includes("vimeo.com"))
    )
  )
}

export const MessageMarkdown: FC<MessageMarkdownProps> = ({ content }) => {
  return (
    <MessageMarkdownMemoized
      className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 min-w-full space-y-6 break-words"
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        p({ children }) {
          // If this paragraph is a row of images, wrap in a horizontal scroll div
          if (isImageRow(children as React.ReactNode[])) {
            return (
              <div className="flex gap-3 overflow-x-auto py-2">{children}</div>
            )
          }
          // If this paragraph is a row of videos, render as rich video cards
          if (isVideoRow(children as React.ReactNode[])) {
            return (
              <div className="flex flex-col gap-3 py-2">
                {(children as React.ReactNode[]).map((child, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                  >
                    <span className="text-lg">🎬</span>
                    {child}
                  </div>
                ))}
              </div>
            )
          }
          return <p className="mb-2 last:mb-0">{children}</p>
        },
        img({ node, ...props }) {
          return (
            <img
              className="max-w-[300px] rounded-lg border border-gray-200 shadow-md dark:border-gray-700"
              style={{ maxHeight: 220, objectFit: "cover" }}
              loading="lazy"
              {...props}
            />
          )
        },
        details({ children, ...props }) {
          // Sources footer: sticky at the bottom if possible
          return (
            <details className="sticky bottom-0 z-10 mt-4 rounded border border-gray-300 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              {children}
            </details>
          )
        },
        summary({ children, ...props }) {
          return (
            <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-200">
              {children}
            </summary>
          )
        },
        code({ node, className, children, ...props }) {
          const childArray = React.Children.toArray(children)
          const firstChild = childArray[0] as React.ReactElement
          const firstChildAsString = React.isValidElement(firstChild)
            ? (firstChild as React.ReactElement).props.children
            : firstChild

          if (firstChildAsString === "▍") {
            return <span className="mt-1 animate-pulse cursor-default">▍</span>
          }

          if (typeof firstChildAsString === "string") {
            childArray[0] = firstChildAsString.replace("`▍`", "▍")
          }

          const match = /language-(\w+)/.exec(className || "")

          if (
            typeof firstChildAsString === "string" &&
            !firstChildAsString.includes("\n")
          ) {
            return (
              <code className={className} {...props}>
                {childArray}
              </code>
            )
          }

          return (
            <MessageCodeBlock
              key={Math.random()}
              language={(match && match[1]) || ""}
              value={String(childArray).replace(/\n$/, "")}
              {...props}
            />
          )
        }
      }}
    >
      {content}
    </MessageMarkdownMemoized>
  )
}
