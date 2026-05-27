"use client"

import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"
import Trash from "@/components/icons/trash"
import Coin from "@/components/icons/Coin"
import { useState } from "react"
import { useXlmUsdPrice } from "@/hooks/useXlmUsdPrice"
import type { Reward, RewardPlayerProgress } from "@/lib/types"
import { claimReward } from "@/lib/contracts/rewardManager"

export type { Reward, RewardPlayerProgress as PlayerProgress }

export interface RewardsPanelProps {
  rewards: Reward[];
  onUpdateReward?: (place: number, amount: number) => void;
  onAddReward?: () => void;
  onDeleteReward?: (place: number) => void;
  error?: string;
  playerProgress?: RewardPlayerProgress;
  onClaimReward?: (hunt_id?: number | string) => Promise<void>;
}

export function RewardsPanel({ rewards, onUpdateReward, onAddReward, onDeleteReward, error, playerProgress, onClaimReward }: RewardsPanelProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(playerProgress?.reward_claimed || false);
  const { price: xlmUsdPrice } = useXlmUsdPrice()

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })

  const totalRewardXlm = rewards.reduce((sum, reward) => sum + reward.amount, 0)
  const totalRewardUsd =
    xlmUsdPrice != null ? currencyFormatter.format(totalRewardXlm * xlmUsdPrice) : null

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      if (onClaimReward) {
        await onClaimReward(playerProgress?.hunt_id);
      } else {
        if (playerProgress?.hunt_id == null) {
          throw new Error("Missing hunt_id for reward claim")
        }
        const parsed = Number(playerProgress.hunt_id)
        if (Number.isNaN(parsed)) {
          throw new Error("Invalid hunt_id for reward claim")
        }
        await claimReward(parsed)
      }
      setClaimed(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-6">
      {rewards.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
          <p className="text-sm font-medium text-blue-900">Total Prize Pool</p>
          <p className="text-lg font-semibold text-blue-950">
            {totalRewardXlm.toFixed(2)} XLM
            {totalRewardUsd ? ` (${totalRewardUsd})` : ""}
          </p>
        </div>
      )}

      {rewards.map((reward) => (
        <div key={reward.place} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-transparent dark:border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{reward.icon}</span>
            <span className="font-normal text-2xl bg-gradient-to-l from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">{reward.place == 1 && "1st"} {reward.place == 2 && "2nd"} {reward.place == 3 && "3rd"} {reward.place > 3 && `${reward.place}th`} Place</span>
          </div>
          <div className="flex items-center gap-2">
            {onUpdateReward && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onUpdateReward(reward.place, reward.amount - 0.1)}
                className="w-6 h-6 border-2 border-transparent bg-origin-border hover:opacity-80 rounded-lg"
                style={{
                  background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(to right, #0C0C4F, #4A4AFF) border-box'
                }}  
              >
                <Minus className="w-3 h-3" />
              </Button>
            )}
              <div className="flex items-center gap-8 bg-white dark:bg-slate-950 px-3 py-1 rounded border-b-2 border-transparent bg-gradient-to-r from-[#0C0C4F] to-[#4A4AFF] bg-[length:100%_2px] bg-no-repeat bg-bottom">
                <Coin/>
                <div className="flex flex-col">
                  <span className="text-[16px] font-medium bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
                    {reward.amount.toPrecision(3)} XLM
                  </span>
                  {xlmUsdPrice != null && (
                    <span className="text-[11px] text-slate-500">
                      {currencyFormatter.format(reward.amount * xlmUsdPrice)}
                    </span>
                  )}
                </div>
              </div>
            {onUpdateReward && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onUpdateReward(reward.place, reward.amount + 0.1)}
                className="w-6 h-6 border-2 border-transparent bg-origin-border hover:opacity-80 rounded-lg"
                style={{
                  background: 'linear-gradient(var(--background), var(--background)) padding-box, linear-gradient(to right, #0C0C4F, #4A4AFF) border-box'
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
            {onDeleteReward && (
              <Button 
                variant="ghost" 
                className="w-8 h-8 p-3 bg-gradient-to-b from-[#FD0A44] to-[#932331] text-white rounded-lg ml-2 cursor-pointer hover:opacity-80"
                onClick={() => onDeleteReward(reward.place)}
              >
                <Trash/>  
              </Button>
            )}
          </div>
        </div>
      ))}

      {onAddReward && (
        <div className="flex flex-col gap-2">
          <Button
              className="bg-white dark:bg-slate-900 text-[#808080] dark:text-slate-400 text-[16px] font-medium hover:bg-gray-100 dark:hover:bg-slate-800 px-6 py-2 rounded-full border-2 border-dashed border-[#808080] dark:border-slate-700 cursor-pointer"
              onClick={onAddReward}
                    >
              Add Reward for Runner-up
          </Button>
          {error && <span className="text-red-500 text-sm text-center">{error}</span>}
        </div>
      )}

      {playerProgress?.is_completed && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleClaim}
            disabled={claimed || isClaiming}
            className={`px-8 py-3 rounded-full text-white font-bold text-lg w-full max-w-sm ${
              claimed 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:opacity-90'
            }`}
          >
            {claimed ? "Claimed" : isClaiming ? "Claiming..." : "Claim Prize"}
          </Button>
        </div>
      )}
    </div>
  )
}
