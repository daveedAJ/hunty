import { NextResponse } from "next/server";
import { getAllHunts } from "@/lib/huntStore";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/v1/hunts
 * List all public active hunts with pagination.
 */
export async function GET(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 100, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

  // getAllHunts() already filters out private hunts.
  const allHunts = getAllHunts();
  const activeHunts = allHunts.filter(h => h.status === "Active");

  const total = activeHunts.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedHunts = activeHunts.slice(offset, offset + limit);

  return NextResponse.json({
    data: paginatedHunts,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  });
}
