"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, ArrowRight, Trophy } from "lucide-react"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Header } from "@/components/Header"
import { getAllHunts, type StoredHunt } from "@/lib/huntStore"
import { LeaderboardTable } from "@/components/LeaderBoardTable"
import { hankenGrotesk } from "@/lib/font"
import OnboardingTour from "@/components/OnboardingTour"

interface WalletOption {
  id: string
  name: string
  icon: string
  description?: string
}

const walletOptions: WalletOption[] = []

const INACTIVE_PAGE_SIZE = 6

function sortByRecentFirst(a: StoredHunt, b: StoredHunt): number {
  const aSortTime = a.endTime ?? a.startTime ?? 0
  const bSortTime = b.endTime ?? b.startTime ?? 0
  return bSortTime - aSortTime
}

function fetchActiveHunts() {
  return getAllHunts().filter((hunt) => hunt.status === "Active").sort(sortByRecentFirst)
}

function fetchInactiveHunts() {
  return getAllHunts().filter((hunt) => hunt.status !== "Active").sort(sortByRecentFirst)
}

export default function GameArcade() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [gameLink, setGameLink] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [balance, setBalance] = useState("")

  const [activeHunts, setActiveHunts] = useState<StoredHunt[]>([])
  const [inactiveHunts, setInactiveHunts] = useState<StoredHunt[]>([])
  const [isLoadingHunts, setIsLoadingHunts] = useState(true)
  const [visibleInactiveCount, setVisibleInactiveCount] = useState(INACTIVE_PAGE_SIZE)
  const [isLoadingMoreInactive, setIsLoadingMoreInactive] = useState(false)
  const [activeTab, setActiveTab] = useState<"leaderboard" | "none">("none")
  const inactiveEndReachedRef = useRef<HTMLDivElement | null>(null)

  const visibleInactiveHunts = useMemo(
    () => inactiveHunts.slice(0, visibleInactiveCount),
    [inactiveHunts, visibleInactiveCount]
  )
  const hasMoreInactiveHunts = visibleInactiveCount < inactiveHunts.length

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("tab") === "leaderboard") {
        setActiveTab("leaderboard")
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    try {
      const active = fetchActiveHunts()
      const inactive = fetchInactiveHunts()
      if (!cancelled) {
        setActiveHunts(active)
        setInactiveHunts(inactive)
        setVisibleInactiveCount(INACTIVE_PAGE_SIZE)
      }
    } catch (error) {
      console.error("Failed to fetch hunts", error)
    } finally {
      if (!cancelled) setIsLoadingHunts(false)
    }

    return () => {
      cancelled = true
    }
  }, [])

  const loadMoreInactiveHunts = useCallback(() => {
    if (!hasMoreInactiveHunts || isLoadingMoreInactive) return
    setIsLoadingMoreInactive(true)
    setTimeout(() => {
      setVisibleInactiveCount((prev) => Math.min(prev + INACTIVE_PAGE_SIZE, inactiveHunts.length))
      setIsLoadingMoreInactive(false)
    }, 250)
  }, [hasMoreInactiveHunts, inactiveHunts.length, isLoadingMoreInactive])

  useEffect(() => {
    const target = inactiveEndReachedRef.current
    if (!target || !hasMoreInactiveHunts) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreInactiveHunts()
        }
      },
      { rootMargin: "160px 0px 160px 0px" }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreInactiveHunts, loadMoreInactiveHunts, visibleInactiveHunts.length])

  const handleWalletSelect = (wallet: WalletOption) => {
    setSelectedWallet(wallet)
    setIsConnectingWallet(true)
    // Simulate wallet address generation
    setWalletAddress("0xe5f...E5")
  }

  const handleContinue = () => {
    setIsConnected(true)
    setBalance("24.2453")
    setIsWalletModalOpen(false)
    setIsConnectingWallet(false)
    setSelectedWallet(null)
    setDisplayName("")
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setWalletAddress("")
    setBalance("")
  }

  const handleCreateGame = () => {
    window.location.href = "/hunty"
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] pb-[75px]`}
    >
      <OnboardingTour />
      {/* Header */}
      <Header
        balance={balance}
      />

      {/* Main Content */}
      <div className="max-w-[1600px] px-14 pt-10 pb-12 bg-white mx-auto rounded-4xl relative">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2">
            {/* logo */}
            <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
          </div>
          <h1 className={`text-4xl md:text-5xl bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent font-bold mb-12 ${hankenGrotesk.variable} antialiased bg-gradient-to-br from-#3737A4 to-#0C0C4F mt-12`}>The Ultimate Web3 Game Arcade</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button className="bg-[#0C0C4F] hover:bg-slate-700 text-white px-6 py-3 rounded-lg text-xl font-black" onClick={handleCreateGame}>
            Create Game
          </Button>
          <Button asChild variant="outline" className="border-2 border-[#0C0C4F] text-[#0C0C4F] hover:bg-[#0C0C4F]/10 px-6 py-3 rounded-lg text-xl font-black">
            <Link href="/dashboard">My Hunts</Link>
          </Button>
          <Button
            className={`px-6 py-3 rounded-lg text-xl font-black ${activeTab === "leaderboard"
              ? "bg-[#3737A4] text-white"
              : "bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white hover:opacity-90"
              }`}
            onClick={() => setActiveTab(activeTab === "leaderboard" ? "none" : "leaderboard")}
          >
            Leaderboard
          </Button>
          <Button id="play-button" className="bg-[#E87785] hover:bg-[#d4606f] text-white px-6 py-3 rounded-lg text-xl font-black">Play Game</Button>
        </div>

        {/* Leaderboard Section */}
        {activeTab === "leaderboard" && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="max-w-4xl mx-auto bg-[#f9f9ff] rounded-3xl p-8 border border-slate-100 shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
                  Global Leaderboard
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("none")}
                  className="text-slate-500 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <LeaderboardTable huntId={1} />
            </div>
          </div>
        )}

        {/* Game Link Input */}
        <div className="text-center mb-12">
          <p className="text-slate-700 mb-4 font-medium">Enter Game Link</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input
              type="url"
              placeholder="https://www.galagorch.com/g/***"
              value={gameLink}
              onChange={(e) => setGameLink(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-pink-400"
            />
            <Button className="bg-[#E87785] hover:bg-[#d4606f] text-white px-6 py-3 rounded-lg text-xl font-black">Play Game</Button>
          </div>
        </div>

        {/* Game Cards */}
        <div className={`flex flex-col sm:flex-row md:justify-between  bg-[#ececfa] backdrop-blur-md rounded-2xl border border-white/20 pl-6 pt-6 pb-16`}
          style={{
            boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
          <div>
            <div className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] bg-clip-text text-transparent font-normal text-4xl text-center mb-4 md:mb-0 md:text-start">How To Play Hunty</div>
          </div>

          {/* Hunty Game */}
          <div>
            <div className={` flex-1 md:flex gap-2 bg-transparent`}>
              <Card className="flex-1 text-white justify-center max-w-56">
                <div className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] flex-1 rounded-t-lg p-3">
                  <CardTitle className="text-[13px] font-bold">What is the fastest bird?</CardTitle>
                  <CardDescription className="text-[8px] mt-2 text-white">The Description appears here...Yorem ipsum dolor sit amet, consectetur adipiscing elit.</CardDescription>
                  <div className="mt-2">
                    <Image src="/static-images/image1.png" alt="bird" width={132} height={132} />
                  </div>
                  <div className="mt-2">
                    <Button className="bg-gradient-to-b from-[#2F2FFF]  to-[#E87785] sh-6 text-[7.76px] p-[3px]"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg><span>Hint To Unlock</span></Button>
                  </div>
                </div>
                <div className="flex gap-1 bg-white items-center align-center p-3 rounded-b-lg
                  ">
                  <Input placeholder="Enter code to unlock" className="px-3.5 py-1 text-[8px] rounded-full" />
                  <div className="bg-gradient-to-b from-[#3737A4]  to-[#0C0C4F] rounded-lg flex items-center justify-center p-2"><ArrowRight className="w-4 h-4" /></div>
                </div>
              </Card>

              <div className="bg-white/40 backdrop-blur-lg"></div>
              <Card className="mr-[-80px] [clip-path:polygon(0_0,68%_0,68%_100%,0_100%)] hidden md:block">
                <div className="bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-white p-3 rounded-t-lg">
                  <CardTitle className="text-[13px] font-bold">What is the biggest bird?</CardTitle>
                  <CardDescription className="text-[8px] mt-2 text-white">long legs, tiny brain </CardDescription>
                  <div className="mt-2">
                    <Button className="bg-gradient-to-b from-[#2F2FFF]  to-[#E87785] text-[8px]"> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link-icon lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg> <span className="text-[8px]">Hint To Unlock</span></Button>
                  </div>

                </div>

                <div className="flex gap-1 bg-white items-center align-center p-3 rounded-b-lg
                  ">
                  <Input placeholder="Enter code to unlock" className="h-[19px] text-[8px]" />
                  <div className="bg-gradient-to-b from-[#3737A4]  to-[#0C0C4F] rounded-md flex items-center justify-center p-0.5"><ArrowRight color="white" className="w-4 h-4" /></div>
                </div>
              </Card>

            </div>

          </div>

        </div>

        {/* Active Hunts Grid */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-semibold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
              Browse Active Hunts
            </h2>
            <p className="text-sm text-slate-600">
              {isLoadingHunts ? "Loading hunts..." : `${activeHunts.length} active ${activeHunts.length === 1 ? "hunt" : "hunts"} found`}
            </p>
          </div>

          {isLoadingHunts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card
                  key={idx}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6 mb-4" />
                    <div className="flex items-center justify-between mt-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : activeHunts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-slate-600">
              No active hunts available right now.{" "}
              <span className="font-semibold text-[#3737A4]">Be the first to create one!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeHunts.map((hunt) => (
                <Card
                  key={hunt.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
                      {hunt.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600 mb-4 line-clamp-3">
                      {hunt.description}
                    </CardDescription>
                    <div className="flex items-center justify-between mt-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-[#3737A4]">
                        {hunt.cluesCount} {hunt.cluesCount === 1 ? "Clue" : "Clues"}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#3737A4] hover:bg-slate-100 flex items-center gap-1.5 h-8 text-[11px] font-semibold"
                          onClick={() => {
                            // Link to the leaderboard tab in the arcade/hunty page
                            window.location.href = `/hunty?huntId=${hunt.id}&tab=leaderboard`
                          }}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          Leaderboard
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Extended Hunt Feed (FlatList-like onEndReached pagination) */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-semibold bg-gradient-to-b from-[#6B7280] to-[#1F2937] bg-clip-text text-transparent">
              Older / Inactive Hunts
            </h2>
            <p className="text-sm text-slate-600">
              {isLoadingHunts
                ? "Loading archive..."
                : `${visibleInactiveHunts.length} of ${inactiveHunts.length} loaded`}
            </p>
          </div>

          {isLoadingHunts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, idx) => (
                <Card
                  key={`inactive-loading-${idx}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6 mb-4" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : inactiveHunts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-slate-600">
              No inactive hunts yet.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleInactiveHunts.map((hunt) => (
                  <Card
                    key={`inactive-${hunt.id}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm"
                  >
                    <div className="p-5">
                      <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">
                        {hunt.title}
                      </CardTitle>
                      <CardDescription className="text-sm text-slate-600 mb-4 line-clamp-3">
                        {hunt.description}
                      </CardDescription>
                      <div className="flex items-center justify-between mt-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700">
                          {hunt.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {hunt.cluesCount} {hunt.cluesCount === 1 ? "clue" : "clues"}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div ref={inactiveEndReachedRef} className="h-1 w-full" />

              {isLoadingMoreInactive && (
                <p className="text-center text-sm text-slate-500 mt-4">Loading more hunts...</p>
              )}

              {!hasMoreInactiveHunts && visibleInactiveHunts.length > 0 && (
                <p className="text-center text-sm text-slate-500 mt-4">
                  You&apos;ve reached the end of the hunt archive.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Wallet Connection Modal */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent font-semibold text-2xl">Connect a wallet</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsWalletModalOpen(false)}
              className="p-[6px] rounded-xl bg-gradient-to-b from-[#FD0A44] to-[#932331] text-white"
            >
              <X className="h-6 w-6 stroke-3" />
            </Button>
          </DialogHeader>

          {!isConnectingWallet ? (
            <div className="space-y-3">
              {walletOptions.length > 0 ? (
                walletOptions.map((wallet) => (
                  <Button
                    key={wallet.id}
                    onClick={() => handleWalletSelect(wallet)}
                    className="w-full bg-[#0C0C4F] hover:bg-slate-700 text-white p-4 rounded-lg flex items-center gap-3 justify-start px-6 py-6"
                  >
                    <span className="text-xl">{wallet.icon}</span>
                    <div className="text-left">
                      <div className="flex">
                        <div className="font-medium">{wallet.name}</div>
                        {wallet.description && <div className="text-sm opacity-80">{wallet.description}</div>}
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <p>No wallet options available.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Wallet Address</label>
                <div className="bg-[#e4e4e4] p-3 rounded-lg text-sm text-slate-600">{walletAddress}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Set a Display Name (optional)</label>
                <Input
                  placeholder="DisplayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button
                onClick={handleContinue}
                className=" bg-[#0C0C4F] hover:bg-[#23234491] text-white text-xl rounded-xl font-black flex items-center gap-2 px-6 py-3 float-right"
              >
                Continue
                <ArrowRight className="w-6 h-6 stroke-3" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}




{/* <Card>
<div className={`p-8 flex-1 bg-[#ececfa] backdrop-blur-md rounded-2xl border border-white/20" style={{boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`}>
<div className="grid grid-cols-5 gap-1.5 max-w-80 mx-auto">
         
          Row

        <div className="col-start-2">
          <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
            <span className="text-white font-bold text-lg">W</span>
          </div>
        </div>
        <div className="col-start-4 col-span-2 grid grid-cols-2 gap-2">
          <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
        </div>

         Row 2 

        <div className="w-12 h-12 bg-gradient-to-b from-[#4F0C14] to-[#A43751] rounded-lg flex items-center justify-center border-6 border-[#E87785]">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div className="col-start-4 col-span-2 grid grid-cols-2 gap-2">
          <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
        </div>

         Row 3 - GREAT 

        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">R</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <div className="w-12 h-12 bg-gradient-to-b from-[#0C0C4F] to-[#474785] rounded-lg flex items-center justify-center border-6 border-[#474785]">
          <span className="text-white font-bold text-lg">T</span>
        </div>

         Row 4
        
         <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
        <div className="col-start-4">
          <div className="w-12 h-12 bg-gradient-to-b from-[#576065] to-[#787884] rounded-lg border-6 border-[#666672]"></div>
        </div>
      </div>    
        </div>

        <Link className="bg-[#2D2D97]  py-6 rounded-br-lg rounded-bl-lg text-white text-2xl font-bold text-center tracking-wider" href="/">
          CROSSBITES
        </Link>
        </Card>   
   */}
