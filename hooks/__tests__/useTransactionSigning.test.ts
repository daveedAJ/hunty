import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTransactionSigning } from "../useTransactionSigning"
import * as walletAdapter from "@/lib/walletAdapter"
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn().mockReturnValue("toast-id-123"),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock("@/components/SrAnnouncer", () => ({
  announceSr: vi.fn(),
}))

vi.mock("@/lib/walletAdapter", () => ({
  getActiveWalletAdapter: vi.fn(),
}))

describe("useTransactionSigning Hook", () => {
  const VALID_STELLAR_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"
  const mockExecute = vi.fn()
  const mockSignTransaction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(walletAdapter.getActiveWalletAdapter).mockReturnValue({
      provider: "freighter",
      getPublicKey: vi.fn().mockResolvedValue(VALID_STELLAR_KEY),
      signTransaction: mockSignTransaction,
    })
  })

  it("initializes with default idle state", () => {
    const { result } = renderHook(() => useTransactionSigning())

    expect(result.current.status).toBe("idle")
    expect(result.current.transaction).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.txHash).toBeNull()
    expect(result.current.isSubmitting).toBe(false)
  })

  it("prepares valid transaction and moves status to preview", () => {
    const { result } = renderHook(() => useTransactionSigning())

    act(() => {
      const ok = result.current.initiateTransaction({
        type: "transfer",
        recipient: VALID_STELLAR_KEY,
        amount: 10,
        execute: mockExecute,
      })
      expect(ok).toBe(true)
    })

    expect(result.current.status).toBe("preview")
    expect(result.current.transaction?.recipient).toBe(VALID_STELLAR_KEY)
    expect(result.current.transaction?.amount).toBe(10)
  })

  it("fails initiation when payload validation fails", () => {
    const { result } = renderHook(() => useTransactionSigning())

    act(() => {
      const ok = result.current.initiateTransaction({
        type: "transfer",
        recipient: "invalid-key",
        amount: -5,
        execute: mockExecute,
      })
      expect(ok).toBe(false)
    })

    expect(result.current.status).toBe("failed")
    expect(result.current.validationErrors.length).toBeGreaterThan(0)
    expect(toast.error).toHaveBeenCalledWith(
      "Invalid transaction details. Please check your inputs."
    )
  })

  it("executes confirmAndSign successfully", async () => {
    mockExecute.mockResolvedValueOnce({ txHash: "0xhash123" })
    mockSignTransaction.mockResolvedValueOnce("signed_xdr_payload")

    const { result } = renderHook(() => useTransactionSigning())

    act(() => {
      result.current.initiateTransaction({
        type: "transfer",
        recipient: VALID_STELLAR_KEY,
        amount: 10,
        xdr: "unsigned_xdr",
        execute: mockExecute,
      })
    })

    let res: { success: boolean; txHash?: string } | undefined

    await act(async () => {
      res = await result.current.confirmAndSign()
    })

    expect(res?.success).toBe(true)
    expect(res?.txHash).toBe("0xhash123")
    expect(result.current.status).toBe("confirmed")
    expect(result.current.txHash).toBe("0xhash123")
    expect(mockSignTransaction).toHaveBeenCalledWith("unsigned_xdr")
    expect(mockExecute).toHaveBeenCalledWith("signed_xdr_payload")
    expect(toast.success).toHaveBeenCalledWith("Transaction confirmed!", { id: "toast-id-123" })
  })

  it("handles wallet user rejection", async () => {
    mockSignTransaction.mockRejectedValueOnce(new Error("User rejected transaction signature"))

    const { result } = renderHook(() => useTransactionSigning())

    act(() => {
      result.current.initiateTransaction({
        type: "transfer",
        recipient: VALID_STELLAR_KEY,
        amount: 5,
        xdr: "unsigned_xdr",
        execute: mockExecute,
      })
    })

    let res: { success: boolean; error?: string } | undefined

    await act(async () => {
      res = await result.current.confirmAndSign()
    })

    expect(res?.success).toBe(false)
    expect(result.current.status).toBe("cancelled")
    expect(result.current.error?.code).toBe("WALLET_REJECTED")
    expect(toast.warning).toHaveBeenCalledWith("Transaction cancelled in wallet.", { id: "toast-id-123" })
  })

  it("handles execution failure and allows retry", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Network RPC error"))

    const { result } = renderHook(() => useTransactionSigning())

    act(() => {
      result.current.initiateTransaction({
        type: "transfer",
        recipient: VALID_STELLAR_KEY,
        amount: 5,
        execute: mockExecute,
      })
    })

    await act(async () => {
      await result.current.confirmAndSign()
    })

    expect(result.current.status).toBe("failed")
    expect(result.current.error?.message).toBe("Network RPC error")
    expect(toast.error).toHaveBeenCalledWith("Network RPC error", { id: "toast-id-123" })

    // Retry test
    mockExecute.mockResolvedValueOnce({ txHash: "0xretry_hash" })

    await act(async () => {
      await result.current.retry()
    })

    expect(result.current.status).toBe("confirmed")
    expect(result.current.txHash).toBe("0xretry_hash")
  })

  it("prevents duplicate submissions while in-flight", async () => {
    // Delay execution to simulate in-flight state
    let resolveTx: (val: { txHash: string }) => void
    mockExecute.mockImplementation(
      () => new Promise((resolve) => { resolveTx = resolve })
    )

    const { result } = renderHook(() => useTransactionSigning())

    act(() => {
      result.current.initiateTransaction({
        type: "transfer",
        recipient: VALID_STELLAR_KEY,
        amount: 10,
        execute: mockExecute,
      })
    })

    let promise1: Promise<{ success: boolean }>
    act(() => {
      promise1 = result.current.confirmAndSign()
    })

    // Second click attempt while in-flight
    let promise2Res: { success: boolean; error?: string } | undefined
    await act(async () => {
      promise2Res = await result.current.confirmAndSign()
    })

    expect(promise2Res?.success).toBe(false)
    expect(promise2Res?.error).toBe("Transaction submission already in progress.")

    // Resolve first transaction
    await act(async () => {
      resolveTx!({ txHash: "0xhash_first" })
      await promise1
    })

    expect(result.current.status).toBe("confirmed")
  })

  it("cancels and resets state correctly", () => {
    const { result } = renderHook(() => useTransactionSigning())

    act(() => {
      result.current.initiateTransaction({
        type: "transfer",
        recipient: VALID_STELLAR_KEY,
        amount: 10,
        execute: mockExecute,
      })
    })

    act(() => {
      result.current.cancel()
    })

    expect(result.current.status).toBe("cancelled")

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe("idle")
    expect(result.current.transaction).toBeNull()
  })
})
