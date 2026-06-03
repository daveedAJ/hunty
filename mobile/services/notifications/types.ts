/**
 * Typed push notification payloads for Hunty Mobile.
 * All notification events are strongly typed here.
 */

export type NotificationEventType =
  | 'hunt_start'
  | 'correct_answer'
  | 'leaderboard_outranked'
  | 'hunt_ending_soon';

// ─── Payload shapes per event ─────────────────────────────────────────────────

export interface HuntStartPayload {
  type: 'hunt_start';
  huntId: number;
  huntTitle: string;
}

export interface CorrectAnswerPayload {
  type: 'correct_answer';
  huntId: number;
  huntTitle: string;
  score?: number;
  reward?: string;
}

export interface LeaderboardOutrankedPayload {
  type: 'leaderboard_outranked';
  huntId: number;
  huntTitle: string;
  currentRank: number;
  overtakenBy?: string;
}

export interface HuntEndingSoonPayload {
  type: 'hunt_ending_soon';
  huntId: number;
  huntTitle: string;
  minutesRemaining: number;
}

export type NotificationPayload =
  | HuntStartPayload
  | CorrectAnswerPayload
  | LeaderboardOutrankedPayload
  | HuntEndingSoonPayload;

// ─── Navigation target derived from a notification tap ───────────────────────

export interface NotificationNavTarget {
  /** Expo Router path, e.g. "/hunt/42" */
  path: string;
}

export function resolveNavTarget(payload: NotificationPayload): NotificationNavTarget {
  switch (payload.type) {
    case 'hunt_start':
    case 'correct_answer':
    case 'hunt_ending_soon':
      return { path: `/hunt/${payload.huntId}` };
    case 'leaderboard_outranked':
      return { path: `/hunt/${payload.huntId}` };
    default:
      return { path: '/(tabs)/hunts' };
  }
}
