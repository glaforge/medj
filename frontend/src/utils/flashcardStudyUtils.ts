import { Flashcard, FlashcardReviewRating } from '../types';

export const FLASHCARD_SEEN_HISTORY_KEY = 'medj_flashcard_seen_history';
export const RECENT_SEEN_COOLDOWN_DAYS = 7;

const RECENT_COOLDOWN_MS = RECENT_SEEN_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const SERVER_SESSION_BUCKET_MS = 2 * 60 * 1000; // 2-minute bucket for server-side timestamps

export interface FlashcardSeenEntry {
  seenAt: number;
  rating?: FlashcardReviewRating;
  resetAt?: number;
}

export type FlashcardSeenHistoryMap = Record<string, FlashcardSeenEntry>;

export interface FlashcardPoolSeenStats {
  totalCount: number;
  unseenCount: number;
  olderSeenCount: number;
  recentlySeenCount: number;
  seenTotalCount: number;
}

/**
 * Shuffles an array copy uniformly using the Fisher-Yates algorithm.
 */
function shuffleCopy<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Safely parses ISO strings, epoch numbers, or Jackson LocalDateTime arrays into epoch ms.
 */
export function parseFlashcardTimestamp(raw: unknown): number {
  if (!raw) return 0;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (Array.isArray(raw) && raw.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = raw.map(Number);
    if ([year, month, day].every(Number.isFinite)) {
      return new Date(year, month - 1, day, hour, minute, second).getTime();
    }
  }
  return 0;
}

export function readFlashcardSeenHistory(): FlashcardSeenHistoryMap {
  try {
    const raw = localStorage.getItem(FLASHCARD_SEEN_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as FlashcardSeenHistoryMap;
    }
  } catch {
    // Ignore localStorage / JSON parse errors
  }
  return {};
}

