"use client"

import React, { useState } from "react"
import { Copy, Check, ShieldCheck, Wallet } from "lucide-react"
import {
  formatAmount,
  formatNetworkFee,
  calculateTotalCost,
  formatRecipientAddress,
  type TransactionPayload,
} from "@/lib/transaction"
import { useWallet } from "@/lib/context/WalletContext"

interface TransactionPreviewCardProps {
  transaction: TransactionPayload
  className?: string
}

export function TransactionPreviewCard({
  transaction,
  className = "",
}: TransactionPreviewCardProps) {
  const [copied, setCopied] = useState(false)
  const wallet = useWallet().connected ? useWallet() : null

  const handleCopyRecipient = () => {
    if (transaction.recipient) {
      navigator.clipboard.writeText(transaction.recipient)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const symbol = transaction.assetSymbol || "XLM"
  const formattedAmount = formatAmount(transaction.amount, symbol)
  const formattedFee = formatNetworkFee(transaction.fee)
  const totalCost = calculateTotalCost(transaction.amount, transaction.fee, symbol)
  const network = transaction.network || "Stellar Testnet"

  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-5 space-y-4 shadow-xs ${className}`}
      data-testid="transaction-preview-card"
    >
      {/* Title / Header */}
      {transaction.title && (
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {transaction.title}
            </h4>
            {transaction.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {transaction.description}
              </p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            {transaction.type.replace("_", " ").toUpperCase()}
          </span>
        </div>
      )}

      {/* Recipient */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Recipient</span>
          <span className="text-[10px] text-slate-400 font-mono">Stellar Address</span>
        </label>
        <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-medium">
            {formatRecipientAddress(transaction.recipient, 8)}
          </span>
          <button
            type="button"
            onClick={handleCopyRecipient}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
            title="Copy full recipient address"
            aria-label="Copy recipient address"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Amount, Network Fee & Total */}
      <div className="space-y-2 bg-white dark:bg-slate-950 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
          <span>Transfer Amount</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-sm">
            {formattedAmount}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
          <span>Est. Network Fee</span>
          <span className="font-mono text-slate-600 dark:text-slate-300">
            {formattedFee}
          </span>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center font-medium">
          <span className="text-slate-700 dark:text-slate-300 font-semibold">
            Total Expense
          </span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
            {totalCost}
          </span>
        </div>
      </div>

      {/* Metadata & Memo */}
      {(transaction.memo || (transaction.metadata && Object.keys(transaction.metadata).length > 0)) && (
        <div className="space-y-2 text-xs">
          {transaction.memo && (
            <div className="flex justify-between items-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
              <span className="font-medium text-[11px]">Memo:</span>
              <span className="font-mono text-right truncate max-w-[200px]">
                {transaction.memo}
              </span>
            </div>
          )}
          {transaction.metadata &&
            Object.entries(transaction.metadata).map(([key, val]) => (
              <div
                key={key}
                className="flex justify-between items-center text-slate-500 dark:text-slate-400"
              >
                <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                  {String(val)}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Wallet Provider Info Footer */}
      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5">
          <Wallet className="w-3 h-3 text-slate-400" />
          Provider: <strong className="capitalize text-slate-600 dark:text-slate-300">{wallet?.walletProvider || "Freighter"}</strong>
        </span>
        <span>{network}</span>
      </div>
    </div>
  )
}
