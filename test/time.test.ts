import { describe, expect, it } from 'vitest';
import { formatCountdown, parseLocalIso } from '../src/lib/time';

describe('parseLocalIso', () => {
  it('parses a naive ISO string as local wall-clock time', () => {
    const ms = parseLocalIso('2025-07-11T20:00:00');
    const d = new Date(ms);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(6); // July (0-based)
    expect(d.getDate()).toBe(11);
    expect(d.getHours()).toBe(20);
    expect(d.getMinutes()).toBe(0);
  });

  it('treats a past-midnight time as the next calendar day chronologically', () => {
    const before = parseLocalIso('2025-07-11T23:30:00');
    const after = parseLocalIso('2025-07-12T01:00:00');
    expect(after).toBeGreaterThan(before);
    // exactly 90 minutes apart
    expect(after - before).toBe(90 * 60 * 1000);
  });

  it('throws on malformed input', () => {
    expect(() => parseLocalIso('not-a-date')).toThrow();
  });
});

describe('formatCountdown', () => {
  it('formats hours, minutes and seconds with a leading minus', () => {
    const ms = (45 * 60 + 12) * 1000;
    expect(formatCountdown(ms)).toBe('-00:45:12');
  });

  it('clamps non-positive values to -00:00:00', () => {
    expect(formatCountdown(0)).toBe('-00:00:00');
    expect(formatCountdown(-5000)).toBe('-00:00:00');
  });

  it('keeps hours beyond a single day', () => {
    const ms = (26 * 3600 + 1 * 60 + 5) * 1000;
    expect(formatCountdown(ms)).toBe('-26:01:05');
  });
});
