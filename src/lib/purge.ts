/**
 * Post-festival teardown utilities.
 *
 * Image binaries are owned by the PWA service worker (precache); this only
 * deals with the app's own colour metadata. Call `purgeFestivalCache()`
 * manually once the entire weekend (afterhours included) has wrapped up.
 */

import { clearColorCache } from './colorCache';
import { clearLikes } from './likes';

export interface PurgeResult {
  colorCacheCleared: boolean;
  likesCleared: boolean;
  serviceWorkerCachesCleared: number;
}

/**
 * Flush all client-side festival metadata. Also best-effort clears the
 * CacheStorage entries created by the service worker so a fresh install can
 * start clean next year.
 */
export const purgeFestivalCache = async (): Promise<PurgeResult> => {
  clearColorCache();
  clearLikes();

  let serviceWorkerCachesCleared = 0;
  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      serviceWorkerCachesCleared = keys.length;
    } catch {
      // Ignore — CacheStorage may be unavailable or blocked.
    }
  }

  return {
    colorCacheCleared: true,
    likesCleared: true,
    serviceWorkerCachesCleared,
  };
};
