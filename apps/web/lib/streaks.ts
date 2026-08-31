/**
 * Player streak tracking — consecutive daily hunt completion.
 *
 * A streak "tick" is earned once per calendar day (UTC) when a player completes
 * at least one hunt.  Completing multiple hunts on the same day counts as a
 * single tick.  Missing a calendar day resets the current streak; the next
 * completion starts a fresh streak at 1.
 *
 * Persistence is PostgreSQL-backed (table: `player_streaks`) when
 * `DATABASE_URL` is configured, with an in-process fallback for local dev and
 * unit tests.  Both layers share the pure `computeStreakUpdate` function so the
 * date logic is identical and fully unit-testable.
 */

import { getDb } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A player's current streak state. */
export interface PlayerStreak {
  /** Consecutive days of completion; 0 means no active streak. */
  currentStreak: number;
  /** Lifetime best streak. */
  longestStreak: number;
  /** UTC date string (YYYY‑MM‑DD) of the last completion, or null. */
  lastCompletedDate: string | null;
  /** True when the most recent update reset the streak after a gap. */
  streakBroken: boolean;
}

/** Result returned after updating a player's streak. */
export interface StreakUpdateResult {
  streak: PlayerStreak;
  /** True when a non-trivial streak was broken to produce this result. */
  streakBroken: boolean;
  /** Length of the streak that was broken (0 if no streak existed). */
  previousStreakLength: number;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * UTC date key in YYYY‑MM‑DD format.
 *
 * Mirrors the convention in `dailyChallenge.ts` so that client and server
 * agree on what "today" means regardless of the server's local timezone.
 */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Days between two YYYY‑MM‑DD strings (UTC).
 * Returns a positive number when `later` is after `earlier`.
 */
export function dayDiff(earlier: string, later: string): number {
  const parse = (d: string): number =>
    Date.UTC(
      parseInt(d.slice(0, 4), 10),
      parseInt(d.slice(5, 7), 10) - 1,
      parseInt(d.slice(8, 10), 10),
    );
  return Math.floor((parse(later) - parse(earlier)) / 86_400_000);
}

/** Normalise a wallet address for use as a DB key (lowercase, trimmed). */
function walletKey(address: string): string {
  return address.trim().toLowerCase();
}

// ─── Pure logic ───────────────────────────────────────────────────────────────

/**
 * Compute the next streak state given the previous state and today's date.
 *
 * Rules:
 *  - No previous streak or no completion recorded → start at 1
 *  - Already completed today → unchanged (idempotent guard for retries)
 *  - Last completion was yesterday → increment streak
 *  - Gap of ≥ 2 days → streak broken, reset to 1
 */
export function computeStreakUpdate(
  prev: PlayerStreak | null,
  today: string,
): StreakUpdateResult {
  if (!prev || prev.lastCompletedDate === null) {
    return {
      streak: {
        currentStreak: 1,
        longestStreak: 1,
        lastCompletedDate: today,
        streakBroken: false,
      },
      streakBroken: false,
      previousStreakLength: 0,
    };
  }

  // Already completed today — idempotent, no change.
  if (prev.lastCompletedDate === today) {
    return {
      streak: {
        ...prev,
        lastCompletedDate: prev.lastCompletedDate,
      },
      streakBroken: false,
      previousStreakLength: prev.currentStreak,
    };
  }

  const diff = dayDiff(prev.lastCompletedDate, today);

  if (diff === 1) {
    // Consecutive day — increment.
    const newCurrent = prev.currentStreak + 1;
    const newLongest = Math.max(prev.longestStreak, newCurrent);
    return {
      streak: {
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastCompletedDate: today,
        streakBroken: false,
      },
      streakBroken: false,
      previousStreakLength: prev.currentStreak,
    };
  }

  // Gap of ≥ 2 days — streak broken, start fresh.
  return {
    streak: {
      currentStreak: 1,
      longestStreak: prev.longestStreak,
      lastCompletedDate: today,
      streakBroken: true,
    },
    streakBroken: true,
    previousStreakLength: prev.currentStreak,
  };
}

// ─── In-memory fallback (local dev / tests when DATABASE_URL is absent) ───────

const memoryStore = new Map<string, PlayerStreak>();

/** Reset process-local state — used by tests and development resets. */
export function resetStreaksStore(): void {
  memoryStore.clear();
}

/** Normalised empty streak returned when no row exists in the DB. */
export function emptyStreak(): PlayerStreak {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
    streakBroken: false,
  };
}

