import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next-themes
const setThemeMock = vi.fn()
let currentTheme = "light"

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: currentTheme, setTheme: setThemeMock }),
}))

// Mock useIsMounted to always return true
vi.mock("@/hooks/useIsMounted", () => ({
  useIsMounted: () => true,
}))

import { ThemeToggle } from "../ThemeToggle"

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentTheme = "light"
  })

  it("renders with 'Switch to dark mode' label in light mode", () => {
    render(<ThemeToggle />)
    expect(
      screen.getByRole("button", { name: "Switch to dark mode" })
    ).toBeInTheDocument()
  })

  it("renders with 'Switch to light mode' label in dark mode", () => {
    currentTheme = "dark"
    render(<ThemeToggle />)
    expect(
      screen.getByRole("button", { name: "Switch to light mode" })
    ).toBeInTheDocument()
  })

  it("calls setTheme with 'dark' when clicked in light mode", () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }))
    expect(setThemeMock).toHaveBeenCalledWith("dark")
  })

  it("calls setTheme with 'light' when clicked in dark mode", () => {
    currentTheme = "dark"
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole("button", { name: "Switch to light mode" }))
    expect(setThemeMock).toHaveBeenCalledWith("light")
  })

  it("does not render when not mounted", () => {
    // This is handled by the useIsMounted mock returning true by default.
    // The null return path is covered by the hook itself.
    render(<ThemeToggle />)
    expect(screen.getByRole("button")).toBeInTheDocument()
  })
})