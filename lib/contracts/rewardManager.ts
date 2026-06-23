import Server, { Operation, TransactionBuilder } from "@stellar/stellar-sdk"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"
import {
  SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE,
  getRequiredRewardManagerAddress,
} from "./config"
import { buildNftMetadata } from "@/lib/nft/metadataBuilder"
import { uploadNftMetadata } from "@/lib/nft/metadataUploader"
import { MetadataValidationError, IpfsUploadError } from "@/lib/nft/errors"
import { logger } from "@/lib/logger"
import type { NftMetadataBuildInput } from "@/lib/nft/types"

export type ClaimRewardResult = {
  txHash: string
  /** ipfs:// URI for the SEP-0039 compliant metadata JSON uploaded before minting. */
  metadataUri: string
}

export interface ClaimRewardOptions {
  /** Player's leaderboard rank (1 = first place). Defaults to 1. */
  rank?: number
  /** Hunt difficulty setting. Defaults to "Unrated". */
  difficulty?: NftMetadataBuildInput["difficulty"]
  /** Player's total completion time in whole seconds. */
  completionTimeSeconds?: number
  /** Human-readable hunt name for the metadata attributes. */
  huntName?: string
  /** Bare CID or ipfs:// URI for the NFT artwork image. */
  imageCid?: string
  /** ISO-8601 timestamp when the reward was earned. Defaults to now. */
  earnedAt?: string
}

export async function claimReward(
  huntId: number,
  options: ClaimRewardOptions = {}
): Promise<ClaimRewardResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const rewardManagerAddress = getRequiredRewardManagerAddress()
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()

  const {
    rank = 1,
    difficulty = "Unrated",
    completionTimeSeconds,
    huntName,
    imageCid = "",
    earnedAt = new Date().toISOString(),
  } = options

  // ── 1. Build SEP-0039 metadata ─────────────────────────────────────────────
  const metadata = buildNftMetadata({
    name: huntName
      ? `Hunty Trophy — ${huntName} · ${ordinal(rank)} Place`
      : `Hunty Trophy — Hunt #${huntId} · ${ordinal(rank)} Place`,
    description: huntName
      ? `Awarded for completing "${huntName}" on the Hunty Scavenger Hunt platform.`
      : `Awarded for completing Hunt #${huntId} on the Hunty Scavenger Hunt platform.`,
    imageCid,
    difficulty,
    completionTimeSeconds,
    rank,
    huntName,
    earnedAt,
  })

  // ── 2. Upload metadata to IPFS ─────────────────────────────────────────────
  let metadataUri: string
  try {
    const uploadResult = await uploadNftMetadata(metadata, publicKey)
    metadataUri = uploadResult.metadataUri
  } catch (err) {
    if (err instanceof MetadataValidationError || err instanceof IpfsUploadError) {
      logger.error("NFT metadata upload failed during reward claim:", err)
      throw err
    }
    throw err
  }

  // ── 3. Build and submit the claim transaction ──────────────────────────────
  const server = new Server(SOROBAN_RPC_URL)
  const account = await server.getAccount(publicKey)

  const payload = JSON.stringify({
    action: "claim_reward",
    hunt_id: huntId,
    reward_manager: rewardManagerAddress,
    metadata_uri: metadataUri,
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
  const result = await server.submitTransaction(signedXdr)
  if (!result?.hash) throw new Error("Reward claim transaction failed")

  if (typeof window !== "undefined") {
    localStorage.setItem(`hunt_reward_claimed_${huntId}`, "true")
    localStorage.setItem(`hunt_reward_metadata_uri_${huntId}`, metadataUri)
  }

  return { txHash: result.hash, metadataUri }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  if (n === 1) return "1st"
  if (n === 2) return "2nd"
  if (n === 3) return "3rd"
  return `${n}th`
}