// ─── DB persistence helpers ───────────────────────────────────────────────────

interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  streak_broken: boolean;
}

function rowToStreak(row: StreakRow): PlayerStreak {
  return {
    currentStreak: Number(row.current_streak),
    longestStreak: Number(row.longest_streak),
    lastCompletedDate: row.last_completed_date,
    streakBroken: Boolean(row.streak_broken),
  };
}

// ─── Public API ─�──────────────────────────────────────────────────────────────

/**
 * Atomically read the current streak, compute the update for today's completion,
 * and persist it within a single advisory-locked transaction.
 *
 * Safe against:
 *  - Duplicate / retried requests: same-day completions are idempotent.
 *  - Race conditions: `pg_advisory_xact_lock` serializes per-player updates.
 *
 * When `DATABASE_URL` is unset (e.g. unit tests) an in-memory fallback is used.
 */
export async function updatePlayerStreak(
  address: string,
): Promise<StreakUpdateResult> {
  const today = todayKey();
  const normalized = walletKey(address);

  if (!process.env.DATABASE_URL) {
    const prev = memoryStore.get(normalized) ?? null;
    const result = computeStreakUpdate(prev, today);
    memoryStore.set(normalized, result.streak);
    return result;
  }

  try {
    const sql = getDb();

    return await sql.begin(async (tx: {
      strings: unknown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (...args: any[]): Promise<any>;
    }) => {
      // Serialize per-player updates to prevent lost-update races.
      await tx`SELECT pg_advisory_xact_lock(hashtext('streak_' || ${normalized}))`;

      const rows = await tx<{
        current_streak: number;
        longest_streak: number;
        last_completed_date: string | null;
        streak_broken: boolean;
      }[]>`
        SELECT current_streak, longest_streak, last_completed_date, streak_broken
        FROM player_streaks
        WHERE player_address = ${normalized}
      `;

      const prev: PlayerStreak | null =
        rows.length > 0 ? rowToStreak(rows[0]) : null;
      const result = computeStreakUpdate(prev, today);

      await tx`
        INSERT INTO player_streaks
          (player_address, current_streak, longest_streak, last_completed_date, streak_broken, updated_at)
        VALUES
          (${normalized}, ${result.streak.currentStreak}, ${result.streak.longestStreak}, ${result.streak.lastCompletedDate}, ${result.streakBroken}, NOW())
        ON CONFLICT (player_address) DO UPDATE SET
          current_streak    = EXCLUDED.current_streak,
          longest_streak    = EXCLUDED.longest_streak,
          last_completed_date = EXCLUDED.last_completed_date,
          streak_broken     = EXCLUDED.streak_broken,
          updated_at        = NOW()
      `;

      return result;
    });
  } catch (error) {
    logger.warn("Failed to update streak from database, falling back to memory", error);
    const prev = memoryStore.get(normalized) ?? null;
    const result = computeStreakUpdate(prev, today);
    memoryStore.set(normalized, result.streak);
    return result;
  }
}

/**
 * Read a player's streak without mutating state.
 * Returns `null` when no completion has ever been recorded for the player.
 */
export async function getPlayerStreak(
  address: string,
): Promise<PlayerStreak | null> {
  const normalized = walletKey(address);

  if (!process.env.DATABASE_URL) {
    const stored = memoryStore.get(normalized);
    return stored ?? null;
  }

  try {
    const sql = getDb();
    const rows = await sql<{
      current_streak: number;
      longest_streak: number;
      last_completed_date: string | null;
      streak_broken: boolean;
    }[]>`
      SELECT current_streak, longest_streak, last_completed_date, streak_broken
      FROM player_streaks
      WHERE player_address = ${normalized}
    `;

    if (rows.length === 0) return null;
    return rowToStreak(rows[0]);
  } catch (error) {
    logger.warn("Failed to read streak from database, falling back to memory", error);
    const stored = memoryStore.get(normalized);
    return stored ?? null;
  }
}
