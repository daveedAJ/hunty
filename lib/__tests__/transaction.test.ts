import { describe, it, expect, vi } from "vitest"
import {
  formatAmount,
  formatNetworkFee,
  calculateTotalCost,
  formatRecipientAddress,
  validateTransactionPayload,
  type TransactionPayload,
} from "../transaction"

describe("lib/transaction.ts", () => {
  const VALID_STELLAR_KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"
  const VALID_CONTRACT_KEY = "CAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"

  describe("formatAmount", () => {
    it("formats numbers with asset symbol", () => {
      expect(formatAmount(100)).toBe("100 XLM")
      expect(formatAmount(10.5, "HUNT")).toBe("10.5 HUNT")
      expect(formatAmount("50", "USDC")).toBe("50 USDC")
    })

    it("handles NaN or invalid inputs gracefully", () => {
      expect(formatAmount("invalid")).toBe("0 XLM")
    })
  })

  describe("formatNetworkFee", () => {
    it("formats default fee", () => {
      expect(formatNetworkFee()).toBe("0.00001 XLM")
    })

    it("formats numeric fee strings", () => {
      expect(formatNetworkFee("0.001")).toBe("0.00100 XLM")
    })

    it("preserves formatted fee strings containing XLM", () => {
      expect(formatNetworkFee("0.00005 XLM")).toBe("0.00005 XLM")
    })
  })

  describe("calculateTotalCost", () => {
    it("calculates total for XLM asset", () => {
      expect(calculateTotalCost(10, "0.00001 XLM", "XLM")).toBe("10.00001 XLM")
    })

    it("calculates total for non-XLM asset", () => {
      expect(calculateTotalCost(1, "0.00001 XLM", "NFT")).toBe("1 NFT + 0.00001 XLM")
    })
  })

  describe("formatRecipientAddress", () => {
    it("shortens valid Stellar public key", () => {
      expect(formatRecipientAddress(VALID_STELLAR_KEY, 6)).toBe("GAAZI4...KOCCWN7")
    })

    it("returns short addresses unchanged", () => {
      expect(formatRecipientAddress("G123")).toBe("G123")
    })

    it("handles empty string", () => {
      expect(formatRecipientAddress("")).toBe("")
    })
  })

  describe("validateTransactionPayload", () => {
    it("validates a fully valid payload with Stellar key", () => {
      const payload: Partial<TransactionPayload> = {
        recipient: VALID_STELLAR_KEY,
        amount: 5,
        execute: vi.fn().mockResolvedValue({ txHash: "abc" }),
      }
      const res = validateTransactionPayload(payload)
      expect(res.valid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it("validates a fully valid payload with contract address", () => {
      const payload: Partial<TransactionPayload> = {
        recipient: VALID_CONTRACT_KEY,
        amount: 0,
        execute: vi.fn().mockResolvedValue({ txHash: "abc" }),
      }
      const res = validateTransactionPayload(payload)
      expect(res.valid).toBe(true)
    })

    it("flags missing recipient address", () => {
      const payload: Partial<TransactionPayload> = {
        recipient: "",
        amount: 5,
        execute: vi.fn(),
      }
      const res = validateTransactionPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.errors).toContain("Recipient address is required.")
    })

    it("flags invalid recipient address format", () => {
      const payload: Partial<TransactionPayload> = {
        recipient: "invalid-address-123",
        amount: 5,
        execute: vi.fn(),
      }
      const res = validateTransactionPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.errors[0]).toMatch(/Recipient must be a valid Stellar public key/)
    })

    it("flags missing or negative amount", () => {
      const payload: Partial<TransactionPayload> = {
        recipient: VALID_STELLAR_KEY,
        amount: -1,
        execute: vi.fn(),
      }
      const res = validateTransactionPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.errors).toContain("Transaction amount must be a non-negative number.")
    })

    it("flags missing execute function", () => {
      const payload: Partial<TransactionPayload> = {
        recipient: VALID_STELLAR_KEY,
        amount: 10,
      }
      const res = validateTransactionPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.errors).toContain("Transaction execution handler function is required.")
    })
  })
})
