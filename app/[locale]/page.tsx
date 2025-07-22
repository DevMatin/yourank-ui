"use client"

import Image from "next/image"
import { IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div
        className="pointer-events-none select-none opacity-80"
        onContextMenu={e => e.preventDefault()}
      >
        <Image
          src="/assets/logo/Icon light.svg"
          alt="YouRank Logo"
          width={150}
          height={150}
        />
      </div>

      <div className="mt-2 text-4xl font-bold">YouRank AI</div>

      <Link
        className="bg-brandbutton mt-4 flex w-[240px] items-center justify-center rounded-md p-2 font-semibold text-black transition hover:opacity-80"
        href="/login"
      >
        Sag Hallo zu YouRank AI
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
