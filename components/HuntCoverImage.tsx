"use client"

import { useState } from "react"
import Image from "next/image"
import { GATEWAY_COUNT, resolveImageSrc } from "@/lib/ipfs"

interface HuntCoverImageProps {
  src?: string
  alt: string
  className?: string
}

export function HuntCoverImage({ src, alt, className }: HuntCoverImageProps) {
  const [gatewayIdx, setGatewayIdx] = useState(0)

  // `fill` requires the container to be positioned. We always inject
  // `relative` so callers don't have to remember to add it themselves,
  // preventing layout shift when the image loads.
  const containerClass = `relative ${className ?? ""}`.trim()

  if (!src) {
    return (
      <div className={containerClass}>
        <Image
          src="/static-images/image1.png"
          alt={alt}
          fill
          loading="lazy"
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <Image
        src={resolveImageSrc(src, gatewayIdx)}
        alt={alt}
        fill
        loading="lazy"
        className="object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        onError={() => {
          if (gatewayIdx < GATEWAY_COUNT - 1) {
            setGatewayIdx((idx) => idx + 1)
          }
        }}
        unoptimized
      />
    </div>
  )
}
