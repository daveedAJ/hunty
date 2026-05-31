import type { Metadata } from "next"

import "./globals.css"
import { hankenGrotesk } from "@/lib/font"
import { TxToaster } from "@/components/TxToaster"
import Providers from "./providers"

export const metadata: Metadata = {
  title: "Hunty - Decentralized Scavenger Hunt Game",
  description: "Create thrilling scavenger hunts with multiple clues and challenges. Engage players in immersive treasure hunts and reward them with XLM tokens or exclusive NFTs on the Stellar blockchain.",
  keywords: ["scavenger hunt", "game", "blockchain", "Stellar", "XLM", "NFT", "Web3"],
  authors: [{ name: "Hunty Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://hunty.app",
    siteName: "Hunty",
    title: "Hunty - Decentralized Scavenger Hunt Game",
    description: "Create thrilling scavenger hunts with multiple clues and challenges. Engage players in immersive treasure hunts and reward them with XLM tokens or exclusive NFTs on the Stellar blockchain.",
    images: [
      {
        url: "https://hunty.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Hunty - Decentralized Scavenger Hunt Game",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hunty - Decentralized Scavenger Hunt Game",
    description: "Create thrilling scavenger hunts with multiple clues and challenges. Engage players in immersive treasure hunts and reward them with XLM tokens or exclusive NFTs on the Stellar blockchain.",
    images: ["https://hunty.app/og-image.png"],
    creator: "@huntyapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://hunty.app",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${hankenGrotesk.variable} antialiased`} suppressHydrationWarning>
        <Providers>
          <TxToaster />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}

