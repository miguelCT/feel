/**
 * Liked-slot state backed by localStorage (`feel2026:likes:v1`).
 */

import { useCallback, useState } from 'react';
import { likeKey, loadLikes, persistLikes } from '../lib/likes';

export interface LikesApi {
  /** True when this stage/artist/start triple is liked. */
  isLiked: (stageName: string, artist: string, startTime: string) => boolean;
  /** Toggle like for a slot; returns the new liked state. */
  toggleLike: (stageName: string, artist: string, startTime: string) => boolean;
  /** Number of liked slots (for empty-state / badges). */
  count: number;
}

/** Hook owning the liked-set; updates sync to localStorage. */
export const useLikes = (): LikesApi => {
  const [likes, setLikes] = useState<Set<string>>(loadLikes);

  const isLiked = useCallback(
    (stageName: string, artist: string, startTime: string): boolean =>
      likes.has(likeKey(stageName, artist, startTime)),
    [likes],
  );

  const toggleLike = useCallback(
    (stageName: string, artist: string, startTime: string): boolean => {
      const key = likeKey(stageName, artist, startTime);
      let nextLiked = false;
      setLikes((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          nextLiked = false;
        } else {
          next.add(key);
          nextLiked = true;
        }
        persistLikes(next);
        return next;
      });
      return nextLiked;
    },
    [],
  );

  return { isLiked, toggleLike, count: likes.size };
};
