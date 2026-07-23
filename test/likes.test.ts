import { beforeEach, describe, expect, it } from 'vitest';
import {
  LIKES_STORAGE_KEY,
  clearLikes,
  likeKey,
  loadLikes,
  persistLikes,
} from '../src/lib/likes';

describe('likes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a stable key from stage, artist, and start', () => {
    expect(likeKey('Main', 'EDE', '2026-07-23T16:00:00')).toBe(
      'Main|EDE|2026-07-23T16:00:00',
    );
  });

  it('returns an empty set when nothing is stored', () => {
    expect([...loadLikes()]).toEqual([]);
  });

  it('round-trips liked keys through localStorage', () => {
    persistLikes(new Set(['a|b|c', 'x|y|z']));
    expect(loadLikes()).toEqual(new Set(['a|b|c', 'x|y|z']));
    expect(JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) ?? '[]')).toEqual(
      expect.arrayContaining(['a|b|c', 'x|y|z']),
    );
  });

  it('clears stored likes', () => {
    persistLikes(new Set(['a|b|c']));
    clearLikes();
    expect(localStorage.getItem(LIKES_STORAGE_KEY)).toBeNull();
    expect([...loadLikes()]).toEqual([]);
  });

  it('survives corrupt storage without throwing', () => {
    localStorage.setItem(LIKES_STORAGE_KEY, '{not valid');
    expect([...loadLikes()]).toEqual([]);
  });

  it('ignores non-string entries in stored arrays', () => {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(['ok', 12, null]));
    expect([...loadLikes()]).toEqual(['ok']);
  });
});
