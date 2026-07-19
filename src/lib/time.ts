/**
 * Time-math utilities.
 *
 * The lineup uses timezone-naive ISO strings. `parseLocalIso` builds a Date
 * from the individual components so the value is *always* interpreted in the
 * device's local timezone, independent of any engine-specific parsing quirks.
 * Working in epoch milliseconds keeps every comparison strictly chronological,
 * which is what makes past-midnight programming "just work".
 */

const ISO_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * Parse a timezone-naive ISO-8601 string as local wall-clock time and return
 * epoch milliseconds. Throws on malformed input so bad data fails loudly.
 */
export const parseLocalIso = (iso: string): number => {
  const m = ISO_LOCAL_RE.exec(iso);
  if (!m) {
    throw new Error(`Invalid ISO datetime: "${iso}"`);
  }
  const [, y, mo, d, h, min, s] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(min),
    s ? Number(s) : 0,
  ).getTime();
};

/** Current time as epoch milliseconds. Wrapped so tests can mock a single seam. */
export const nowMs = (): number => Date.now();

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Format a remaining duration as the countdown string used in the UI, e.g.
 * `-00:45:12`. Values <= 0 clamp to `-00:00:00`. Durations >= 100 hours keep
 * all their hour digits rather than truncating.
 */
export const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `-${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
};

/** Format an epoch-ms instant as local wall-clock `HH:MM`. */
export const formatClock = (ms: number): string => {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
