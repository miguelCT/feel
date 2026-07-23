import { describe, expect, it } from 'vitest';
import { parseStages } from '../src/lib/lineup';
import {
  getFestivalBounds,
  getHourTicks,
  getStageBlocks,
  timeToX,
  timelineWidth,
  PX_PER_MINUTE,
} from '../src/lib/timetable';
import type { RawStage } from '../src/types/lineup';

const raw: RawStage[] = [
  {
    stage: 'Strand',
    lineup: [
      {
        day: 'Thursday',
        artist: 'A',
        type: 'DJ',
        start_time: '2026-07-23T19:00:00',
        end_time: '2026-07-23T20:30:00',
        duration_minutes: 90,
      },
      {
        day: 'Thursday',
        artist: 'B',
        type: 'DJ',
        start_time: '2026-07-23T20:30:00',
        end_time: '2026-07-23T22:00:00',
        duration_minutes: 90,
      },
    ],
  },
  {
    stage: 'Xberg',
    lineup: [
      {
        day: 'Friday',
        artist: 'C',
        type: 'LIVE',
        start_time: '2026-07-24T01:00:00',
        end_time: '2026-07-24T02:00:00',
        duration_minutes: 60,
      },
    ],
  },
];

const stages = parseStages(raw);
const at = (iso: string) => new Date(iso).getTime();

describe('getFestivalBounds', () => {
  it('floors/ceils to local hour boundaries spanning all stages', () => {
    const bounds = getFestivalBounds(stages);
    expect(bounds).not.toBeNull();
    expect(bounds!.startMs).toBe(at('2026-07-23T19:00:00'));
    expect(bounds!.endMs).toBe(at('2026-07-24T02:00:00'));
  });

  it('returns null for an empty lineup', () => {
    expect(getFestivalBounds([])).toBeNull();
  });
});

describe('timeToX / timelineWidth', () => {
  it('maps minutes to pixels at PX_PER_MINUTE', () => {
    const start = at('2026-07-23T19:00:00');
    expect(timeToX(at('2026-07-23T20:00:00'), start)).toBe(60 * PX_PER_MINUTE);
    expect(timeToX(at('2026-07-23T19:30:00'), start)).toBe(30 * PX_PER_MINUTE);
  });

  it('computes total width from bounds', () => {
    const bounds = getFestivalBounds(stages)!;
    // 19:00 → 02:00 = 7 hours
    expect(timelineWidth(bounds)).toBe(7 * 60 * PX_PER_MINUTE);
  });
});

describe('getHourTicks', () => {
  it('emits an hour tick per hour and a day label on day changes', () => {
    const bounds = getFestivalBounds(stages)!;
    const ticks = getHourTicks(bounds);
    expect(ticks).toHaveLength(7);
    expect(ticks[0]!.label).toBe('19:00');
    expect(ticks[0]!.dayLabel).toMatch(/Jul 23/);
    const midnight = ticks.find((t) => t.label === '00:00');
    expect(midnight?.dayLabel).toMatch(/Jul 24/);
  });
});

describe('getStageBlocks', () => {
  it('positions blocks by start/duration', () => {
    const bounds = getFestivalBounds(stages)!;
    const blocks = getStageBlocks(stages[0]!, bounds.startMs);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.left).toBe(0);
    expect(blocks[0]!.width).toBe(90 * PX_PER_MINUTE);
    expect(blocks[1]!.left).toBe(90 * PX_PER_MINUTE);
    expect(blocks[1]!.slot.artist).toBe('B');
  });
});
