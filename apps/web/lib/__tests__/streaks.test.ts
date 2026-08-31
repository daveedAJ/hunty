import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  computeStreakUpdate,
  dayDiff,
  todayKey,
  updatePlayerStreak,
  getPlayerStreak,
  resetStreaksStore,
  emptyStreak,
  type PlayerStreak,
} from "../streaks";

// ---------------------------------------------------------------------------
// Pure logic tests for computeStreakUpdate (no I/O, no DB, no mock needed)
// ---------------------------------------------------------------------------

describe("computeStreakUpdate", () => {
  const TODAY = "2026-01-10";

  describe("first completion", () => {
    it("starts a streak at 1 when no previous streak exists", () => {
      const result = computeStreakUpdate(null, TODAY);
      expect(result.streak.currentStreak).toBe(1);
      expect(result.streak.longestStreak).toBe(1);
      expect(result.streak.lastCompletedDate).toBe(TODAY);
      expect(result.streakBroken).toBe(false);
      expect(result.previousStreakLength).toBe(0);
    });

    it("starts a streak at 1 when previous streak has null date", () => {
      const prev: PlayerStreak = {
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: null,
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(1);
      expect(result.streakBroken).toBe(false);
      expect(result.previousStreakLength).toBe(5);
    });
  });

  describe("consecutive days", () => {
    it("increments streak by 1 when yesterday was the last completion", () => {
      const prev: PlayerStreak = {
        currentStreak: 3,
        longestStreak: 5,
        lastCompletedDate: "2026-01-09",
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(4);
      expect(result.streak.longestStreak).toBe(5);
      expect(result.streak.lastCompletedDate).toBe(TODAY);
      expect(result.streakBroken).toBe(false);
      expect(result.previousStreakLength).toBe(3);
    });

    it("updates longest streak when current exceeds it", () => {
      const prev: PlayerStreak = {
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: "2026-01-09",
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(6);
      expect(result.streak.longestStreak).toBe(6);
      expect(result.streakBroken).toBe(false);
    });
  });

  describe("same day — multiple completions", () => {
    it("does not increment streak when completing again on the same day", () => {
      const prev: PlayerStreak = {
        currentStreak: 3,
        longestStreak: 5,
        lastCompletedDate: TODAY,
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(3);
      expect(result.streak.longestStreak).toBe(5);
      expect(result.streakBroken).toBe(false);
      expect(result.previousStreakLength).toBe(3);
    });

    it("is idempotent — multiple same-day calls return the same state", () => {
      const prev: PlayerStreak = {
        currentStreak: 7,
        longestStreak: 10,
        lastCompletedDate: TODAY,
        streakBroken: false,
      };
      const result1 = computeStreakUpdate(prev, TODAY);
      const result2 = computeStreakUpdate(result1.streak, TODAY);
      expect(result2.streak.currentStreak).toBe(7);
      expect(result2.streak.longestStreak).toBe(10);
      expect(result2.streakBroken).toBe(false);
    });
  });

  describe("broken streaks", () => {
    it("breaks and resets to 1 when a day is missed (gap of 2 days)", () => {
      const prev: PlayerStreak = {
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: "2026-01-08",
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(1);
      expect(result.streak.longestStreak).toBe(5);
      expect(result.streak.lastCompletedDate).toBe(TODAY);
      expect(result.streakBroken).toBe(true);
      expect(result.previousStreakLength).toBe(5);
    });

    it("breaks and resets to 1 when a week is missed", () => {
      const prev: PlayerStreak = {
        currentStreak: 3,
        longestStreak: 10,
        lastCompletedDate: "2026-01-02",
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(1);
      expect(result.streak.longestStreak).toBe(10);
      expect(result.streakBroken).toBe(true);
      expect(result.previousStreakLength).toBe(3);
    });

    it("does not report broken when starting from zero streak", () => {
      const prev: PlayerStreak = {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: "2025-12-30",
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(1);
      expect(result.streakBroken).toBe(false);
      expect(result.previousStreakLength).toBe(0);
    });
  });

  describe("restarting after a break", () => {
    it("restarts at 1 after a missed day", () => {
      const prev: PlayerStreak = {
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: "2026-01-08",
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(1);
      expect(result.streakBroken).toBe(true);
      expect(result.previousStreakLength).toBe(5);
    });

    it("continues the new streak on the next consecutive day after restart", () => {
      // After restart on day 9, continuing on day 10 should increment to 2
      const prev: PlayerStreak = {
        currentStreak: 1,
        longestStreak: 5,
        lastCompletedDate: "2026-01-09",
        streakBroken: true,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(2);
      expect(result.streak.longestStreak).toBe(5);
      expect(result.streakBroken).toBe(false);
    });
  });

  describe("duplicate / retried completions", () => {
    it("returns unchanged streak for repeated calls on the same day", () => {
      const prev: PlayerStreak = {
        currentStreak: 2,
        longestStreak: 3,
        lastCompletedDate: TODAY,
        streakBroken: false,
      };
      const result = computeStreakUpdate(prev, TODAY);
      expect(result.streak.currentStreak).toBe(2);
      expect(result.streak.longestStreak).toBe(3);
      expect(result.streakBroken).toBe(false);
      expect(result.previousStreakLength).toBe(2);
    });
  });
});

// ---------------------------------------------------------------------------
// dayDiff helper tests
// ---------------------------------------------------------------------------

describe("dayDiff", () => {
  it("returns 0 for the same date", () => {
    expect(dayDiff("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("returns 1 for consecutive dates", () => {
    expect(dayDiff("2026-01-01", "2026-01-02")).toBe(1);
  });

  it("returns 2 for a one-day gap", () => {
    expect(dayDiff("2026-01-01", "2026-01-03")).toBe(2);
  });

  it("returns 7 for a week gap", () => {
    expect(dayDiff("2026-01-01", "2026-01-08")).toBe(7);
  });

  it("handles month boundaries", () => {
    expect(dayDiff("2026-01-31", "2026-02-01")).toBe(1);
  });

  it("handles year boundaries", () => {
    expect(dayDiff("2025-12-31", "2026-01-01")).toBe(1);
  });
});

describe("todayKey", () => {
  it("returns a YYYY-MM-DD string", () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// In-memory fallback tests (DATABASE_URL not set → memory path)
//
// Uses fake timers so we can advance the system clock across calendar days
// and exercise the same-day idempotency and gap detection logic through
// the full updatePlayerStreak → computeStreakUpdate pipeline.
// ---------------------------------------------------------------------------

describe("updatePlayerStreak / getPlayerStreak (in-memory fallback)", () => {
  beforeEach(() => {
    resetStreaksStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a streak at 1 on first completion", async () => {
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const result = await updatePlayerStreak(
      "GALICE00000000000000000000000000000000000000000000000",
    );
    expect(result.streak.currentStreak).toBe(1);
    expect(result.streak.longestStreak).toBe(1);
    expect(result.streak.lastCompletedDate).toBe("2026-01-15");
    expect(result.streakBroken).toBe(false);
    expect(result.previousStreakLength).toBe(0);
  });

  it("is idempotent within the same day (duplicate / retried request)", async () => {
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const addr = "GALICE00000000000000000000000000000000000000000000000";
    const first = await updatePlayerStreak(addr);
    const second = await updatePlayerStreak(addr);
    expect(second.streak.currentStreak).toBe(1);
    expect(second.streak.longestStreak).toBe(1);
    expect(second.streakBroken).toBe(false);
    expect(second.previousStreakLength).toBe(1);
    expect(first.streak.lastCompletedDate).toBe(second.streak.lastCompletedDate);
  });

  it("increments on the next consecutive day", async () => {
    const addr = "GBOB00000000000000000000000000000000000000000000000000";

    vi.setSystemTime(new Date("2026-01-15T23:59:00Z"));
    await updatePlayerStreak(addr);

    vi.setSystemTime(new Date("2026-01-16T00:01:00Z"));
    const result = await updatePlayerStreak(addr);
    expect(result.streak.currentStreak).toBe(2);
    expect(result.streak.longestStreak).toBe(2);
    expect(result.streakBroken).toBe(false);
    expect(result.previousStreakLength).toBe(1);
  });

  it("increments again on the third consecutive day", async () => {
    const addr = "GBOB00000000000000000000000000000000000000000000000000";

    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    await updatePlayerStreak(addr);

    vi.setSystemTime(new Date("2026-01-16T12:00:00Z"));
    await updatePlayerStreak(addr);

    vi.setSystemTime(new Date("2026-01-17T12:00:00Z"));
    const result = await updatePlayerStreak(addr);
    expect(result.streak.currentStreak).toBe(3);
    expect(result.streak.longestStreak).toBe(3);
  });

  it("breaks and resets to 1 when a day is missed", async () => {
    const addr = "GBOB00000000000000000000000000000000000000000000000000";

    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    await updatePlayerStreak(addr);
    vi.setSystemTime(new Date("2026-01-16T12:00:00Z"));
    await updatePlayerStreak(addr);
    vi.setSystemTime(new Date("2026-01-17T12:00:00Z"));
    await updatePlayerStreak(addr);

    // Miss day 18, complete on day 19
    vi.setSystemTime(new Date("2026-01-19T12:00:00Z"));
    const result = await updatePlayerStreak(addr);
    expect(result.streak.currentStreak).toBe(1);
    expect(result.streak.longestStreak).toBe(3);
    expect(result.streakBroken).toBe(true);
    expect(result.previousStreakLength).toBe(3);
  });

  it("restarts a new streak after a break and builds it up again", async () => {
    const addr = "GBOB00000000000000000000000000000000000000000000000000";

    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    await updatePlayerStreak(addr);
    vi.setSystemTime(new Date("2026-01-16T12:00:00Z"));
    await updatePlayerStreak(addr);
    vi.setSystemTime(new Date("2026-01-17T12:00:00Z"));
    await updatePlayerStreak(addr);

    // Break — miss day 18, complete on day 19
    vi.setSystemTime(new Date("2026-01-19T12:00:00Z"));
    await updatePlayerStreak(addr);
    expect((await getPlayerStreak(addr))!.currentStreak).toBe(1);

    // Continue next day (day 20 → consecutive from day 19)
    vi.setSystemTime(new Date("2026-01-20T12:00:00Z"));
    const result = await updatePlayerStreak(addr);
    expect(result.streak.currentStreak).toBe(2);
    expect(result.streak.longestStreak).toBe(3);
    expect(result.streakBroken).toBe(false);
  });

  it("multiple completions on the same day count once", async () => {
    vi.setSystemTime(new Date("2026-01-15T08:00:00Z"));
    const addr = "GALICE00000000000000000000000000000000000000000000000";

    const first = await updatePlayerStreak(addr);
    expect(first.streak.currentStreak).toBe(1);

    // Same day, later "completion"
    vi.setSystemTime(new Date("2026-01-15T20:00:00Z"));
    const second = await updatePlayerStreak(addr);
    expect(second.streak.currentStreak).toBe(1);
    expect(second.streakBroken).toBe(false);
  });

  it("getPlayerStreak returns null for an unknown address", async () => {
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const result = await getPlayerStreak(
      "GNOBODY0000000000000000000000000000000000000000000000000",
    );
    expect(result).toBeNull();
  });

  it("getPlayerStreak returns the stored streak after update", async () => {
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const addr = "GALICE00000000000000000000000000000000000000000000000";
    await updatePlayerStreak(addr);
    const streak = await getPlayerStreak(addr);
    expect(streak).not.toBeNull();
    expect(streak!.currentStreak).toBe(1);
    expect(streak!.longestStreak).toBe(1);
    expect(streak!.lastCompletedDate).toBe("2026-01-15");
  });

  it("normalises wallet addresses (lowercase, trimmed)", async () => {
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const addr = "  GalIce0000000000000000000000000000000000000000000000 ";
    await updatePlayerStreak(addr);
    const streak = await getPlayerStreak(addr.trim());
    expect(streak).not.toBeNull();
    expect(streak!.currentStreak).toBe(1);
  });
});

describe("emptyStreak", () => {
  it("returns a zeroed streak with null date", () => {
    const empty = emptyStreak();
    expect(empty.currentStreak).toBe(0);
    expect(empty.longestStreak).toBe(0);
    expect(empty.lastCompletedDate).toBeNull();
    expect(empty.streakBroken).toBe(false);
  });
});
