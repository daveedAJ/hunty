import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  // ── Visual regression — Issue #346 ──────────────────────────────────────────
  // Baseline screenshots are stored alongside the specs in e2e/screenshots/.
  // The {projectName} token keeps baselines separate per browser so a
  // Chromium baseline does not break when tested on Firefox later.
  snapshotDir: "./e2e/screenshots",
  snapshotPathTemplate: "{snapshotDir}/{testFilePath}/{projectName}/{arg}{ext}",
  // ────────────────────────────────────────────────────────────────────────────
  projects: [
    {
      name: "msedge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
