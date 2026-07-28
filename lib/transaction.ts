import { isValidStellarAddress } from "@/lib/nft/transfer"

export type TransactionType =
  | "transfer"
  | "mint"
  | "contract_call"
  | "claim_reward"
  | "custom"

export interface TransactionPayload {
  /** Unique ID for the transaction instance to prevent duplicate submissions */
  id: string
  /** Categorized transaction type for UI icons and headings */
  type: TransactionType
  /** Optional custom title for the preview modal */
  title?: string
  /** Optional description explaining the transaction purpose */
  description?: string
  /** Target public key or contract address */
  recipient: string
  /** Numeric or formatted amount (e.g. 10 or "10") */
  amount: string | number
  /** Symbol of the asset (e.g. "XLM", "HUNT", "NFT") */
  assetSymbol?: string
  /** Estimated network fee (defaults to "0.00001 XLM") */
  fee?: string
  /** Optional Stellar transaction memo */
  memo?: string
  /** Additional key-value metadata to render in the preview (e.g. Hunt ID, Token ID) */
  metadata?: Record<string, string | number | boolean>
  /** Unsigned transaction XDR string, if applicable */
  xdr?: string
  /** Network environment (defaults to "Stellar Testnet") */
  network?: string
  /** Callback function that executes or broadcasts the transaction */
  execute: (signedXdr?: string) => Promise<{ txHash: string }>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
  Formats a numeric or string amount with its asset symbol.
 */
export function formatAmount(amount: string | number, symbol = "XLM"): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount)
  if (isNaN(num)) return `0 ${symbol}`
  return `${num.toLocaleString("en-US", { maximumFractionDigits: 7 })} ${symbol}`
}

/**
 * Standardizes network fee formatting.
 */
export function formatNetworkFee(fee = "0.00001 XLM"): string {
  if (!fee) return "0.00001 XLM"
  if (fee.toLowerCase().includes("xlm")) return fee
  const num = parseFloat(fee)
  if (isNaN(num)) return "0.00001 XLM"
  return `${num.toFixed(5)} XLM`
}

/**
 * Calculates total cost combining principal amount and network fee (if assets match XLM).
 */
export function calculateTotalCost(amount: string | number, fee = "0.00001 XLM", symbol = "XLM"): string {
  const numAmount = typeof amount === "number" ? amount : parseFloat(amount)
  const feeClean = fee.replace(/[^0-9.]/g, "")
  const numFee = parseFloat(feeClean) || 0.00001

  if (isNaN(numAmount)) {
    return formatAmount(numFee, "XLM")
  }

  if (symbol.toUpperCase() === "XLM") {
    const total = numAmount + numFee
    return `${total.toLocaleString("en-US", { maximumFractionDigits: 7 })} XLM`
  }

  // Non-XLM asset (e.g., 1 NFT + 0.00001 XLM fee)
  return `${formatAmount(numAmount, symbol)} + ${formatNetworkFee(fee)}`
}

/**
 * Shortens a public key or address string.
 */
export function formatRecipientAddress(address: string, chars = 6): string {
  if (!address) return ""
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/**
 * Validates a transaction payload before initiating signing.
 */
export function validateTransactionPayload(payload: Partial<TransactionPayload>): ValidationResult {
  const errors: string[] = []

  if (!payload.recipient || typeof payload.recipient !== "string" || payload.recipient.trim() === "") {
    errors.push("Recipient address is required.")
  } else {
    // Check if valid Stellar address (56 char starting with G or C for contracts)
    const trimmed = payload.recipient.trim()
    const isStellarAddress = isValidStellarAddress(trimmed)
    const isContractAddress = /^C[A-Z0-9]{55}$/.test(trimmed)
    if (!isStellarAddress && !isContractAddress) {
      errors.push("Recipient must be a valid Stellar public key (G...) or contract address (C...).")
    }
  }

  if (payload.amount === undefined || payload.amount === null) {
    errors.push("Transaction amount is required.")
  } else {
    const num = typeof payload.amount === "number" ? payload.amount : parseFloat(payload.amount)
    if (isNaN(num) || num < 0) {
      errors.push("Transaction amount must be a non-negative number.")
    }
  }

  if (!payload.execute || typeof payload.execute !== "function") {
    errors.push("Transaction execution handler function is required.")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
