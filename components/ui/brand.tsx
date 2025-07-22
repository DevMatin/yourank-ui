"use client"

import Image from "next/image"
import { FC } from "react"

interface BrandProps {
  theme?: "dark" | "light"
}

export const Brand: FC<BrandProps> = ({ theme = "dark" }) => {
  const logoSrc =
    theme === "dark"
      ? "/assets/logo/logo-dark.svg"
      : "/assets/logo/logo-light.svg"

  return (
    <div className="flex flex-col items-center opacity-100">
      <div className="mb-2">
        <Image
          src={logoSrc}
          alt="Yourank Logo"
          width={500}
          height={0}
          style={{ height: "auto", width: "100%", maxWidth: "500px" }}
          draggable={false}
          onContextMenu={e => e.preventDefault()}
        />
      </div>
    </div>
  )
}
