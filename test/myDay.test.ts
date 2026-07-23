import { describe, expect, it } from 'vitest';
import { likeKey } from '../src/lib/likes';
import { parseStages } from '../src/lib/lineup';
import { buildMyDay } from '../src/lib/myDay';
import type { RawStage } from '../src/types/lineup';

const raw: RawStage[] = [
  {
    stage: 'Main',
    lineup: [
      {
        day: 'Thursday',
        artist: 'Alpha',
        type: 'DJ',
        start_time: '2026-07-23T16:00:00',
        end_time: '2026-07-23T17:00:00',
        duration_minutes: 60,
      },
      {
        day: 'Thursday',
        artist: 'Gamma',
        type: 'LIVE',
        start_time: '2026-07-23T18:00:00',
        end_time: '2026-07-23T19:00:00',
        duration_minutes: 60,
      },
    ],
  },
  {
    stage: 'Beach',
    lineup: [
      {
        day: 'Thursday',
        artist: 'Beta',
        type: 'DJ',
        start_time: '2026-07-23T16:00:00',
        end_time: '2026-07-23T17:30:00',
        duration_minutes: 90,
      },
      {
        day: 'Friday',
        artist: 'Delta',
        type: 'DJ',
        start_time: '2026-07-24T14:00:00',
        end_time: '2026-07-24T15:00:00',
        duration_minutes: 60,
      },
    ],
  },
];

describe('buildMyDay', () => {
  const stages = parseStages(raw);
  const now = new Date(2026, 6, 23, 15, 0, 0).getTime();

  it('returns empty when nothing is liked', () => {
    expect(buildMyDay(stages, () => false, now)).toEqual([]);
  });

  it('orders liked entries by start time and stacks concurrent sets', () => {
    const liked = new Set([
      likeKey('Beach', 'Beta', '2026-07-23T16:00:00'),
      likeKey('Main', 'Alpha', '2026-07-23T16:00:00'),
      likeKey('Main', 'Gamma', '2026-07-23T18:00:00'),
      likeKey('Beach', 'Delta', '2026-07-24T14:00:00'),
    ]);
    const isLiked = (stage: string, artist: string, start: string) =>
      liked.has(likeKey(stage, artist, start));

    const days = buildMyDay(stages, isLiked, now);
    expect(days.map((d) => d.day)).toEqual(['Thursday', 'Friday']);

    const thursday = days[0]!;
    expect(thursday.rows).toHaveLength(2);
    expect(thursday.rows[0]!.entries.map((e) => e.slot.artist)).toEqual([
      'Beta',
      'Alpha',
    ]);
    // Concurrent row is sorted by stage name (Beach before Main).
    expect(thursday.rows[0]!.entries.map((e) => e.stageName)).toEqual([
      'Beach',
      'Main',
    ]);
    expect(thursday.rows[1]!.entries.map((e) => e.slot.artist)).toEqual([
      'Gamma',
    ]);
    expect(days[1]!.rows[0]!.entries[0]!.slot.artist).toBe('Delta');
  });

  it('marks past days and active countdown', () => {
    const liked = new Set([
      likeKey('Main', 'Alpha', '2026-07-23T16:00:00'),
      likeKey('Beach', 'Delta', '2026-07-24T14:00:00'),
    ]);
    const isLiked = (stage: string, artist: string, start: string) =>
      liked.has(likeKey(stage, artist, start));

    // Mid-Alpha set.
    const during = new Date(2026, 6, 23, 16, 30, 0).getTime();
    const days = buildMyDay(stages, isLiked, during);
    expect(days[0]!.isPast).toBe(false);
    expect(days[0]!.rows[0]!.entries[0]!.status).toBe('active');
    expect(days[0]!.rows[0]!.entries[0]!.countdownMs).toBe(
      new Date(2026, 6, 23, 17, 0, 0).getTime() - during,
    );

    // After Friday set ends.
    const after = new Date(2026, 6, 24, 16, 0, 0).getTime();
    const past = buildMyDay(stages, isLiked, after);
    expect(past.every((d) => d.isPast)).toBe(true);
  });
});
