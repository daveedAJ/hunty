"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Send,
  X,
} from "lucide-react"
import { TransactionPreviewCard } from "./TransactionPreviewCard"
import type { UseTransactionSigningReturn } from "@/hooks/useTransactionSigning"

interface TransactionSigningModalProps {
  isOpen: boolean
  onClose: () => void
  signing: UseTransactionSigningReturn
  onSuccess?: (txHash: string) => void
  explorerBaseUrl?: string
}

export function TransactionSigningModal({
  isOpen,
  onClose,
  signing,
  onSuccess,
  explorerBaseUrl = "https://stellar.expert/explorer/testnet/tx/",
}: TransactionSigningModalProps) {
  const {
    status,
    transaction,
    error,
    txHash,
    isSubmitting,
    confirmAndSign,
    retry,
    cancel,
    reset,
  } = signing

  if (!isOpen || !transaction) return null

  const handleClose = () => {
    if (isSubmitting) return // Prevent closing while in-flight
    if (status === "confirmed" && txHash) {
      onSuccess?.(txHash)
    }
    cancel()
    onClose()
  }

  const handleConfirm = async () => {
    const res = await confirmAndSign()
    if (res.success && res.txHash) {
      onSuccess?.(res.txHash)
    }
  }

  const handleRetry = async () => {
    const res = await retry()
    if (res.success && res.txHash) {
      onSuccess?.(res.txHash)
    }
  }

  const handleResetAndClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl"
        data-testid="transaction-signing-modal"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {status === "preview" && "Confirm Transaction"}
              {status === "signing" && "Waiting for Wallet Signature"}
              {status === "submitting" && "Submitting Transaction"}
              {status === "confirmed" && "Transaction Confirmed"}
              {status === "failed" && "Transaction Failed"}
              {status === "cancelled" && "Signing Cancelled"}
            </DialogTitle>
            {!isSubmitting && (
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                aria-label="Close transaction modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            {status === "preview" && "Please review transaction preview details before signing."}
            {status === "signing" && "Approve the signature request in your wallet extension."}
            {status === "submitting" && "Processing on-chain transaction submission."}
            {status === "confirmed" && "Your transaction has landed on-chain successfully."}
            {status === "failed" && "An error occurred while processing your transaction."}
            {status === "cancelled" && "Transaction signature request was cancelled."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Always show transaction preview card unless confirmed */}
          {status !== "confirmed" && (
            <TransactionPreviewCard transaction={transaction} />
          )}

          {/* Status-specific banners and UI states */}
          {status === "signing" && (
            <div className="flex flex-col items-center justify-center p-6 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-xs font-medium text-indigo-900 dark:text-indigo-200">
                Opening wallet popup... Please sign the transaction in your wallet.
              </p>
            </div>
          )}

          {status === "submitting" && (
            <div className="flex flex-col items-center justify-center p-6 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 text-center space-y-2">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
                Broadcasting transaction to Stellar network...
              </p>
            </div>
          )}

          {status === "confirmed" && txHash && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 dark:text-emerald-400 animate-in zoom-in-50" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Transaction Successful
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Transaction has been verified on the network.
                </p>
              </div>
              <div className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-left font-mono text-xs">
                <span className="text-[10px] text-slate-400 block mb-1">Transaction Hash</span>
                <span className="text-slate-700 dark:text-slate-300 break-all select-all">
                  {txHash}
                </span>
              </div>
              {explorerBaseUrl && (
                <a
                  href={`${explorerBaseUrl}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium pt-1"
                >
                  View on Stellar Explorer <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {status === "failed" && error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800 dark:text-red-300 space-y-1">
                <strong className="font-semibold block text-red-900 dark:text-red-200">
                  Transaction Failed ({error.code})
                </strong>
                <p className="leading-relaxed">{error.message}</p>
              </div>
            </div>
          )}

          {status === "cancelled" && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <strong className="font-semibold block text-amber-900 dark:text-amber-200">
                  Signature Request Cancelled
                </strong>
                <p>You cancelled the transaction request or closed the wallet popup.</p>
              </div>
            </div>
          )}

          {/* Dialog Actions */}
          <div className="flex gap-2 pt-2">
            {status === "preview" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-semibold"
                  data-testid="confirm-sign-button"
                >
                  Confirm & Sign
                </Button>
              </>
            )}

            {(status === "signing" || status === "submitting") && (
              <Button
                type="button"
                disabled
                className="w-full bg-indigo-600/70 text-white rounded-xl cursor-wait"
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {status === "signing" ? "Waiting for Signature..." : "Submitting..."}
              </Button>
            )}

            {status === "confirmed" && (
              <Button
                type="button"
                onClick={handleResetAndClose}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                Done
              </Button>
            )}

            {status === "failed" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 rounded-xl"
                >
                  Dismiss
                </Button>
                <Button
                  type="button"
                  onClick={handleRetry}
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2"
                  data-testid="retry-button"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Transaction
                </Button>
              </>
            )}

            {status === "cancelled" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 rounded-xl"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                >
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
