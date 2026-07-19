import { describe, expect, it } from 'vitest';
import {
  getStageAgenda,
  getStageState,
  getUpNext,
  isActive,
  isEnded,
  parseStage,
  slotStatus,
} from '../src/lib/lineup';
import type { RawStage } from '../src/types/lineup';

const rawStage: RawStage = {
  stage: 'Strand',
  lineup: [
    // Deliberately out of order to prove sorting.
    {
      day: 'Friday',
      artist: 'SVEN WIESEMANN',
      type: 'DJ',
      start_time: '2025-07-11T05:00:00',
      end_time: '2025-07-11T07:00:00',
      duration_minutes: 120,
    },
    {
      day: 'Thursday',
      artist: 'EDE',
      type: 'DJ',
      start_time: '2025-07-10T19:00:00',
      end_time: '2025-07-10T20:30:00',
      duration_minutes: 90,
    },
    {
      day: 'Friday',
      artist: 'HEARTSTRING',
      type: 'LIVE',
      start_time: '2025-07-11T01:00:00',
      end_time: '2025-07-11T02:30:00',
      duration_minutes: 90,
    },
  ],
};

const stage = parseStage(rawStage);
const at = (iso: string) => new Date(iso).getTime();

describe('parseStage', () => {
  it('sorts the lineup chronologically by start time', () => {
    expect(stage.lineup.map((s) => s.artist)).toEqual([
      'EDE',
      'HEARTSTRING',
      'SVEN WIESEMANN',
    ]);
  });
});

describe('isActive / isEnded boundaries', () => {
  const ede = stage.lineup[0]!;
  it('is active at exactly the start time (inclusive)', () => {
    expect(isActive(ede, at('2025-07-10T19:00:00'))).toBe(true);
  });
  it('is NOT active at exactly the end time (exclusive)', () => {
    expect(isActive(ede, at('2025-07-10T20:30:00'))).toBe(false);
  });
  it('is ended at exactly the end time', () => {
    expect(isEnded(ede, at('2025-07-10T20:30:00'))).toBe(true);
  });
});

describe('getStageState', () => {
  it('reports the active artist and countdown mid-set', () => {
    // 30 min into HEARTSTRING's set (past midnight → next calendar day).
    const state = getStageState(stage, at('2025-07-11T01:30:00'));
    expect(state.status).toBe('active');
    if (state.status !== 'active') return;
    expect(state.current.artist).toBe('HEARTSTRING');
    expect(state.countdownMs).toBe(60 * 60 * 1000); // 1h left
    expect(state.upNext?.artist).toBe('SVEN WIESEMANN');
  });

  it('reports vacant with up-next between sets', () => {
    const state = getStageState(stage, at('2025-07-10T21:00:00'));
    expect(state.status).toBe('vacant');
    expect(state.current).toBeNull();
    expect(state.upNext?.artist).toBe('HEARTSTRING');
  });

  it('reports vacant with no up-next after the final set', () => {
    const state = getStageState(stage, at('2025-07-11T08:00:00'));
    expect(state.status).toBe('vacant');
    expect(state.upNext).toBeNull();
  });
});

describe('getUpNext', () => {
  it('returns the immediate next not-yet-started set', () => {
    expect(getUpNext(stage, at('2025-07-10T18:00:00'))?.artist).toBe('EDE');
  });
});

describe('slotStatus', () => {
  const heartstring = stage.lineup[1]!; // Fri 01:00–02:30
  it('is upcoming before start', () => {
    expect(slotStatus(heartstring, at('2025-07-11T00:00:00'))).toBe('upcoming');
  });
  it('is active during the set', () => {
    expect(slotStatus(heartstring, at('2025-07-11T01:30:00'))).toBe('active');
  });
  it('is ended after the set', () => {
    expect(slotStatus(heartstring, at('2025-07-11T03:00:00'))).toBe('ended');
  });
});

describe('getStageAgenda', () => {
  it('keeps every slot grouped by day in chronological order', () => {
    const agenda = getStageAgenda(stage, at('2025-07-11T01:30:00'));
    expect(agenda.map((d) => d.day)).toEqual(['Thursday', 'Friday']);
    expect(agenda[0]!.slots.map((s) => s.slot.artist)).toEqual(['EDE']);
    expect(agenda[1]!.slots.map((s) => s.slot.artist)).toEqual([
      'HEARTSTRING',
      'SVEN WIESEMANN',
    ]);
  });

  it('flags a fully-ended day as past and a live/upcoming day as not past', () => {
    const agenda = getStageAgenda(stage, at('2025-07-11T01:30:00'));
    expect(agenda[0]!.isPast).toBe(true); // Thursday: EDE already ended
    expect(agenda[1]!.isPast).toBe(false); // Friday: HEARTSTRING live
  });

  it('marks every day as past once the whole lineup has ended', () => {
    const agenda = getStageAgenda(stage, at('2025-07-20T00:00:00'));
    expect(agenda.every((d) => d.isPast)).toBe(true);
  });

  it('annotates ended / active / upcoming and a countdown for the live slot', () => {
    const agenda = getStageAgenda(stage, at('2025-07-11T01:30:00'));
    const friday = agenda[1]!.slots;
    expect(agenda[0]!.slots[0]!.status).toBe('ended'); // EDE (Thu)
    expect(friday[0]!.status).toBe('active'); // HEARTSTRING
    expect(friday[0]!.countdownMs).toBe(60 * 60 * 1000);
    expect(friday[1]!.status).toBe('upcoming'); // SVEN WIESEMANN
    expect(friday[1]!.countdownMs).toBeNull();
  });
});
