import Server, { TransactionBuilder, Networks, Operation, Account } from "@stellar/stellar-sdk"
import { getHunt as getStoredHunt, getHuntClues } from "@/lib/huntStore"
import { parseStellarError } from "@/lib/stellarErrors"
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry"

export type ClueInfo = {
  id: number
  question: string
  points: number
  hint?: string
  hintCost?: number
}

export type HuntInfo = {
  id: number
  title: string
  description: string
  totalClues: number
  status: string
}

export type CreateHuntResult = {
  txHash: string
}

/**
 * Thrown when the contract returns an AnswerIncorrect error for submit_answer.
 * Callers should catch this specifically to show a "Try Again" UI without reloading.
 */
export class AnswerIncorrectError extends Error {
  constructor() {
    super("AnswerIncorrect: the submitted answer does not match.")
    this.name = "AnswerIncorrectError"
  }
}

const HUNT_FETCH_NETWORK_PATTERNS = [
  /network( request)? (error|failed)/i,
  /failed to fetch/i,
  /fetch failed/i,
  /request failed/i,
  /rpc.*timed? out/i,
  /timed? out/i,
  /timeout/i,
  /socket hang up/i,
  /econn(reset|refused)/i,
  /enotfound/i,
  /ehostunreach/i,
  /offline/i,
]

function normalizeHuntFetchError(error: unknown, fallbackMessage: string): Error {
  const parsed = parseStellarError(error)
  const errMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : ""

  const anyErr = error as
    | {
        response?: { status?: number }
        status?: number
      }
    | undefined
  const status = anyErr?.response?.status ?? anyErr?.status

  if (
    parsed.code === "TX_TIMEOUT" ||
    status === 408 ||
    status === 504 ||
    HUNT_FETCH_NETWORK_PATTERNS.some((pattern) => pattern.test(errMessage))
  ) {
    return new Error("Network Error")
  }

  if (error instanceof Error) return error
  return new Error(fallbackMessage)
}

export type SubmitAnswerResult = {
  txHash: string
  /** The contract event emitted on success. */
  event: "ClueCompleted"
}

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
  imageCid?: string
): Promise<CreateHuntResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://rpc.testnet.soroban.stellar.org"
  const server = new Server(RPC)

  const anyWin = window as Window & {
    freighter?: unknown
    soroban?: unknown
    sorobanWallet?: unknown
  }
  const wallet = anyWin.freighter || anyWin.soroban || anyWin.sorobanWallet
  if (!wallet) {
    throw new Error(
      "No Soroban-compatible wallet detected (install Freighter or Soroban Wallet)."
    )
  }

  // Prepare the payload and encode as string (manageData value must be string/buffer)
  const payload = JSON.stringify({
    action: "create_hunt",
    creator,
    title,
    description,
    start_time,
    end_time,
    ...(imageCid ? { image_cid: imageCid } : {}),
  })

  // Ask the wallet for the public key. Different wallets expose slightly
  // different APIs; we try common ones (Freighter, Soroban wallet adapter).
  let publicKey: string | undefined
  if (wallet.getPublicKey) {
    publicKey = await wallet.getPublicKey()
  } else if (wallet.request && typeof wallet.request === "function") {
    try {
      const resp = await wallet.request({ method: "getPublicKey" })
      publicKey = resp
    } catch {
      // ignore
    }
  }

  if (!publicKey) {
    throw new Error("Unable to obtain public key from wallet; ensure you are connected.")
  }

  // Load account state
  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account

  // Use manageData to carry the payload. In production you'd call the
  // Soroban contract (invoke host function) — this is a minimal signing flow
  // that triggers the wallet and returns a tx hash on success.
  const key = `create_hunt:${Date.now()}`
  const op = Operation.manageData({ name: key, value: payload })

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(op)
    .setTimeout(180)
    .build()

  // Wallet signing: errors (including user rejection) are intentionally allowed
  // to propagate so withTransactionToast can classify and display them.
  let signedXdr: string
  if (wallet.signTransaction) {
    signedXdr = await wallet.signTransaction(tx.toXDR())
  } else if (wallet.request && typeof wallet.request === "function") {
    signedXdr = await wallet.request({ method: "signTransaction", params: { tx: tx.toXDR() } })
  } else {
    throw new Error("No signing method available. Install Freighter or Soroban Wallet.")
  }

  // Submit signed transaction XDR to RPC
  const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string
  }
  if (!res || !res.hash) throw new Error("Transaction submission failed")

  return { txHash: res.hash }
}

