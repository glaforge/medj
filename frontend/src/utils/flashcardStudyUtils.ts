import { Flashcard } from '../types';

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
 * Picks `count` random flashcards without replacement from `pool`.
 * If `excludeIds` is provided (e.g., cards already studied in a previous sprint),
 * unseen cards are prioritized first before filling any remaining slots from the rest of the pool.
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

  if (excludeIds && excludeIds.size > 0 && excludeIds.size < pool.length) {
    const unseen = pool.filter(c => !excludeIds.has(c.id));
    if (unseen.length >= count) {
      return shuffleCopy(unseen).slice(0, count);
    }
    const seen = pool.filter(c => excludeIds.has(c.id));
    return [
      ...shuffleCopy(unseen),
      ...shuffleCopy(seen).slice(0, count - unseen.length)
    ];
  }

  // Partial Fisher-Yates for O(count) random selection without replacement
  const copy = [...pool];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
