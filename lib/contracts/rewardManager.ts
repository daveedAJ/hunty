import Server, { Operation, TransactionBuilder } from "@stellar/stellar-sdk"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"
import {
  SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE,
  getRequiredRewardManagerAddress,
} from "./config"

export type ClaimRewardResult = {
  txHash: string
}

const CLAIM_TIMEOUT_MS = 120_000
const MAX_RETRIES = 2

export class ClaimTimeoutError extends Error {
  constructor() {
    super("Reward claim timed out. Please try again.")
    this.name = "ClaimTimeoutError"
  }
}

export class ClaimRejectedError extends Error {
  constructor() {
    super("Transaction was rejected in your wallet.")
    this.name = "ClaimRejectedError"
  }
}

async function claimRewardInternal(huntId: number, signal?: AbortSignal): Promise<ClaimRewardResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const rewardManagerAddress = getRequiredRewardManagerAddress()
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()

  const server = new Server(SOROBAN_RPC_URL)
  const account = await server.getAccount(publicKey)

  const payload = JSON.stringify({
    action: "claim_reward",
    hunt_id: huntId,
    reward_manager: rewardManagerAddress,
  })

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: `claim_reward:${huntId}:${Date.now()}`,
        value: payload,
      }),
    )
    .setTimeout(180)
    .build()

  const signedXdr = await wallet.signTransaction(tx.toXDR())

  if (signal?.aborted) throw new ClaimTimeoutError()

  const submitPromise = server.submitTransaction(signedXdr)
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new ClaimTimeoutError()), CLAIM_TIMEOUT_MS)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new ClaimTimeoutError())
    })
  })

  const result = await Promise.race([submitPromise, timeout])
  if (!result?.hash) throw new Error("Reward claim transaction failed")

  if (typeof window !== "undefined") {
    localStorage.setItem(`hunt_reward_claimed_${huntId}`, "true")
  }

  return { txHash: result.hash }
}

export async function claimReward(huntId: number, options?: { signal?: AbortSignal, onStage?: (stage: string) => void }): Promise<ClaimRewardResult> {
  const { signal, onStage } = options ?? {}

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        onStage?.("retrying")
      }
      return await claimRewardInternal(huntId, signal)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (signal?.aborted) throw lastError

      const isRejection =
        String(lastError.message).toLowerCase().includes("reject") ||
        String(lastError.message).toLowerCase().includes("cancel") ||
        String(lastError.message).toLowerCase().includes("denied")

      if (isRejection) {
        throw new ClaimRejectedError()
      }

      const isTimeout = lastError instanceof ClaimTimeoutError

      if (isTimeout && attempt < MAX_RETRIES) {
        continue
      }

      throw lastError
    }
  }

  throw lastError ?? new Error("Reward claim failed")
}