function writeFlashcardSeenHistory(history: FlashcardSeenHistoryMap): void {
  try {
    localStorage.setItem(FLASHCARD_SEEN_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

/**
 * Records that a flashcard was studied during a session so future sessions across days
 * avoid drawing recently seen cards first.
 */
export function recordFlashcardSeen(
  cardId: string,
  rating?: FlashcardReviewRating,
  sessionTimestamp: number = Date.now()
): void {
  if (!cardId) return;
  const history = readFlashcardSeenHistory();
  const prev = history[cardId];
  history[cardId] = {
    seenAt: sessionTimestamp,
    rating: rating ?? prev?.rating,
    resetAt: prev?.resetAt
  };
  writeFlashcardSeenHistory(history);
}

/**
 * Resets the seen history for the provided card IDs (or all stored cards if omitted).
 */
export function resetFlashcardSeenHistory(cardIds?: string[]): void {
  const now = Date.now();
  if (!cardIds || cardIds.length === 0) {
    writeFlashcardSeenHistory({});
    return;
  }
  const history = readFlashcardSeenHistory();
  for (const id of cardIds) {
    if (!id) continue;
    history[id] = {
      seenAt: 0,
      resetAt: now
    };
  }
  writeFlashcardSeenHistory(history);
}

/**
 * Computes the effective timestamp (ms) when a card was last seen, combining backend
 * `card.lastReviewedAt` (cross-device Firestore state) and local browser history.
 * Returns `0` if the card has never been seen (or was reset since its last review).
 */
export function getEffectiveLastSeenTimestamp(
  card: Flashcard,
  history?: FlashcardSeenHistoryMap
): number {
  const map = history ?? readFlashcardSeenHistory();
  const entry = map[card.id];
  const rawServerTs = parseFlashcardTimestamp(card.lastReviewedAt);
  const bucketedServerTs =
    rawServerTs > 0
      ? Math.floor(rawServerTs / SERVER_SESSION_BUCKET_MS) * SERVER_SESSION_BUCKET_MS
      : 0;
  const localSeenTs = entry?.seenAt ?? 0;

  const validServerTs = entry?.resetAt && rawServerTs <= entry.resetAt ? 0 : bucketedServerTs;
  const validLocalTs = entry?.resetAt && localSeenTs <= entry.resetAt ? 0 : localSeenTs;

  return Math.max(validServerTs, validLocalTs);
}

export function getFlashcardPoolSeenStats(
  pool: Flashcard[],
  now: number = Date.now()
): FlashcardPoolSeenStats {
  const history = readFlashcardSeenHistory();
  let unseenCount = 0;
  let olderSeenCount = 0;
  let recentlySeenCount = 0;

  for (const card of pool) {
    const ts = getEffectiveLastSeenTimestamp(card, history);
    if (ts <= 0) {
      unseenCount++;
    } else if (now - ts > RECENT_COOLDOWN_MS) {
      olderSeenCount++;
    } else {
      recentlySeenCount++;
    }
  }

  return {
    totalCount: pool.length,
    unseenCount,
    olderSeenCount,
    recentlySeenCount,
    seenTotalCount: olderSeenCount + recentlySeenCount
  };
}

function ratingPriority(rating?: FlashcardReviewRating): number {
  switch (rating) {
    case 'AGAIN':
      return 0;
    case 'HARD':
      return 1;
    case 'GOOD':
      return 2;
    case 'EASY':
      return 3;
    default:
      return 2;
  }
}

/**
 * Orders a pool into 3 pedagogical priority tiers:
 * 1. Unseen cards (never seen or reset) — shuffled uniformly.
 * 2. Older cards (seen more than `RECENT_SEEN_COOLDOWN_DAYS` ago) — shuffled uniformly so old series remix.
 * 3. Recently seen cards (<= `RECENT_SEEN_COOLDOWN_DAYS`) — ordered from oldest session to newest session,
 *    shuffled within each session (prioritizing AGAIN/HARD on ties).
 */
function orderPoolBySeenPriority(
  pool: Flashcard[],
  history: FlashcardSeenHistoryMap,
  now: number
): Flashcard[] {
  const tier0Unseen: Flashcard[] = [];
  const tier1Older: Flashcard[] = [];
  const tier2RecentGroups = new Map<number, Flashcard[]>();

  for (const card of pool) {
    const ts = getEffectiveLastSeenTimestamp(card, history);
    if (ts <= 0) {
      tier0Unseen.push(card);
    } else if (now - ts > RECENT_COOLDOWN_MS) {
      tier1Older.push(card);
    } else {
      const group = tier2RecentGroups.get(ts);
      if (group) {
        group.push(card);
      } else {
        tier2RecentGroups.set(ts, [card]);
      }
    }
  }

  const sortedRecentTimestamps = Array.from(tier2RecentGroups.keys()).sort((a, b) => a - b);
  const tier2RecentOrdered: Flashcard[] = [];
  for (const ts of sortedRecentTimestamps) {
    const groupCards = shuffleCopy(tier2RecentGroups.get(ts)!);
    groupCards.sort(
      (a, b) => ratingPriority(history[a.id]?.rating) - ratingPriority(history[b.id]?.rating)
    );
    tier2RecentOrdered.push(...groupCards);
  }

  return [
    ...shuffleCopy(tier0Unseen),
    ...shuffleCopy(tier1Older),
    ...tier2RecentOrdered
  ];
}

/**
 * Picks `count` flashcards without replacement from `pool`, prioritizing:
 * 1. Cards never seen (across days/sessions via persistent history + backend `lastReviewedAt`),
 * 2. Cards seen more than 7 days ago (shuffled fresh),
 * 3. Cards seen recently, ordered from oldest session to most recent session.
 * `excludeIds` additionally deprioritizes cards drawn in the immediate consecutive sprint chain.
 */
export function pickRandomFlashcards(
  pool: Flashcard[],
  count: number,
  excludeIds?: Set<string>
): Flashcard[] {
  if (!pool || pool.length === 0 || count <= 0) {
    return [];
  }
  if (count >= pool.length) {
    return shuffleCopy(pool);
  }

  const history = readFlashcardSeenHistory();
  const now = Date.now();

  if (excludeIds && excludeIds.size > 0 && excludeIds.size < pool.length) {
    const nonExcluded = pool.filter(c => !excludeIds.has(c.id));
    const excluded = pool.filter(c => excludeIds.has(c.id));
    const prioritized = [
      ...orderPoolBySeenPriority(nonExcluded, history, now),
      ...orderPoolBySeenPriority(excluded, history, now)
    ];
    return shuffleCopy(prioritized.slice(0, count));
  }

  const prioritized = orderPoolBySeenPriority(pool, history, now);
  return shuffleCopy(prioritized.slice(0, count));
}
