/* eslint-disable @next/next/no-img-element */

import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { PlayGame } from "../PlayGame"
import * as huntStore from "@/lib/huntStore"

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}))

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
  },
}))

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="header" />,
}))

vi.mock("@/components/PlayerProgressPanel", () => ({
  PlayerProgressPanel: () => <div data-testid="player-progress" />,
}))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe("PlayGame", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows Network Error instead of crashing when hunt fetch times out", async () => {
    vi.spyOn(huntStore, "getHunt").mockImplementation(() => {
      throw new Error("Soroban RPC request timed out")
    })

    renderWithClient(
      <PlayGame
        hunts={[]}
        gameName="Hunty"
        onExit={vi.fn()}
        onGameComplete={vi.fn()}
        gameCompleteModal={null}
        huntId={56}
      />
    )

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument()
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText("Network Error")).toBeInTheDocument()
    })

    expect(toastError).toHaveBeenCalledWith("Network Error")
  })
})
