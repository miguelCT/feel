/**
 * Liked lineup slots, persisted in localStorage.
 *
 * Keys identify a concrete stage+artist+start triple so the same artist
 * playing different stages (or slots) can be liked independently.
 */

export const LIKES_STORAGE_KEY = 'feel2026:likes:v1';

/** Stable id for a liked slot. */
export const likeKey = (
  stageName: string,
  artist: string,
  startTime: string,
): string => `${stageName}|${artist}|${startTime}`;

const safeParse = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
};

/** Read liked slot keys from storage (empty when unavailable / corrupt). */
export const loadLikes = (): Set<string> => {
  if (typeof localStorage === 'undefined') return new Set();
  return new Set(safeParse(localStorage.getItem(LIKES_STORAGE_KEY)));
};

/** Persist the current liked-key set. */
export const persistLikes = (likes: ReadonlySet<string>): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify([...likes]));
  } catch {
    // Quota errors are non-fatal — likes just won't persist.
  }
};

/** Remove every stored like. Exposed via the teardown utility. */
export const clearLikes = (): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(LIKES_STORAGE_KEY);
};
