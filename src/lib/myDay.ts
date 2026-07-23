/**
 * Aggregate liked slots into a vertical "My day" timeline.
 *
 * Timetable is stages × horizontal time; My day is the same idea rotated:
 * time runs top→bottom, and concurrent likes sit side-by-side in a row.
 */

import type { ArtistSlot, SlotStatus, Stage } from '../types/lineup';
import { likeKey } from './likes';
import { slotStatus } from './lineup';

/** A liked slot annotated with its stage and live status. */
export interface LikedEntry {
  key: string;
  stageName: string;
  slot: ArtistSlot;
  status: SlotStatus;
  countdownMs: number | null;
}

/** Concurrent likes that share the same start instant. */
export interface MyDayRow {
  startMs: number;
  entries: LikedEntry[];
}

/** Day bucket of time-ordered rows. */
export interface MyDayDay {
  day: string;
  rows: MyDayRow[];
  isPast: boolean;
}

/**
 * Collect liked slots across all stages, group by day then by startMs.
 * Within a concurrent row, entries keep stage-name order for stability.
 */
export const buildMyDay = (
  stages: Stage[],
  isLiked: (stageName: string, artist: string, startTime: string) => boolean,
  now: number,
): MyDayDay[] => {
  const entries: LikedEntry[] = [];

  for (const stage of stages) {
    for (const slot of stage.lineup) {
      if (!isLiked(stage.name, slot.artist, slot.start_time)) continue;
      const status = slotStatus(slot, now);
      entries.push({
        key: likeKey(stage.name, slot.artist, slot.start_time),
        stageName: stage.name,
        slot,
        status,
        countdownMs:
          status === 'active' ? Math.max(0, slot.endMs - now) : null,
      });
    }
  }

  entries.sort((a, b) => {
    if (a.slot.startMs !== b.slot.startMs) {
      return a.slot.startMs - b.slot.startMs;
    }
    return a.stageName.localeCompare(b.stageName);
  });

  const days: MyDayDay[] = [];
  let currentDay: MyDayDay | null = null;
  let currentRow: MyDayRow | null = null;

  for (const entry of entries) {
    if (!currentDay || currentDay.day !== entry.slot.day) {
      currentDay = { day: entry.slot.day, rows: [], isPast: true };
      days.push(currentDay);
      currentRow = null;
    }
    if (!currentRow || currentRow.startMs !== entry.slot.startMs) {
      currentRow = { startMs: entry.slot.startMs, entries: [] };
      currentDay.rows.push(currentRow);
    }
    if (entry.status !== 'ended') currentDay.isPast = false;
    currentRow.entries.push(entry);
  }

  return days;
};
