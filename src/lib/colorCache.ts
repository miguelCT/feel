/**
 * Zero-latency metadata cache for extracted artist colours.
 *
 * Backed by localStorage under a single namespaced key holding a
 * `{ [artistSlug]: ArtistColor }` map. localStorage is synchronous, so a cached
 * colour can be applied on the very first render with no flash. Entries persist
 * for the whole festival weekend (no TTL / eviction); use `purgeColorCache`
 * from `purge.ts` to flush everything once the weekend is over.
 */

import type { ArtistColor } from './color';
import { slugify } from './slug';

export const COLOR_CACHE_KEY = 'feel2026:artist-colors:v1';

type ColorMap = Record<string, ArtistColor>;

const safeParse = (raw: string | null): ColorMap => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ColorMap) : {};
  } catch {
    return {};
  }
};

const readMap = (): ColorMap => {
  if (typeof localStorage === 'undefined') return {};
  return safeParse(localStorage.getItem(COLOR_CACHE_KEY));
};

const writeMap = (map: ColorMap): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(COLOR_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Quota errors are non-fatal — the colour will just be recomputed later.
  }
};

/** Read a cached colour for an artist, or `null` on a miss. */
export const getCachedColor = (artist: string): ArtistColor | null =>
  readMap()[slugify(artist)] ?? null;

/** Persist a colour for an artist. */
export const setCachedColor = (artist: string, color: ArtistColor): void => {
  const map = readMap();
  map[slugify(artist)] = color;
  writeMap(map);
};

/** Remove the entire colour cache. Exposed via the teardown utility. */
export const clearColorCache = (): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(COLOR_CACHE_KEY);
};
