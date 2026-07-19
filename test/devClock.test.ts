import { afterEach, describe, expect, it } from 'vitest';
import { getClockOffset, isTimeTravelActive } from '../src/lib/devClock';

const STORAGE_KEY = 'feel2026:dev-clock-offset';

describe('devClock offset (dev mode)', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('returns 0 offset when no override is stored', () => {
    expect(getClockOffset()).toBe(0);
    expect(isTimeTravelActive()).toBe(false);
  });

  it('reads a stored offset and reports time travel active', () => {
    sessionStorage.setItem(STORAGE_KEY, String(60_000));
    expect(getClockOffset()).toBe(60_000);
    expect(isTimeTravelActive()).toBe(true);
  });

  it('treats a corrupt stored value as no offset', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-a-number');
    expect(getClockOffset()).toBe(0);
  });
});
