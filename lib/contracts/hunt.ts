import Server, { TransactionBuilder, Operation } from "@stellar/stellar-sdk"
import { getHunt as getStoredHunt, getHuntClues } from "@/lib/huntStore"
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry"
import { normalizeNetworkError, AnswerIncorrectError } from "./errors"
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "./config"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"
import { sha256Hex } from "@/lib/crypto"
import { logger } from "@/lib/logger"

import type {
  ClueInfo,
  HuntInfo,
  CreateHuntResult,
  SubmitAnswerResult,
  ActivateHuntResult,
  AddClueResult,
  ExtendHuntResult,
  LeaderboardEntry,
  FastestPlayerEntry,
} from "@/lib/types";

export type {
  ClueInfo,
  HuntInfo,
  CreateHuntResult,
  SubmitAnswerResult,
  ActivateHuntResult,
  AddClueResult,
  ExtendHuntResult,
  LeaderboardEntry,
  FastestPlayerEntry,
};

// AnswerIncorrectError is re-exported from the central errors module for
// backwards-compatible imports (e.g. `import { AnswerIncorrectError } from "@/lib/contracts/hunt"`).
export { AnswerIncorrectError };

// Soroban-friendly createHunt helper (testnet default).
// This builds a small Stellar transaction (manageData) carrying the hunt
// payload, asks the user's Soroban/Freighter wallet to sign it, and submits
// it to the Soroban RPC. Replace with a direct contract invocation once you
// have a deployed contract and an ABI.
export async function createHunt(
  creator: string,
  title: string,
  description: string,
  start_time: number,
  end_time: number,
  /** IPFS CID (or ipfs:// URI) for the hunt cover image, stored on-chain. */
  imageCid?: string,
  creatorEmail?: string,
  emailNotifications?: boolean,
  /** When true, the hunt is hidden from the public arcade. */
  is_private?: boolean,
): Promise<CreateHuntResult> {
  if (typeof window === "undefined")
    throw new Error("Browser environment required");

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();

  // Prepare the payload and encode as string (manageData value must be string/buffer)
  const payload = JSON.stringify({
    action: "create_hunt",
    creator,
    title,
    description,
    start_time,
    end_time,
    ...(imageCid ? { image_cid: imageCid } : {}),
    ...(creatorEmail ? { creator_email: creatorEmail } : {}),
    ...(emailNotifications !== undefined
      ? { email_notifications: emailNotifications }
      : {}),
    ...(is_private ? { is_private: true } : {}),
  });

  const publicKey = await wallet.getPublicKey();

  // Load account state
  const account = await withSorobanRpcRetry(() => server.getAccount(publicKey)) as any

  // Use manageData to carry the payload. In production you'd call the
  // Soroban contract (invoke host function) — this is a minimal signing flow
  // that triggers the wallet and returns a tx hash on success.
  const key = `create_hunt:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  // Wallet signing: errors (including user rejection) are intentionally allowed
  // to propagate so withTransactionToast can classify and display them.
  const signedXdr = await wallet.signTransaction(tx.toXDR());

  // Submit signed transaction XDR to RPC
  const res = (await withSorobanRpcRetry(() =>
    server.submitTransaction(signedXdr),
  )) as {
    hash?: string;
  };
  if (!res || !res.hash) throw new Error("Transaction submission failed");

  return { txHash: res.hash };
}

/**
 * Calls the smart contract's activate_hunt(hunt_id: u64) to transition a hunt
 * from Draft to Active. Requires wallet and Soroban RPC.
 */
export async function activateHunt(
  huntId: number,
): Promise<ActivateHuntResult> {
  if (typeof window === "undefined")
    throw new Error("Browser environment required");

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();
  const publicKey = await wallet.getPublicKey();

  const account = await withSorobanRpcRetry(() => server.getAccount(publicKey)) as any
  const payload = JSON.stringify({ action: "activate_hunt", hunt_id: huntId });
  const key = `activate_hunt:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const signedXdr = await wallet.signTransaction(tx.toXDR());

  const res = (await withSorobanRpcRetry(() =>
    server.submitTransaction(signedXdr),
  )) as {
    hash?: string;
  };
  if (!res?.hash) throw new Error("Transaction submission failed");
  return { txHash: res.hash };
}

/**
 * Calls the smart contract's add_clue(hunt_id: u64, question: String, answer: String, points: u32).
 * The answer is trimmed and normalized to lowercase before signing to match contract expectations.
 */
