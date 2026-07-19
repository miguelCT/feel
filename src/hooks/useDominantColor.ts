/**
 * Cache-first dominant-colour pipeline for the active artist.
 *
 * Behaviour:
 *  1. On artist change, synchronously read the colour cache. A hit is applied
 *     on the same render — no flash, no async gap.
 *  2. On a miss, extract the colour from the local image once, persist it
 *     permanently, then apply it.
 *
 * The returned colour is intended to be written to a CSS custom property by the
 * caller (kept out of here so this hook stays presentation-agnostic).
 */

import { useEffect, useState } from 'react';
import type { ArtistColor } from '../lib/color';
import { extractColorFromUrl } from '../lib/color';
import { getCachedColor, setCachedColor } from '../lib/colorCache';
import { resolveArtistImage } from '../lib/slug';

/**
 * @param artist  Currently active artist name, or `null` when the stage is vacant.
 * @returns The artist's accent colour, or `null` while it is being computed.
 */
export const useDominantColor = (artist: string | null): ArtistColor | null => {
  // Lazy initialiser reads the cache before first paint for instant apply.
  const [color, setColor] = useState<ArtistColor | null>(() =>
    artist ? getCachedColor(artist) : null,
  );

  useEffect(() => {
    if (!artist) {
      setColor(null);
      return;
    }

    const cached = getCachedColor(artist);
    if (cached) {
      setColor(cached);
      return;
    }

    // Cache miss: compute once, persist, apply. Guard against races when the
    // active artist changes before extraction finishes.
    let cancelled = false;
    setColor(null);
    void extractColorFromUrl(resolveArtistImage(artist)).then((result) => {
      if (cancelled || !result) return;
      setCachedColor(artist, result);
      setColor(result);
    });

    return () => {
      cancelled = true;
    };
  }, [artist]);

  return color;
};
