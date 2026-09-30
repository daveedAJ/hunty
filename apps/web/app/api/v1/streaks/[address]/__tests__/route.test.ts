import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPlayerStreak = vi.fn();

vi.mock("@/lib/streaks", () => ({
  getPlayerStreak: mockGetPlayerStreak,
}));

import { GET } from "../route";

const ADDRESS = "GALICE00000000000000000000000000000000000000000000000";

function makeReq(address: string = ADDRESS) {
  return new Request(`http://localhost/api/v1/streaks/${address}`, {
    method: "GET",
  });
}

function makeCtx(address: string = ADDRESS) {
  return { params: Promise.resolve({ address }) };
}

describe("GET /api/v1/streaks/:address", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the player's streak data", async () => {
    mockGetPlayerStreak.mockResolvedValue({
      currentStreak: 5,
      longestStreak: 10,
      lastCompletedDate: "2026-01-15",
      streakBroken: false,
    });

    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.currentStreak).toBe(5);
    expect(body.data.longestStreak).toBe(10);
    expect(body.data.lastCompletedDate).toBe("2026-01-15");
    expect(body.data.streakBroken).toBe(false);
    expect(mockGetPlayerStreak).toHaveBeenCalledWith(ADDRESS);
  });

  it("returns 200 with null data when player has no streak", async () => {
    mockGetPlayerStreak.mockResolvedValue(null);

    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeNull();
  });

  it("returns 400 for an empty address", async () => {
    const res = await GET(
      makeReq(""),
      makeCtx(""),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid address");
  });

  it("handles database errors gracefully", async () => {
    mockGetPlayerStreak.mockRejectedValue(new Error("DB connection lost"));

    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 200 with broken streak when streak_broken is true", async () => {
    mockGetPlayerStreak.mockResolvedValue({
      currentStreak: 1,
      longestStreak: 7,
      lastCompletedDate: "2026-01-14",
      streakBroken: true,
    });

    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.streakBroken).toBe(true);
    expect(body.data.currentStreak).toBe(1);
    expect(body.data.longestStreak).toBe(7);
  });
});
