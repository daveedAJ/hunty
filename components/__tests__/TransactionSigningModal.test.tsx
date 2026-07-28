import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TransactionSigningModal } from "../TransactionSigningModal"
import type { UseTransactionSigningReturn } from "@/hooks/useTransactionSigning"

vi.mock("@/lib/context/WalletContext", () => ({
  useWallet: () => ({
    connected: true,
    publicKey: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
    walletProvider: "freighter",
  }),
}))

describe("TransactionSigningModal Component", () => {
  const VALID_STELLAR_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  const defaultMockSigning: UseTransactionSigningReturn = {
    status: "preview",
    transaction: {
      id: "tx-test-123",
      type: "transfer",
      title: "Send XLM to Friend",
      description: "Transfer 50 XLM reward",
      recipient: VALID_STELLAR_KEY,
      amount: 50,
      assetSymbol: "XLM",
      fee: "0.00001 XLM",
      memo: "Test reward payment",
      metadata: { huntId: "hunt-789" },
      execute: vi.fn(),
    },
    error: null,
    validationErrors: [],
    txHash: null,
    isSubmitting: false,
    initiateTransaction: vi.fn(),
    confirmAndSign: vi.fn().mockResolvedValue({ success: true, txHash: "0xhash999" }),
    retry: vi.fn().mockResolvedValue({ success: true, txHash: "0xhash999" }),
    cancel: vi.fn(),
    reset: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not render when isOpen is false", () => {
    render(
      <TransactionSigningModal
        isOpen={false}
        onClose={mockOnClose}
        signing={defaultMockSigning}
      />
    )
    expect(screen.queryByTestId("transaction-signing-modal")).not.toBeInTheDocument()
  })

  it("renders preview card details correctly when in preview status", () => {
    render(
      <TransactionSigningModal
        isOpen={true}
        onClose={mockOnClose}
        signing={defaultMockSigning}
      />
    )

    expect(screen.getByTestId("transaction-signing-modal")).toBeInTheDocument()
    expect(screen.getByText("Confirm Transaction")).toBeInTheDocument()
    expect(screen.getByText("Send XLM to Friend")).toBeInTheDocument()
    expect(screen.getByText("Transfer 50 XLM reward")).toBeInTheDocument()
    expect(screen.getByText("50 XLM")).toBeInTheDocument()
    expect(screen.getByText("0.00001 XLM")).toBeInTheDocument()
    expect(screen.getByText("50.00001 XLM")).toBeInTheDocument()
    expect(screen.getByText("Test reward payment")).toBeInTheDocument()
    expect(screen.getByTestId("confirm-sign-button")).toBeInTheDocument()
  })

  it("triggers confirmAndSign when Confirm & Sign button is clicked", async () => {
    render(
      <TransactionSigningModal
        isOpen={true}
        onClose={mockOnClose}
        signing={defaultMockSigning}
        onSuccess={mockOnSuccess}
      />
    )

    const confirmBtn = screen.getByTestId("confirm-sign-button")
    fireEvent.click(confirmBtn)

    expect(defaultMockSigning.confirmAndSign).toHaveBeenCalledTimes(1)
  })

  it("displays loading state during signing status", () => {
    const signingState: UseTransactionSigningReturn = {
      ...defaultMockSigning,
      status: "signing",
      isSubmitting: true,
    }

    render(
      <TransactionSigningModal
        isOpen={true}
        onClose={mockOnClose}
        signing={signingState}
      />
    )

    expect(screen.getByText("Waiting for Wallet Signature")).toBeInTheDocument()
    expect(screen.getByText("Waiting for Signature...")).toBeDisabled()
  })

  it("displays confirmation screen on success status", () => {
    const confirmedState: UseTransactionSigningReturn = {
      ...defaultMockSigning,
      status: "confirmed",
      txHash: "0xsuperhash123",
      isSubmitting: false,
    }

    render(
      <TransactionSigningModal
        isOpen={true}
        onClose={mockOnClose}
        signing={confirmedState}
      />
    )

    expect(screen.getByText("Transaction Confirmed")).toBeInTheDocument()
    expect(screen.getByText("0xsuperhash123")).toBeInTheDocument()
    expect(screen.getByText("Done")).toBeInTheDocument()
  })

  it("displays error state and handles retry click", () => {
    const failedState: UseTransactionSigningReturn = {
      ...defaultMockSigning,
      status: "failed",
      error: {
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient XLM balance to cover transaction fees.",
        raw: null,
      },
    }

    render(
      <TransactionSigningModal
        isOpen={true}
        onClose={mockOnClose}
        signing={failedState}
      />
    )

    expect(screen.getByText("Transaction Failed")).toBeInTheDocument()
    expect(screen.getByText("Insufficient XLM balance to cover transaction fees.")).toBeInTheDocument()

    const retryBtn = screen.getByTestId("retry-button")
    fireEvent.click(retryBtn)

    expect(defaultMockSigning.retry).toHaveBeenCalledTimes(1)
  })
})
