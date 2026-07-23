/**
 * Horizontal swipe detection helpers for stage navigation.
 *
 * A swipe is accepted when the movement is mostly horizontal and past a
 * distance threshold, so vertical scrolling of the agenda stays unaffected.
 */

export type SwipeDirection = -1 | 1;

export type SwipePoint = {
  x: number;
  y: number;
};

/** Minimum horizontal travel (px) before a gesture counts as a stage swipe. */
export const SWIPE_THRESHOLD_PX = 50;

/**
 * Decide whether a pointer/touch gesture is a horizontal stage swipe.
 *
 * Returns `-1` for swipe-right (previous stage), `1` for swipe-left (next
 * stage), or `null` when the gesture should be ignored (too short / vertical).
 */
export const resolveSwipeDirection = (
  start: SwipePoint,
  end: SwipePoint,
  thresholdPx: number = SWIPE_THRESHOLD_PX,
): SwipeDirection | null => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < thresholdPx) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? 1 : -1;
};

/** Clamp an index into `[0, length - 1]` after applying a stage delta. */
export const adjacentStageIndex = (
  current: number,
  delta: SwipeDirection,
  length: number,
): number => {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, current + delta));
};
