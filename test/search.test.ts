import { describe, expect, it } from 'vitest';
import { parseStages } from '../src/lib/lineup';
import {
  countMatchingSlots,
  filterStagesByQuery,
  findFirstMatch,
  firstMatchingStageIndex,
  normalizeSearch,
  slotMatches,
} from '../src/lib/search';
import type { RawStage } from '../src/types/lineup';

const raw: RawStage[] = [
  {
    stage: 'Strand',
    lineup: [
      {
        day: 'Thursday',
        artist: 'JEMSKI.',
        type: 'DJ',
        start_time: '2026-07-23T19:00:00',
        end_time: '2026-07-23T20:30:00',
        duration_minutes: 90,
      },
      {
        day: 'Friday',
        artist: 'SØREN',
        type: 'DJ',
        start_time: '2026-07-24T01:00:00',
        end_time: '2026-07-24T02:00:00',
        duration_minutes: 60,
      },
    ],
  },
  {
    stage: 'Xberg',
    lineup: [
      {
        day: 'Friday',
        artist: 'BRITTA ARNOLD',
        type: 'LIVE',
        start_time: '2026-07-24T15:00:00',
        end_time: '2026-07-24T16:00:00',
        duration_minutes: 60,
      },
    ],
  },
];

const stages = parseStages(raw);

describe('normalizeSearch', () => {
  it('strips diacritics and case', () => {
    expect(normalizeSearch('  SørEn ')).toBe('soren');
  });
});

describe('slotMatches', () => {
  const slot = stages[0]!.lineup[1]!;
  it('matches empty query', () => {
    expect(slotMatches(slot, '')).toBe(true);
  });
  it('matches diacritic-insensitive substrings', () => {
    expect(slotMatches(slot, 'soren')).toBe(true);
    expect(slotMatches(slot, 'SØR')).toBe(true);
  });
  it('rejects non-matches', () => {
    expect(slotMatches(slot, 'britta')).toBe(false);
  });
});

describe('filterStagesByQuery / count / first index', () => {
  it('returns all stages for an empty query', () => {
    expect(filterStagesByQuery(stages, '  ')).toEqual(stages);
    expect(countMatchingSlots(stages, '')).toBe(0);
  });

  it('keeps only stages with matches and filters their lineups', () => {
    const filtered = filterStagesByQuery(stages, 'arnold');
    expect(filtered.map((s) => s.name)).toEqual(['Xberg']);
    expect(filtered[0]!.lineup).toHaveLength(1);
    expect(countMatchingSlots(stages, 'arnold')).toBe(1);
    expect(firstMatchingStageIndex(stages, 'arnold')).toBe(1);
  });

  it('returns -1 / empty when nothing matches', () => {
    expect(filterStagesByQuery(stages, 'zzzz')).toEqual([]);
    expect(firstMatchingStageIndex(stages, 'zzzz')).toBe(-1);
    expect(countMatchingSlots(stages, 'zzzz')).toBe(0);
  });

  it('finds the first match in stage/lineup order', () => {
    expect(findFirstMatch(stages, '')).toBeNull();
    expect(findFirstMatch(stages, 'jem')).toMatchObject({
      stageIndex: 0,
      stageName: 'Strand',
      slot: { artist: 'JEMSKI.' },
    });
    expect(findFirstMatch(stages, 'britta')?.stageIndex).toBe(1);
  });
});
