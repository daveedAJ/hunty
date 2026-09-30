import { NextResponse } from "next/server";

import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { ValidationError } from "@/lib/api/errors";
import { getPlayerStreak } from "@/lib/streaks";

type RouteContext = { params: Promise<{ address: string }> };

/**
 * GET /api/v1/streaks/:address
 *
 * Returns the current streak state for a player wallet address.
 * Returns `{ data: null }` when the player has never completed a hunt.
 */
export const GET = withErrorHandling(async (req: Request, context: RouteContext) => {
  const { address } = await context.params;

  if (!address || address.trim() === "") {
    throw new ValidationError("Invalid address", { address });
  }

  const streak = await getPlayerStreak(address);
  return NextResponse.json({ data: streak });
});