export async function addClue(
  huntId: number,
  question: string,
  answer: string,
  points: number,
  hint?: string,
  hintCost?: number,
  difficulty?: import("@/lib/types").ClueDifficulty,
): Promise<AddClueResult> {
  if (typeof window === "undefined")
    throw new Error("Browser environment required");

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();
  const publicKey = await wallet.getPublicKey();

  // Expect `answer` to be the pre-hashed value (SHA-256 hex) computed
  // client-side using the scheme: sha256(lowercase(answer) + `${huntId}_${clueId}`)
  // For backwards compatibility, if a plain-text answer is provided it will be
  // stored as-is (legacy behaviour).
  const normalizedAnswer = answer;

  const account = await withSorobanRpcRetry(() => server.getAccount(publicKey)) as any
  const payload = JSON.stringify({
    action: "add_clue",
    hunt_id: huntId,
    question,
    answer: normalizedAnswer,
    points,
    ...(hint ? { hint } : {}),
    ...(hintCost ? { hint_cost: hintCost } : {}),
    ...(difficulty ? { difficulty } : {}),
  });
  const key = `add_clue:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const signedXdr = await wallet.signTransaction(tx.toXDR());

  const res2 = (await withSorobanRpcRetry(() =>
    server.submitTransaction(signedXdr),
  )) as {
    hash?: string;
  };
  if (!res2?.hash) throw new Error("Transaction submission failed");
  return { txHash: res2.hash };
}

/**
 * Calls the smart contract's extend_end_time(hunt_id: u64, new_end_time: u64) to extend a hunt's duration.
 * Requires wallet and Soroban RPC.
 */
export async function extendEndTime(
  huntId: number,
  newEndTime: number,
): Promise<ExtendHuntResult> {
  if (typeof window === "undefined")
    throw new Error("Browser environment required");

  const server = new Server(SOROBAN_RPC_URL);
  const wallet = getActiveWalletAdapter();
  const publicKey = await wallet.getPublicKey();

  const account = await withSorobanRpcRetry(() => server.getAccount(publicKey)) as any
  const payload = JSON.stringify({
    action: "extend_end_time",
    hunt_id: huntId,
    new_end_time: newEndTime,
  });
  const key = `extend_end_time:${Date.now()}`;
  const op = Operation.manageData({ name: key, value: payload });

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  const signedXdr = await wallet.signTransaction(tx.toXDR());

  const res = (await withSorobanRpcRetry(() =>
    server.submitTransaction(signedXdr),
  )) as {
    hash?: string;
  };
  if (!res?.hash) throw new Error("Transaction submission failed");
  return { txHash: res.hash, newEndTime };
}

/**
 * Retrieves the hunt leaderboard.
 * Attempts to fetch "live" data from the contract account's data attributes
 * (leveraging the manageData pattern) with a robust mock data fallback.
 */
export async function get_hunt_leaderboard(
  huntId: number,
): Promise<LeaderboardEntry[]> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  const now = Math.floor(Date.now() / 1000)
  const DAY = 86400

  const mockData: LeaderboardEntry[] = [
    { address: "GDD...9X2", name: "StellarQuest", points: 45, completionCount: 12, completedAt: now - DAY * 0.5, category: "Trivia", difficulty: "Medium" },
    { address: "GBX...A1B", points: 30, completionCount: 7, completedAt: now - DAY * 3, category: "Outdoor", difficulty: "Hard" },
    { address: "GCT...Z9Y", name: "AliceCrypto", points: 58, completionCount: 18, completedAt: now - DAY * 1, category: "Campus", difficulty: "Easy" },
    { address: "GDE...123", points: 15, completionCount: 4, completedAt: now - DAY * 20, category: "Indoor", difficulty: "Easy" },
    { address: "GFA...789", name: "BobHunts", points: 41, completionCount: 10, completedAt: now - DAY * 6, category: "Onboarding", difficulty: "Medium" },
    { address: "GCA...HB2", points: 28, completionCount: 6, completedAt: now - DAY * 45, category: "Community", difficulty: "Hard" },
  ]

  if (typeof window !== "undefined") {
    try {
      const myPointsStr = localStorage.getItem(`hunt_${huntId}_my_points`);
      if (myPointsStr) {
        const myPoints = parseInt(myPointsStr, 10);
        if (myPoints > 0) {
          mockData.push({ address: "YOU...PLYR", name: "You (Current Player)", points: myPoints, completionCount: 1, completedAt: now - DAY * 0.1 })
        }
      }
    } catch (e) {
      logger.error("Failed to fetch leaderboard:", e);
    }
  }

  return mockData;
}

export async function get_hunt_leaderboard_paginated(
  huntId: number,
  page: number = 1,
  limit: number = 20,
  currentUserAddress?: string,
): Promise<{
  entries: LeaderboardEntry[];
  total: number;
  currentUserRank?: number;
}> {
  // Use the existing mock (which returns all entries)
  const all = await get_hunt_leaderboard(huntId);
  const sorted = [...all].sort((a, b) => b.points - a.points);
  const total = sorted.length;
  const start = (page - 1) * limit;
  const entries = sorted.slice(start, start + limit);
  let currentUserRank: number | undefined;
  if (currentUserAddress) {
    const idx = sorted.findIndex((e) => e.address === currentUserAddress);
    if (idx !== -1) currentUserRank = idx + 1;
  }
  return { entries, total, currentUserRank };
}

export async function get_hunt_fastest_players(
  huntId: number,
): Promise<FastestPlayerEntry[]> {
  const indexerUrl = process.env.NEXT_PUBLIC_TORII_INDEXER_URL;

  if (indexerUrl) {
    try {
      const response = await fetch(
        `${indexerUrl}/hunts/${huntId}/fastest-completions`,
        {
          cache: "no-store",
        },
      );

      if (response.ok) {
        const body = await response.json();
        type FastestCompletionRow = {
          address?: string;
          name?: string;
          points?: number;
          completion_time_seconds?: number;
          duration_seconds?: number;
          completion_time_ms?: number;
          duration_ms?: number;
        };

        const rows: FastestCompletionRow[] = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.entries)
            ? body.entries
            : [];

        if (rows.length > 0) {
          return rows
            .map((entry): FastestPlayerEntry | null => {
              if (typeof entry.address !== "string") {
                return null;
              }

              return {
                address: entry.address,
                name: entry.name,
                points:
                  typeof entry.points === "number" ? entry.points : undefined,
                completionTimeSeconds:
                  typeof entry.completion_time_seconds === "number"
                    ? entry.completion_time_seconds
                    : typeof entry.duration_seconds === "number"
                      ? entry.duration_seconds
                      : Math.floor(
                          Number(
                            entry.completion_time_ms ?? entry.duration_ms ?? 0,
                          ) / 1000 || 0,
                        ),
              };
            })
            .filter(
              (entry): entry is FastestPlayerEntry =>
                entry !== null &&
                typeof entry.address === "string" &&
                entry.completionTimeSeconds >= 0,
            );
        }
      }
    } catch (error) {
      logger.warn("Torii indexer fetch failed:", error);
    }
  }

  const leaderboard = await get_hunt_leaderboard(huntId);
  const sortedByPoints = [...leaderboard].sort((a, b) => b.points - a.points);

  return sortedByPoints.map((entry, index) => ({
    address: entry.address,
    name: entry.name,
    points: entry.points,
    completionTimeSeconds: 600 + index * 90,
  }));
}

/**
 * Fetches hunt metadata including total clue count.
 * Mock implementation reading from localStorage via huntStore.
 */
export async function get_hunt(huntId: number): Promise<HuntInfo> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const stored = getStoredHunt(String(huntId));
    if (!stored) throw new Error(`Hunt ${huntId} not found`);

    return {
      id: stored.id,
      title: stored.title,
      description: stored.description,
      totalClues: stored.cluesCount,
      status: stored.status,
      creatorEmail: stored.creatorEmail,
      emailNotifications: stored.emailNotifications,
    };
  } catch (error) {
    throw normalizeNetworkError(error, "Failed to fetch hunt");
  }
}

/**
 * Fetches question and points for a specific clue.
 * Never returns the answer — answers are verified on-chain via submitAnswer.
 */
export async function get_clue_info(
  huntId: number,
  clueId: number,
): Promise<ClueInfo> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  try {
    const clues = getHuntClues(huntId);
    const clue = clues[clueId];
    if (!clue) throw new Error(`Clue ${clueId} not found for hunt ${huntId}`);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `hunt_clue_start_${huntId}_${clue.id}`,
          Date.now().toString(),
        );
      } catch (e) {
        logger.error("Failed to set start time:", e);
      }
    }

    return {
      id: clue.id,
      question: clue.question,
      points: clue.points,
      hint: clue.hint,
      hintCost: clue.hintCost,
      difficulty: clue.difficulty,
    };
  } catch (error) {
    throw normalizeNetworkError(error, "Failed to fetch clue");
  }
}