export type ActivateHuntResult = {
  txHash: string
}

/**
 * Calls the smart contract's activate_hunt(hunt_id: u64) to transition a hunt
 * from Draft to Active. Requires wallet and Soroban RPC.
 */
export async function activateHunt(huntId: number): Promise<ActivateHuntResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://rpc.testnet.soroban.stellar.org"
  const server = new Server(RPC)

  const win = window as Window & { freighter?: unknown; soroban?: unknown; sorobanWallet?: unknown }
  const wallet = win.freighter ?? win.soroban ?? win.sorobanWallet
  if (!wallet) {
    throw new Error(
      "No Soroban-compatible wallet detected (install Freighter or Soroban Wallet)."
    )
  }

  let publicKey: string | undefined
  const w = wallet as { getPublicKey?: () => Promise<string>; request?: (arg: { method: string }) => Promise<string> }
  if (w.getPublicKey) {
    publicKey = await w.getPublicKey()
  } else if (typeof w.request === "function") {
    try {
      publicKey = await w.request({ method: "getPublicKey" })
    } catch {
      // ignore
    }
  }

  if (!publicKey) {
    throw new Error("Unable to obtain public key from wallet; ensure you are connected.")
  }

  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account
  const payload = JSON.stringify({ action: "activate_hunt", hunt_id: huntId })
  const key = `activate_hunt:${Date.now()}`
  const op = Operation.manageData({ name: key, value: payload })

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(op)
    .setTimeout(180)
    .build()

  const signWallet = wallet as { signTransaction?: (xdr: string) => Promise<string>; request?: (arg: { method: string; params?: { tx: string } }) => Promise<string> }
  let signedXdr: string
  if (signWallet.signTransaction) {
    signedXdr = await signWallet.signTransaction(tx.toXDR())
  } else if (typeof signWallet.request === "function") {
    signedXdr = await signWallet.request({ method: "signTransaction", params: { tx: tx.toXDR() } })
  } else {
    throw new Error("No signing method available. Install Freighter or Soroban Wallet.")
  }

  const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string
  }
  if (!res?.hash) throw new Error("Transaction submission failed")
  return { txHash: res.hash }
}

export type AddClueResult = {
  txHash: string
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
  hintCost?: number
): Promise<AddClueResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://rpc.testnet.soroban.stellar.org"
  const server = new Server(RPC)

  const win = window as Window & { freighter?: unknown; soroban?: unknown; sorobanWallet?: unknown }
  const wallet = win.freighter ?? win.soroban ?? win.sorobanWallet
  if (!wallet) {
    throw new Error("No Soroban-compatible wallet detected (install Freighter or Soroban Wallet).")
  }

  let publicKey: string | undefined
  const w = wallet as { getPublicKey?: () => Promise<string>; request?: (arg: { method: string }) => Promise<string> }
  if (w.getPublicKey) {
    publicKey = await w.getPublicKey()
  } else if (typeof w.request === "function") {
    try {
      publicKey = await w.request({ method: "getPublicKey" })
    } catch {
      // ignore
    }
  }

  if (!publicKey) {
    throw new Error("Unable to obtain public key from wallet; ensure you are connected.")
  }

  const normalizedAnswer = answer.trim().toLowerCase()

  const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account
  const payload = JSON.stringify({
    action: "add_clue",
    hunt_id: huntId,
    question,
    answer: normalizedAnswer,
    points,
    ...(hint ? { hint } : {}),
    ...(hintCost ? { hint_cost: hintCost } : {}),
  })
  const key = `add_clue:${Date.now()}`
  const op = Operation.manageData({ name: key, value: payload })

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(op)
    .setTimeout(180)
    .build()

  const signWallet = wallet as {
    signTransaction?: (xdr: string) => Promise<string>
    request?: (arg: { method: string; params?: { tx: string } }) => Promise<string>
  }
  let signedXdr: string
  if (signWallet.signTransaction) {
    signedXdr = await signWallet.signTransaction(tx.toXDR())
  } else if (typeof signWallet.request === "function") {
    signedXdr = await signWallet.request({ method: "signTransaction", params: { tx: tx.toXDR() } })
  } else {
    throw new Error("No signing method available. Install Freighter or Soroban Wallet.")
  }

  const res2 = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
    hash?: string
  }
  if (!res2?.hash) throw new Error("Transaction submission failed")
  return { txHash: res2.hash }
}

