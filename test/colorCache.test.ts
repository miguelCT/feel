import { beforeEach, describe, expect, it } from 'vitest';
import {
  COLOR_CACHE_KEY,
  clearColorCache,
  getCachedColor,
  setCachedColor,
} from '../src/lib/colorCache';

describe('colorCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null on a miss', () => {
    expect(getCachedColor('Unknown Artist')).toBeNull();
  });

  it('stores and retrieves a colour keyed by artist slug', () => {
    const color = { hex: '#ff0055', rgb: [255, 0, 85] as [number, number, number] };
    setCachedColor('Part Time Killer', color);
    expect(getCachedColor('Part Time Killer')).toEqual(color);
    // Slug-insensitive to casing/spacing.
    expect(getCachedColor('PART TIME KILLER')).toEqual(color);
  });

  it('clears the whole cache', () => {
    setCachedColor('EDE', { hex: '#123456', rgb: [18, 52, 86] });
    clearColorCache();
    expect(localStorage.getItem(COLOR_CACHE_KEY)).toBeNull();
    expect(getCachedColor('EDE')).toBeNull();
  });

  it('survives corrupt storage without throwing', () => {
    localStorage.setItem(COLOR_CACHE_KEY, '{not valid json');
    expect(getCachedColor('EDE')).toBeNull();
  });
});
