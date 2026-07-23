/**
 * Lineup search helpers shared by Agenda and Timetable views.
 */

import type { ArtistSlot, Stage } from '../types/lineup';

/**
 * Normalize for case/diacritic-insensitive substring match.
 * NFKD strips combining marks; a small fold covers Nordic letters that
 * don't decompose (ø, æ, å, …).
 */
export const normalizeSearch = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/ð/g, 'd')
    .replace(/þ/g, 'th')
    .trim();

/** True when the slot's artist name contains the query (empty query matches all). */
export const slotMatches = (slot: ArtistSlot, query: string): boolean => {
  const q = normalizeSearch(query);
  if (!q) return true;
  return normalizeSearch(slot.artist).includes(q);
};

/** Stages that still have at least one matching slot; empty query returns input. */
export const filterStagesByQuery = (stages: Stage[], query: string): Stage[] => {
  const q = normalizeSearch(query);
  if (!q) return stages;
  return stages
    .map((stage) => ({
      ...stage,
      lineup: stage.lineup.filter((slot) => slotMatches(slot, q)),
    }))
    .filter((stage) => stage.lineup.length > 0);
};

/** Total matching slots across every stage. */
export const countMatchingSlots = (stages: Stage[], query: string): number => {
  const q = normalizeSearch(query);
  if (!q) return 0;
  let n = 0;
  for (const stage of stages) {
    for (const slot of stage.lineup) {
      if (slotMatches(slot, q)) n += 1;
    }
  }
  return n;
};

/** Index of the first stage that contains a match, or -1. */
export const firstMatchingStageIndex = (
  stages: Stage[],
  query: string,
): number => {
  const q = normalizeSearch(query);
  if (!q) return -1;
  return stages.findIndex((stage) =>
    stage.lineup.some((slot) => slotMatches(slot, q)),
  );
};
