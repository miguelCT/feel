import { describe, expect, it } from 'vitest';
import { likeKey } from '../src/lib/likes';
import { parseStages } from '../src/lib/lineup';
import { buildMyDay } from '../src/lib/myDay';
import {
  fitStoryLines,
  flattenStoryLines,
  renderMyDayStory,
  STORY_HEIGHT,
  STORY_WIDTH,
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

describe('flattenStoryLines', () => {
  it('emits day headers then sets in time order', () => {
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
    const lines = flattenStoryLines(days);

    expect(lines[0]).toEqual({ kind: 'day', day: 'Thursday' });
    expect(lines.filter((l) => l.kind === 'day').map((l) => l.day)).toEqual([
      'Thursday',
      'Friday',
    ]);
    // Concurrent 14:00 sets: Beach before Main.
    const firstSets = lines.filter((l) => l.kind === 'set').slice(0, 2);
    expect(firstSets.map((l) => (l.kind === 'set' ? l.artist : ''))).toEqual([
      'Concurrent',
      'Artist 1',
    ]);
  });
});

describe('fitStoryLines', () => {
  it('marks overflow when the content band is too short', () => {
    const lines = [
      { kind: 'day' as const, day: 'Thursday' },
      ...Array.from({ length: 20 }, (_, i) => ({
        kind: 'set' as const,
        startMs: i,
        artist: `A${i}`,
        stageName: 'Main',
        live: false,
      })),
    ];
    const fit = fitStoryLines(lines, 220);
    expect(fit.visible.length).toBeGreaterThan(0);
    expect(fit.visible.length).toBeLessThan(lines.length);
    expect(fit.overflow).toBeGreaterThan(0);
    expect(fit.visible[fit.visible.length - 1]?.kind).toBe('set');
  });

  it('uses compact layout for dense lists', () => {
    const lines = Array.from({ length: 16 }, (_, i) => ({
      kind: 'set' as const,
      startMs: i,
      artist: `A${i}`,
      stageName: 'Main',
      live: false,
    }));
    expect(fitStoryLines(lines, 2000).compact).toBe(true);
    expect(fitStoryLines(lines.slice(0, 5), 2000).compact).toBe(false);
  });

  it('fits everything when there is enough room', () => {
    const lines = [
      { kind: 'day' as const, day: 'Friday' },
      {
        kind: 'set' as const,
        startMs: 1,
        artist: 'Solo',
        stageName: 'Beach',
        live: true,
      },
    ];
    const fit = fitStoryLines(lines, 2000);
    expect(fit.visible).toEqual(lines);
    expect(fit.overflow).toBe(0);
  });
});

describe('renderMyDayStory', () => {
  it('returns a PNG blob at story dimensions', async () => {
    const stages = parseStages(raw);
    const days = buildMyDay(
      stages,
      (_stage, artist) => artist === 'Artist 1' || artist === 'Concurrent',
      new Date(2026, 6, 23, 12, 0, 0).getTime(),
    );

    // jsdom has no real canvas — stub enough of the 2d API for the renderer.
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
      createLinearGradient: () => ({ addColorStop: () => undefined }),
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
      const blob = await renderMyDayStory(days);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(STORY_WIDTH / STORY_HEIGHT).toBeCloseTo(9 / 16);
    } finally {
      proto.getContext = originalGetContext;
      proto.toBlob = originalToBlob;
    }
  });
});
