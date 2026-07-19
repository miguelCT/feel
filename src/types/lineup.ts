/**
 * Domain types for the festival lineup engine.
 *
 * Time model: `start_time` / `end_time` in the source JSON are timezone-naive
 * ISO-8601 strings (e.g. "2025-07-11T20:00:00"). They are interpreted as
 * device-local wall-clock time (everyone is in the same timezone at the
 * festival). All comparisons happen on epoch-millisecond values, so sets that
 * run past midnight into the next calendar day are handled purely
 * chronologically — never via day-of-week strings.
 */

export type ArtistType = 'DJ' | 'LIVE';

/** A lineup slot exactly as it appears in `lineup.json`. */
export interface RawArtistSlot {
  day: string;
  artist: string;
  type: ArtistType;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

/** A stage exactly as it appears in `lineup.json`. */
export interface RawStage {
  stage: string;
  lineup: RawArtistSlot[];
}

/** A lineup slot enriched with parsed epoch-ms bounds for fast comparison. */
export interface ArtistSlot extends RawArtistSlot {
  /** `start_time` parsed as local wall-clock epoch milliseconds. */
  startMs: number;
  /** `end_time` parsed as local wall-clock epoch milliseconds. */
  endMs: number;
}

/** A stage with parsed slots sorted chronologically by start time. */
export interface Stage {
  name: string;
  lineup: ArtistSlot[];
}

/**
 * Computed runtime state for a single stage at a given instant.
 *
 * Discriminated on `status`:
 * - `active`  — an artist is currently playing; `countdownMs` is the time left.
 * - `vacant`  — nothing is playing right now (before/between/after sets).
 */
export type StageState =
  | {
      status: 'active';
      stage: string;
      current: ArtistSlot;
      /** Milliseconds remaining until `current.endMs` (>= 0). */
      countdownMs: number;
      upNext: ArtistSlot | null;
    }
  | {
      status: 'vacant';
      stage: string;
      current: null;
      countdownMs: null;
      upNext: ArtistSlot | null;
    };

/** Lifecycle of a single slot relative to "now". */
export type SlotStatus = 'ended' | 'active' | 'upcoming';

/** A slot annotated with its live status for timetable rendering. */
export interface AgendaSlot {
  slot: ArtistSlot;
  status: SlotStatus;
  /** Milliseconds left until end, only for the `active` slot; else null. */
  countdownMs: number | null;
}

/** All slots for one day, in chronological order. */
export interface AgendaDay {
  day: string;
  slots: AgendaSlot[];
  /** True once every slot in the day has ended (used to auto-collapse it). */
  isPast: boolean;
}
