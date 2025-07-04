"use client"

import Image from "next/image"
import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function HomePage() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Kein Render, bis das Theme geladen ist
    return null
  }

  const logoSrc = theme === "light"
    ? "/assets/logo/Icon light.svg"
    : "/assets/logo/Icon dark.svg"

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div
        className="opacity-80 select-none pointer-events-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <Image
          src={logoSrc}
          alt="YouRank Logo"
          width={150}
          height={150}
        />
      </div>

      <div className="mt-2 text-4xl font-bold">YouRank AI</div>

      <Link
        className="mt-4 flex w-[240px] items-center justify-center rounded-md bg-blue-500 p-2 font-semibold hover:bg-blue-600 transition"
        href="/login"
      >
        Sag Hallo zu YouRank AI
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
