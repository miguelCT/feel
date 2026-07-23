/**
 * Pointer-based horizontal swipe handler for switching stages.
 *
 * Attaches to the stage content surface (hero + agenda). Vertical scrolling
 * is preserved via `touch-action: pan-y` on the surface; this hook only
 * advances/retreats the selected stage index when a clear horizontal swipe
 * is detected. Mouse drags are ignored so text selection / clicks stay normal.
 */

import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  adjacentStageIndex,
  resolveSwipeDirection,
  type SwipePoint,
} from '../lib/swipe';

type UseStageSwipeOptions = {
  activeIndex: number;
  stageCount: number;
  onSwipe: (nextIndex: number) => void;
};

type StageSwipeHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
};

const isSwipePointer = (event: ReactPointerEvent<HTMLElement>): boolean =>
  event.isPrimary &&
  (event.pointerType === 'touch' || event.pointerType === 'pen');

export const useStageSwipe = ({
  activeIndex,
  stageCount,
  onSwipe,
}: UseStageSwipeOptions): StageSwipeHandlers => {
  const startRef = useRef<SwipePoint | null>(null);
  // Capture the index at gesture start so a mid-swipe re-render cannot
  // double-advance before pointerup fires.
  const indexAtStartRef = useRef(activeIndex);
  const pointerIdRef = useRef<number | null>(null);

  const clear = useCallback((target?: HTMLElement | null) => {
    if (
      pointerIdRef.current !== null &&
      target &&
      target.hasPointerCapture?.(pointerIdRef.current)
    ) {
      try {
        target.releasePointerCapture(pointerIdRef.current);
      } catch {
        /* already released */
      }
    }
    pointerIdRef.current = null;
    startRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isSwipePointer(event)) return;
      startRef.current = { x: event.clientX, y: event.clientY };
      indexAtStartRef.current = activeIndex;
      pointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [activeIndex],
  );

  const finish = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = startRef.current;
      const end = start ? { x: event.clientX, y: event.clientY } : null;
      clear(event.currentTarget);
      if (!start || !end || stageCount <= 1) return;

      const direction = resolveSwipeDirection(start, end);
      if (direction === null) return;

      const next = adjacentStageIndex(
        indexAtStartRef.current,
        direction,
        stageCount,
      );
      if (next !== indexAtStartRef.current) onSwipe(next);
    },
    [clear, onSwipe, stageCount],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      finish(event);
    },
    [finish],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      clear(event.currentTarget);
    },
    [clear],
  );

  return { onPointerDown, onPointerUp, onPointerCancel };
};
