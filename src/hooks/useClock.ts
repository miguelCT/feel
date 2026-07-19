/**
 * A single shared 1-second clock.
 *
 * One interval drives the whole app so every countdown ticks in lockstep and
 * we never spin up a timer per stage. Returns the current epoch-ms, refreshed
 * once per second.
 */

import { useEffect, useState } from 'react';
import { getClockOffset } from '../lib/devClock';
import { nowMs } from '../lib/time';

/** Real clock plus any dev-only time-travel offset (0 in production). */
const currentNow = (): number => nowMs() + getClockOffset();

export const useClock = (intervalMs = 1000): number => {
  const [now, setNow] = useState<number>(() => currentNow());

  useEffect(() => {
    // Sync immediately in case mount happened mid-tick, then tick on interval.
    setNow(currentNow());
    const id = window.setInterval(() => setNow(currentNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
};
