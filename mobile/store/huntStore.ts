/**
 * Shared hunt list for dashboard (creator hunts) and Game Arcade (active hunts).
 * Persisted in SecureStore for mobile.
 */

import type { HuntStatus, StoredHunt, Clue } from "@lib/types";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "hunty_hunts";
const CLUES_KEY = "hunty_clues";

// Seed timestamps: active hunts end 7 days from first load, completed hunts in the past.
const NOW_SECONDS = Math.floor(Date.now() / 1000);

const SEED_HUNTS: StoredHunt[] = [
  {
    id: 1,
    title: "City Secrets",
    description: "Race across town to uncover hidden murals and landmarks.",
    cluesCount: 5,
    status: "Active",
    rewardType: "XLM",
    startTime: NOW_SECONDS - 86400,
    endTime: NOW_SECONDS + 7 * 86400,
  },
  {
    id: 2,
    title: "Campus Quest",
    description: "Solve riddles scattered around campus before the timer ends.",
    cluesCount: 7,
    status: "Active",
    rewardType: "NFT",
    startTime: NOW_SECONDS - 2 * 86400,
    endTime: NOW_SECONDS + 3 * 86400,
  },
  {
    id: 3,
    title: "Office Onboarding Hunt",
    description: "A playful intro game for new teammates around the office.",
    cluesCount: 4,
    status: "Completed",
    rewardType: "Both",
    startTime: NOW_SECONDS - 10 * 86400,
    endTime: NOW_SECONDS - 5 * 86400,
  },
  {
    id: 4,
    title: "Summer Treasure Hunt",
    description: "Find hidden clues in the park.",
    cluesCount: 3,
    status: "Draft",
    rewardType: "XLM",
  },
  {
    id: 5,
    title: "Museum Mystery",
    description: "Discover art and history through clues.",
    cluesCount: 0,
    status: "Draft",
    rewardType: "NFT",
  },
];

async function readClues(): Promise<Clue[]> {
  try {
    const raw = await SecureStore.getItemAsync(CLUES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Clue[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeClues(clues: Clue[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLUES_KEY, JSON.stringify(clues));
  } catch {
    // ignore
  }
}

async function readHunts(): Promise<StoredHunt[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return [...SEED_HUNTS];
    const parsed = JSON.parse(raw) as StoredHunt[];
    return Array.isArray(parsed) ? parsed : [...SEED_HUNTS];
  } catch {
    return [...SEED_HUNTS];
  }
}

async function writeHunts(hunts: StoredHunt[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(hunts));
  } catch {
    // ignore
  }
}

/** Active hunts for the home feed (excludes private hunts). */
export async function getActiveHuntsForFeed(): Promise<StoredHunt[]> {
  const hunts = await readHunts();
  return hunts.filter((h) => h.status === "Active" && !h.is_private);
}

/** All hunts (for Game Arcade: filter by status === "Active"). Private hunts are excluded. */
export async function getAllHunts(): Promise<StoredHunt[]> {
  const hunts = await readHunts();
  return hunts.filter((h) => !h.is_private);
}

/** All hunts including private ones (for creator dashboard). */
export async function getAllHuntsIncludingPrivate(): Promise<StoredHunt[]> {
  return readHunts();
}

/** Creator hunts for dashboard (all stored hunts including private; creator filter can be added later). */
export async function getCreatorHunts(): Promise<StoredHunt[]> {
  return readHunts();
}

/** Get hunts for a creator (creator public-key filter not implemented yet; returns all hunts). */
export async function getHuntsByCreator(): Promise<StoredHunt[]> {
  return readHunts();
}

/** Update a hunt's status (e.g. Draft → Active after activate_hunt). */
export async function updateHuntStatus(huntId: number, status: HuntStatus): Promise<void> {
  const hunts = (await readHunts()).map((h) => (h.id === huntId ? { ...h, status } : h));
  await writeHunts(hunts);
}

/** Delete multiple hunts by IDs. */
export async function deleteHunts(ids: number[]): Promise<void> {
  const hunts = (await readHunts()).filter((h) => !ids.includes(h.id));
  await writeHunts(hunts);

  const allClues = await readClues();
  const remainingClues = allClues.filter((c) => !ids.includes(c.huntId));
  await writeClues(remainingClues);
}

/** Archive (Cancel) multiple hunts by IDs. */
export async function archiveHunts(ids: number[]): Promise<void> {
  const hunts = (await readHunts()).map((h) =>
    ids.includes(h.id) ? { ...h, status: "Cancelled" as HuntStatus } : h
  );
  await writeHunts(hunts);
}

/** Get a single hunt by ID */
export async function getHuntById(id: number): Promise<StoredHunt | undefined> {
  const hunts = await readHunts();
  return hunts.find((h) => h.id === id);
}

/** Add a new hunt (e.g. after createHunt). */
export async function addHunt(hunt: StoredHunt): Promise<void> {
  const hunts = await readHunts();
  if (hunts.some((h) => h.id === hunt.id)) return;
  await writeHunts([...hunts, hunt]);
}

/** Get all clues for a specific hunt. */
export async function getHuntClues(huntId: number): Promise<Clue[]> {
  const clues = await readClues();
  return clues.filter((c) => c.huntId === huntId);
}

/** Persist a new clue locally and increment the hunt's cluesCount. */
export async function saveClueLocally(clue: Omit<Clue, "id">): Promise<void> {
  const all = await readClues();
  const newId = all.length > 0 ? Math.max(...all.map((c) => c.id)) + 1 : 1;
  await writeClues([...all, { ...clue, id: newId }]);
  const hunts = (await readHunts()).map((h) =>
    h.id === clue.huntId ? { ...h, cluesCount: h.cluesCount + 1 } : h
  );
  await writeHunts(hunts);
}

/** Get a single hunt by string ID */
export async function getHunt(id: string): Promise<StoredHunt | undefined> {
  const hunts = await readHunts();
  return hunts.find((c) => c.id === Number(id));
}

/**
 * Return up to `limit` featured hunts, ranked by a trending score.
 * Score factors: clue count, reward type variety, time remaining, recency.
 */
export async function getFeaturedHunts(limit = 3): Promise<StoredHunt[]> {
  const now = Math.floor(Date.now() / 1000);
  const active = (await readHunts()).filter((h) => h.status === "Active" && !h.is_private);

  const scored = active.map((hunt) => {
    let score = 0;
    score += hunt.cluesCount * 10;
    if (hunt.rewardType === "Both") score += 20;
    else if (hunt.rewardType === "NFT") score += 10;
    if (hunt.endTime) {
      const hoursLeft = (hunt.endTime - now) / 3600;
      if (hoursLeft > 0 && hoursLeft < 48) score += 15;
    }
    if (hunt.startTime) {
      const daysSinceStart = (now - hunt.startTime) / 86400;
      if (daysSinceStart < 3) score += 10;
    }
    return { hunt, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.hunt);
}
