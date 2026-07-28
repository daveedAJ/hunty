"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { announceSr } from "@/components/SrAnnouncer"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"
import { parseStellarError, type StellarError } from "@/lib/stellarErrors"
import {
  validateTransactionPayload,
  type TransactionPayload,
} from "@/lib/transaction"

export type TransactionSigningStatus =
  | "idle"
  | "preview"
  | "signing"
  | "submitting"
  | "confirmed"
  | "failed"
  | "cancelled"

export interface UseTransactionSigningReturn {
  /** Current transaction lifecycle status */
  status: TransactionSigningStatus
  /** Active transaction payload being previewed or processed */
  transaction: TransactionPayload | null
  /** Structured Stellar error if transaction failed */
  error: StellarError | null
  /** Validation errors if payload validation failed */
  validationErrors: string[]
  /** On-chain transaction hash on success */
  txHash: string | null
  /** True while waiting for wallet signature or network submission */
  isSubmitting: boolean
  /** Initiates transaction flow and displays preview modal */
  initiateTransaction: (
    payload: Omit<TransactionPayload, "id"> & { id?: string }
  ) => boolean
  /** Explicit user action to confirm and sign transaction */
  confirmAndSign: () => Promise<{ success: boolean; txHash?: string; error?: string }>
  /** Re-attempts a failed transaction without duplicating payload */
  retry: () => Promise<{ success: boolean; txHash?: string; error?: string }>
  /** Cancels the transaction flow and closes preview */
  cancel: () => void
  /** Resets hook state back to idle */
  reset: () => void
}

export function useTransactionSigning(): UseTransactionSigningReturn {
  const [status, setStatus] = useState<TransactionSigningStatus>("idle")
  const [transaction, setTransaction] = useState<TransactionPayload | null>(null)
  const [error, setError] = useState<StellarError | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inFlightId, setInFlightId] = useState<string | null>(null)

  /**
   * Validates and prepares a transaction payload for user preview.
   */
  const initiateTransaction = useCallback(
    (payloadInput: Omit<TransactionPayload, "id"> & { id?: string }): boolean => {
      const fullPayload: TransactionPayload = {
        ...payloadInput,
        id:
          payloadInput.id ||
          `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      }

      const validation = validateTransactionPayload(fullPayload)
      if (!validation.valid) {
        setValidationErrors(validation.errors)
        setError({
          code: "UNKNOWN",
          message: validation.errors.join(" "),
          raw: validation.errors,
        })
        setStatus("failed")
        announceSr("Transaction validation failed")
        toast.error("Invalid transaction details. Please check your inputs.")
        return false
      }

      setTransaction(fullPayload)
      setValidationErrors([])
      setError(null)
      setTxHash(null)
      setStatus("preview")
      return true
    },
    []
  )

  /**
   * Confirms and signs the active transaction payload.
   */
  const confirmAndSign = useCallback(async (): Promise<{
    success: boolean
    txHash?: string
    error?: string
  }> => {
    if (!transaction) {
      const msg = "No transaction payload available to sign."
      toast.error(msg)
      return { success: false, error: msg }
    }

    // Prevent duplicate submissions while in-flight
    if (isSubmitting || inFlightId === transaction.id) {
      return { success: false, error: "Transaction submission already in progress." }
    }

    setInFlightId(transaction.id)
    setIsSubmitting(true)
    setStatus("signing")

    const toastId = toast.loading("Approving — sign in your wallet…")
    announceSr("Approving — sign in your wallet…")

    let signedXdr: string | undefined

    try {
      // Step 1: Request wallet signature if XDR is provided
      if (transaction.xdr) {
        const adapter = getActiveWalletAdapter()
        signedXdr = await adapter.signTransaction(transaction.xdr)
      }

      // Step 2: Update status to submitting and broadcast/execute transaction
      setStatus("submitting")
      toast.loading("Submitting transaction to network…", { id: toastId })
      announceSr("Submitting transaction to network…")

      const result = await transaction.execute(signedXdr)

      // Step 3: Success — landed on-chain
      setStatus("confirmed")
      setTxHash(result.txHash)
      setIsSubmitting(false)
      setInFlightId(null)

      announceSr("Transaction confirmed!")
      toast.success("Transaction confirmed!", { id: toastId })

      return { success: true, txHash: result.txHash }
    } catch (err) {
      setIsSubmitting(false)
      setInFlightId(null)

      const parsedError = parseStellarError(err)

      if (parsedError.code === "WALLET_REJECTED") {
        setStatus("cancelled")
        setError(parsedError)
        announceSr("Transaction cancelled")
        toast.warning(parsedError.message, { id: toastId })
        return { success: false, error: parsedError.message }
      }

      setStatus("failed")
      setError(parsedError)
      announceSr(`Failed: ${parsedError.message}`)
      toast.error(parsedError.message, { id: toastId })
      return { success: false, error: parsedError.message }
    }
  }, [transaction, isSubmitting, inFlightId])

  /**
   * Re-attempts the current transaction payload if it failed.
   */
  const retry = useCallback(async () => {
    if (!transaction) {
      return { success: false, error: "No transaction available to retry." }
    }
    setError(null)
    setStatus("preview")
    return confirmAndSign()
  }, [transaction, confirmAndSign])

  /**
   * Cancels the active transaction signing flow.
   */
  const cancel = useCallback(() => {
    if (status !== "confirmed") {
      setStatus("cancelled")
      announceSr("Transaction signing cancelled")
      toast.warning("Transaction signing cancelled")
    }
    setIsSubmitting(false)
    setInFlightId(null)
  }, [status])

  /**
   * Resets hook state back to idle.
   */
  const reset = useCallback(() => {
    setStatus("idle")
    setTransaction(null)
    setError(null)
    setValidationErrors([])
    setTxHash(null)
    setIsSubmitting(false)
    setInFlightId(null)
  }, [])

  return {
    status,
    transaction,
    error,
    validationErrors,
    txHash,
    isSubmitting,
    initiateTransaction,
    confirmAndSign,
    retry,
    cancel,
    reset,
  }
}
