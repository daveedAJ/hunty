"use client";

import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import type { PlayerStreak } from "@/lib/streaks";

export interface UsePlayerStreakResult {
  streak: PlayerStreak | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches a player's daily streak from the server.
 * Returns `null` when the player has never completed a hunt.
 */
export function usePlayerStreak(
  address: string | null | undefined,
): UsePlayerStreakResult {
  const [streak, setStreak] = useState<PlayerStreak | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || address.trim() === "") {
      setStreak(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/v1/streaks/${encodeURIComponent(address)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} — ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: { data: PlayerStreak | null }) => {
        if (cancelled) return;
        setStreak(data.data ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error("Failed to load streak:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load streak data.",
        );
        setStreak(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { streak, isLoading, error };
}
