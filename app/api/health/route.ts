import { NextResponse } from "next/server";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 60, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  return NextResponse.json(
    {
      status: "ok",
      service: "hunty",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
