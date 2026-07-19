/**
 * Pure lineup engine: parsing raw JSON into sorted stages and deriving the
 * runtime state (active artist, countdown, "up next") for any instant.
 *
 * Everything here is side-effect free and deterministic given `nowMs`, which
 * makes it trivial to unit test with a mocked clock.
 */

import type {
  AgendaDay,
  ArtistSlot,
  RawArtistSlot,
  RawStage,
  SlotStatus,
  Stage,
  StageState,
} from '../types/lineup';
import { parseLocalIso } from './time';

/** Enrich a raw slot with parsed epoch-ms bounds. */
export const parseSlot = (raw: RawArtistSlot): ArtistSlot => ({
  ...raw,
  startMs: parseLocalIso(raw.start_time),
  endMs: parseLocalIso(raw.end_time),
});

/** Chronological comparator by start time. */
export const byStart = (a: ArtistSlot, b: ArtistSlot): number =>
  a.startMs - b.startMs;

/** Parse and sort one raw stage. */
export const parseStage = (raw: RawStage): Stage => ({
  name: raw.stage,
  lineup: raw.lineup.map(parseSlot).sort(byStart),
});

/** Parse and sort a whole lineup document. */
export const parseStages = (raws: RawStage[]): Stage[] => raws.map(parseStage);

/** True once a slot has fully finished. */
export const isEnded = (slot: ArtistSlot, now: number): boolean =>
  now >= slot.endMs;

/** True while a slot is on stage: start inclusive, end exclusive. */
export const isActive = (slot: ArtistSlot, now: number): boolean =>
  now >= slot.startMs && now < slot.endMs;

/**
 * The immediate next slot that has not yet ended and has not yet started.
 * Assumes `lineup` is sorted by start time (as produced by `parseStage`).
 */
export const getUpNext = (stage: Stage, now: number): ArtistSlot | null => {
  for (const slot of stage.lineup) {
    if (slot.startMs > now) return slot;
  }
  return null;
};

/**
 * Compute the full runtime state for a stage at `now`.
 * Assumes `stage.lineup` is sorted by start time.
 */
export const getStageState = (stage: Stage, now: number): StageState => {
  const current = stage.lineup.find((slot) => isActive(slot, now)) ?? null;
  const upNext = getUpNext(stage, now);

  if (current) {
    return {
      status: 'active',
      stage: stage.name,
      current,
      countdownMs: Math.max(0, current.endMs - now),
      upNext,
    };
  }

  return {
    status: 'vacant',
    stage: stage.name,
    current: null,
    countdownMs: null,
    upNext,
  };
};

/** Compute state for every stage. */
export const getAllStageStates = (
  stages: Stage[],
  now: number,
): StageState[] => stages.map((stage) => getStageState(stage, now));

/** Lifecycle of a single slot relative to `now`. */
export const slotStatus = (slot: ArtistSlot, now: number): SlotStatus =>
  now >= slot.endMs ? 'ended' : now >= slot.startMs ? 'active' : 'upcoming';

/**
 * Build the full timetable for a stage, keeping every slot (past, live and
 * upcoming) and grouping them by day in chronological order. Because
 * `stage.lineup` is sorted by start time and a `day` label maps to a
 * contiguous span of time, consecutive grouping preserves day order.
 */
export const getStageAgenda = (stage: Stage, now: number): AgendaDay[] => {
  const days: AgendaDay[] = [];
  let currentDay: AgendaDay | null = null;

  for (const slot of stage.lineup) {
    const status = slotStatus(slot, now);
    if (!currentDay || currentDay.day !== slot.day) {
      currentDay = { day: slot.day, slots: [], isPast: true };
      days.push(currentDay);
    }
    if (status !== 'ended') currentDay.isPast = false;
    currentDay.slots.push({
      slot,
      status,
      countdownMs: status === 'active' ? Math.max(0, slot.endMs - now) : null,
    });
  }

  return days;
};
