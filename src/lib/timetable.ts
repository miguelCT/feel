/**
 * Layout helpers for the multi-stage horizontal timetable.
 * Pure functions so positioning can be unit-tested without the DOM.
 */

import type { ArtistSlot, Stage } from '../types/lineup';

/** Horizontal scale: pixels per minute of wall-clock time. */
export const PX_PER_MINUTE = 2;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface FestivalBounds {
  /** Range start, floored to the hour. */
  startMs: number;
  /** Range end, ceiled to the hour. */
  endMs: number;
}

/** Floor an instant to the start of its local wall-clock hour. */
const floorLocalHour = (ms: number): number => {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);
  return d.getTime();
};

/** Ceil an instant to the next local wall-clock hour (unchanged if exact). */
const ceilLocalHour = (ms: number): number => {
  const floored = floorLocalHour(ms);
  return floored === ms ? ms : floored + HOUR_MS;
};

/** Festival time span covering every slot, expanded to whole local hours. */
export const getFestivalBounds = (stages: Stage[]): FestivalBounds | null => {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const stage of stages) {
    for (const slot of stage.lineup) {
      if (slot.startMs < min) min = slot.startMs;
      if (slot.endMs > max) max = slot.endMs;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  return {
    startMs: floorLocalHour(min),
    endMs: ceilLocalHour(max),
  };
};

/** Pixel offset from the left edge of the timeline for an absolute instant. */
export const timeToX = (
  ms: number,
  rangeStartMs: number,
  pxPerMinute: number = PX_PER_MINUTE,
): number => ((ms - rangeStartMs) / MINUTE_MS) * pxPerMinute;

/** Total timeline width in pixels. */
export const timelineWidth = (
  bounds: FestivalBounds,
  pxPerMinute: number = PX_PER_MINUTE,
): number => timeToX(bounds.endMs, bounds.startMs, pxPerMinute);

export interface HourTick {
  ms: number;
  x: number;
  /** `HH:00` label. */
  label: string;
  /** Day label shown on the first tick of each calendar day (local). */
  dayLabel: string | null;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Hour markers across the festival range (inclusive start, exclusive end). */
export const getHourTicks = (
  bounds: FestivalBounds,
  pxPerMinute: number = PX_PER_MINUTE,
): HourTick[] => {
  const ticks: HourTick[] = [];
  let prevDayKey = '';
  for (let ms = bounds.startMs; ms < bounds.endMs; ms += HOUR_MS) {
    const d = new Date(ms);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const showDay = dayKey !== prevDayKey;
    prevDayKey = dayKey;
    ticks.push({
      ms,
      x: timeToX(ms, bounds.startMs, pxPerMinute),
      label: `${pad2(d.getHours())}:00`,
      dayLabel: showDay
        ? `${DAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`
        : null,
    });
  }
  return ticks;
};

export interface TimetableBlock {
  slot: ArtistSlot;
  left: number;
  width: number;
}

/** Positioned blocks for one stage row. */
export const getStageBlocks = (
  stage: Stage,
  rangeStartMs: number,
  pxPerMinute: number = PX_PER_MINUTE,
): TimetableBlock[] =>
  stage.lineup.map((slot) => {
    const left = timeToX(slot.startMs, rangeStartMs, pxPerMinute);
    const right = timeToX(slot.endMs, rangeStartMs, pxPerMinute);
    return {
      slot,
      left,
      width: Math.max(right - left, 4),
    };
  });
