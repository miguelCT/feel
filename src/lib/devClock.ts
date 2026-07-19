/**
 * Dev-only "time travel".
 *
 * Lets you preview the live session UI against past/future lineup data without
 * touching `lineup.json`. Completely gated behind `import.meta.env.DEV`, so the
 * whole module tree-shakes to `return 0` in production builds.
 *
 * Usage (dev server only), via URL query param:
 *   ?now=2025-07-12T02:00:00   → pretend it's that moment; the clock then keeps
 *                                ticking forward in real time from there.
 *   ?now=off                   → clear the override and return to real time.
 *
 * The override is stored as an *offset* (ms to add to the real clock) in
 * sessionStorage, so countdowns advance naturally and it survives HMR reloads.
 */

import { parseLocalIso } from './time';

const STORAGE_KEY = 'feel2026:dev-clock-offset';

/**
 * Process the `?now=` query param once at startup. Call from `main.tsx` before
 * the first render. No-op in production.
 */
export const initDevClock = (): void => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;

  const param = new URLSearchParams(window.location.search).get('now');
  if (param === null) return;

  if (param === 'off') {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  try {
    const offset = parseLocalIso(param) - Date.now();
    sessionStorage.setItem(STORAGE_KEY, String(offset));
  } catch {
    // Ignore malformed override; real time is used.
  }
};

/**
 * Milliseconds to add to `Date.now()`. Always 0 in production, and 0 in dev
 * unless a time-travel override is active.
 */
export const getClockOffset = (): number => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 0;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) || 0 : 0;
};

/** Whether a dev time override is currently active (for the preview banner). */
export const isTimeTravelActive = (): boolean =>
  import.meta.env.DEV && getClockOffset() !== 0;
