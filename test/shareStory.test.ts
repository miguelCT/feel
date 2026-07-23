import { describe, expect, it } from 'vitest';
import { likeKey } from '../src/lib/likes';
import { parseStages } from '../src/lib/lineup';
import { buildMyDay } from '../src/lib/myDay';
import {
  flattenStoryLines,
  getStoryPalette,
  planStoryLayout,
  renderMyDayStory,
  STORY_HEIGHT,
  STORY_WIDTH,
  toStoryDays,
} from '../src/lib/shareStory';
import type { RawStage } from '../src/types/lineup';

const raw: RawStage[] = [
  {
    stage: 'Main',
    lineup: Array.from({ length: 8 }, (_, i) => ({
      day: i < 5 ? 'Thursday' : 'Friday',
      artist: `Artist ${i + 1}`,
      type: i % 3 === 0 ? ('LIVE' as const) : ('DJ' as const),
      start_time: `2026-07-${i < 5 ? '23' : '24'}T${String(14 + i).padStart(2, '0')}:00:00`,
      end_time: `2026-07-${i < 5 ? '23' : '24'}T${String(15 + i).padStart(2, '0')}:00:00`,
      duration_minutes: 60,
    })),
  },
  {
    stage: 'Beach',
    lineup: [
      {
        day: 'Thursday',
        artist: 'Concurrent',
        type: 'DJ',
        start_time: '2026-07-23T14:00:00',
        end_time: '2026-07-23T15:00:00',
        duration_minutes: 60,
      },
    ],
  },
];

const manySets = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    startMs: i * 60_000,
    artist: `Artist ${i}`,
    stageName: i % 2 === 0 ? 'Main' : 'Beach',
    live: i % 5 === 0,
  }));

describe('toStoryDays / flattenStoryLines', () => {
  it('groups chronological sets under day headers', () => {
    const stages = parseStages(raw);
    const liked = new Set(
      stages.flatMap((stage) =>
        stage.lineup.map((slot) =>
          likeKey(stage.name, slot.artist, slot.start_time),
        ),
      ),
    );
    const days = buildMyDay(
      stages,
      (stage, artist, start) => liked.has(likeKey(stage, artist, start)),
      new Date(2026, 6, 23, 12, 0, 0).getTime(),
    );
    const blocks = toStoryDays(days);
    expect(blocks.map((b) => b.day)).toEqual(['Thursday', 'Friday']);
    expect(blocks[0]!.sets.map((s) => s.artist)).toEqual([
      'Concurrent',
      'Artist 1',
      'Artist 2',
      'Artist 3',
      'Artist 4',
      'Artist 5',
    ]);

    const lines = flattenStoryLines(days);
    expect(lines[0]).toEqual({ kind: 'day', day: 'Thursday' });
  });
});

describe('planStoryLayout', () => {
  it('keeps a single column for short lists', () => {
    const plan = planStoryLayout([{ day: 'Friday', sets: manySets(4) }]);
    expect(plan.metrics.columns).toBe(1);
    expect(plan.overflow).toBe(0);
    expect(plan.days[0]!.sets).toHaveLength(4);
  });

  it('adds columns so a large weekend still fits with no overflow', () => {
    const plan = planStoryLayout([
      { day: 'Thursday', sets: manySets(40) },
      { day: 'Friday', sets: manySets(40) },
      { day: 'Saturday', sets: manySets(40) },
    ]);
    expect(plan.metrics.columns).toBeGreaterThanOrEqual(2);
    expect(plan.overflow).toBe(0);
    expect(plan.days.reduce((n, d) => n + d.sets.length, 0)).toBe(120);
  });

  it('reports overflow only when even densest packing cannot fit', () => {
    const plan = planStoryLayout(
      [{ day: 'Thursday', sets: manySets(20) }],
      80,
    );
    expect(plan.overflow).toBeGreaterThan(0);
    expect(plan.days.reduce((n, d) => n + d.sets.length, 0)).toBeLessThan(20);
  });
});

describe('getStoryPalette', () => {
  it('returns distinct accents per theme', () => {
    expect(getStoryPalette('seaside').accent).toBe('#f6a9a0');
    expect(getStoryPalette('neon').accent).toBe('#24e0cf');
    expect(getStoryPalette('brutalist').accent).toBe('#2563eb');
    expect(getStoryPalette('neon').glow).not.toBeNull();
    expect(getStoryPalette('brutalist').showStars).toBe(false);
  });
});

describe('renderMyDayStory', () => {
  it('returns a PNG blob at story dimensions for each theme', async () => {
    const stages = parseStages(raw);
    const days = buildMyDay(
      stages,
      (_stage, artist) => artist === 'Artist 1' || artist === 'Concurrent',
      new Date(2026, 6, 23, 12, 0, 0).getTime(),
    );

    const proto = HTMLCanvasElement.prototype;
    const originalGetContext = proto.getContext;
    const originalToBlob = proto.toBlob;
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineCap: 'round',
      font: '',
      textAlign: 'left',
      textBaseline: 'middle',
      globalAlpha: 1,
      createLinearGradient: () => ({ addColorStop: () => undefined }),
      createRadialGradient: () => ({ addColorStop: () => undefined }),
      fillRect: () => undefined,
      beginPath: () => undefined,
      arc: () => undefined,
      fill: () => undefined,
      moveTo: () => undefined,
      bezierCurveTo: () => undefined,
      stroke: () => undefined,
      save: () => undefined,
      restore: () => undefined,
      fillText: () => undefined,
      measureText: (text: string) => ({ width: text.length * 12 }),
    };
    proto.getContext = (() => ctx) as unknown as typeof proto.getContext;
    proto.toBlob = function toBlob(cb, type = 'image/png') {
      cb(new Blob(['fake-png'], { type }));
    };

    try {
      for (const theme of ['seaside', 'neon', 'brutalist'] as const) {
        const blob = await renderMyDayStory(days, theme);
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/png');
      }
      expect(STORY_WIDTH / STORY_HEIGHT).toBeCloseTo(9 / 16);
    } finally {
      proto.getContext = originalGetContext;
      proto.toBlob = originalToBlob;
    }
  });
});