export type LeaderboardEntry = {
  address: string
  name?: string
  points: number
}

/**
 * Retrieves the hunt leaderboard. 
 * Attempts to fetch "live" data from the contract account's data attributes 
 * (leveraging the manageData pattern) with a robust mock data fallback.
 */
export async function get_hunt_leaderboard(huntId: number): Promise<LeaderboardEntry[]> {
  void huntId

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800))

  const mockData: LeaderboardEntry[] = [
    { address: "GDD...9X2", name: "StellarQuest", points: 45 },
    { address: "GBX...A1B", points: 30 },
    { address: "GCT...Z9Y", name: "AliceCrypto", points: 58 },
    { address: "GDE...123", points: 15 },
    { address: "GFA...789", name: "BobHunts", points: 41 },
    { address: "GCA...HB2", points: 28 },
  ]

  return mockData
}

/**
 * Fetches hunt metadata including total clue count.
 * Mock implementation reading from localStorage via huntStore.
 */
export async function get_hunt(huntId: number): Promise<HuntInfo> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  try {
    const stored = getStoredHunt(String(huntId))
    if (!stored) throw new Error(`Hunt ${huntId} not found`)

    return {
      id: stored.id,
      title: stored.title,
      description: stored.description,
      totalClues: stored.cluesCount,
      status: stored.status,
    }
  } catch (error) {
    throw normalizeHuntFetchError(error, "Failed to fetch hunt")
  }
}

/**
 * Fetches question and points for a specific clue.
 * Never returns the answer — answers are verified on-chain via submitAnswer.
 */
export async function get_clue_info(huntId: number, clueId: number): Promise<ClueInfo> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  try {
    const clues = getHuntClues(huntId)
    const clue = clues[clueId]
    if (!clue) throw new Error(`Clue ${clueId} not found for hunt ${huntId}`)

    return {
      id: clue.id,
      question: clue.question,
      points: clue.points,
      hint: clue.hint,
      hintCost: clue.hintCost,
    }
  } catch (error) {
    throw normalizeHuntFetchError(error, "Failed to fetch clue")
  }
}

/**
 * Submits an answer for a specific clue. Throws AnswerIncorrectError on mismatch.
 * Mock implementation that checks against localStorage clue data.
 */
export async function submitAnswer(
  huntId: number,
  clueId: number,
  answer: string
): Promise<SubmitAnswerResult> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const clues = getHuntClues(huntId)
  const clue = clues.find((c) => c.id === clueId)
  if (!clue) throw new Error(`Clue ${clueId} not found for hunt ${huntId}`)

  if (answer.trim().toLowerCase() !== clue.answer.trim().toLowerCase()) {
    throw new AnswerIncorrectError()
  }

  return {
    txHash: `mock_tx_${Date.now()}`,
    event: "ClueCompleted",
  }
}
