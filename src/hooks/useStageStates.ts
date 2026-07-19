/**
 * Derive live per-stage runtime state (active artist, countdown, up-next) by
 * combining the parsed lineup with the shared 1-second clock.
 */

import { useMemo } from 'react';
import { getAllStageStates, getStageState } from '../lib/lineup';
import type { Stage, StageState } from '../types/lineup';
import { useClock } from './useClock';

/** Live state for every stage, recomputed each tick. */
export const useStageStates = (stages: Stage[]): StageState[] => {
  const now = useClock();
  return useMemo(() => getAllStageStates(stages, now), [stages, now]);
};

/** Live state for a single stage (or `null` if not provided). */
export const useStageState = (stage: Stage | null): StageState | null => {
  const now = useClock();
  return useMemo(
    () => (stage ? getStageState(stage, now) : null),
    [stage, now],
  );
};
