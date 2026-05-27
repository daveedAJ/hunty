"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { HuntDashboard } from "@/components/HuntDashboard"
import type { StoredHunt } from "@/lib/types"
import {
  getCreatorHunts,
  updateHuntStatus,
  saveClueLocally,
  takeHuntStoreSnapshot,
  restoreHuntStoreSnapshot,
} from "@/lib/huntStore"
import { activateHunt, addClue } from "@/lib/contracts/hunt"
import { withTransactionToast } from "@/lib/txToast"

export default function DashboardPage() {
  const [hunts, setHunts] = useState<StoredHunt[]>([])

  const refresh = useCallback(() => {
    setHunts(getCreatorHunts())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleActivate = useCallback(async (huntId: number) => {
    const snapshot = takeHuntStoreSnapshot()
    updateHuntStatus(huntId, "Active")
    refresh()

    try {
      await withTransactionToast(
        async (setStage) => {
          setStage("approving")
          return activateHunt(huntId)
        },
        {
          pending: "Pending — preparing transaction…",
          approving: "Approving — sign in your wallet…",
          confirmed: "Confirmed! Hunt is now visible in the Game Arcade.",
        }
      )
    } catch (error) {
      restoreHuntStoreSnapshot(snapshot)
      refresh()
      throw error
    }
  }, [refresh])

  const handleSaveClues = useCallback(
    async (huntId: number, clues: { question: string; answer: string; points: number }[]) => {
      const snapshot = takeHuntStoreSnapshot()
      const normalizedClues = clues.map((clue) => ({
        question: clue.question.trim(),
        answer: clue.answer.trim().toLowerCase(),
        points: clue.points,
      }))

      for (const clue of normalizedClues) {
        saveClueLocally({
          huntId,
          question: clue.question,
          answer: clue.answer,
          points: clue.points,
        })
      }
      refresh()

      try {
        for (const clue of normalizedClues) {
          await withTransactionToast(
            async (setStage) => {
              setStage("approving")
              return addClue(huntId, clue.question, clue.answer, clue.points)
            },
            {
              pending: `Pending — preparing clue "${clue.question.slice(0, 30)}…"`,
              approving: "Approving — sign in your wallet…",
              confirmed: "Clue confirmed!",
            }
          )
        }
      } catch (error) {
        restoreHuntStoreSnapshot(snapshot)
        refresh()
        throw error
      }
    },
    [refresh]
  )

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      <Header balance="24.2453" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Game Arcade
            </Link>
          </Button>
        </div>

        <h1 className="mb-2 text-3xl font-bold bg-linear-to-br from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
          My Hunts
        </h1>
        <p className="mb-8 text-slate-600">
          Activate a draft hunt so players can see it in the Game Arcade. Active hunts cannot be edited.
        </p>

        <HuntDashboard
          hunts={hunts}
          onActivate={handleActivate}
          onRefresh={refresh}
          onSaveClues={handleSaveClues}
        />
      </div>
    </div>
  )
}
