"use client"

import Link from "next/link"
import Image from "next/image"
import { FC } from "react"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  return (
    <Link
      className="flex cursor-pointer flex-col items-center hover:opacity-50"
      href="https://www.yourank.de"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="mb-2">
        {theme === "dark" ? (
          <Image
            src="/assets/logo/logo-dark.svg"
            alt="Yourank Logo"
            width={120}
            height={120}
          />
        ) : (
          <Image
            src="/assets/logo/logo-light.svg"
            alt="Yourank Logo"
            width={120}
            height={120}
          />
        )}
      </div>

      <div className="text-4xl font-bold tracking-wide">YouRank AI</div>
    </Link>
  )
}
