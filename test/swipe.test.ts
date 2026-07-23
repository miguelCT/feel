import { describe, expect, it } from 'vitest';
import {
  adjacentStageIndex,
  resolveSwipeDirection,
  SWIPE_THRESHOLD_PX,
} from '../src/lib/swipe';

describe('resolveSwipeDirection', () => {
  it('returns 1 for a clear left swipe (next stage)', () => {
    expect(
      resolveSwipeDirection({ x: 200, y: 100 }, { x: 100, y: 105 }),
    ).toBe(1);
  });

  it('returns -1 for a clear right swipe (previous stage)', () => {
    expect(
      resolveSwipeDirection({ x: 100, y: 100 }, { x: 200, y: 95 }),
    ).toBe(-1);
  });

  it('ignores short gestures below the threshold', () => {
    expect(
      resolveSwipeDirection(
        { x: 100, y: 100 },
        { x: 100 + SWIPE_THRESHOLD_PX - 1, y: 100 },
      ),
    ).toBeNull();
  });

  it('ignores primarily vertical gestures', () => {
    expect(
      resolveSwipeDirection({ x: 100, y: 100 }, { x: 130, y: 220 }),
    ).toBeNull();
  });

  it('respects a custom threshold', () => {
    expect(
      resolveSwipeDirection({ x: 0, y: 0 }, { x: -40, y: 0 }, 30),
    ).toBe(1);
    expect(
      resolveSwipeDirection({ x: 0, y: 0 }, { x: -40, y: 0 }, 50),
    ).toBeNull();
  });
});

describe('adjacentStageIndex', () => {
  it('moves forward and backward within bounds', () => {
    expect(adjacentStageIndex(2, 1, 5)).toBe(3);
    expect(adjacentStageIndex(2, -1, 5)).toBe(1);
  });

  it('clamps at the ends', () => {
    expect(adjacentStageIndex(0, -1, 5)).toBe(0);
    expect(adjacentStageIndex(4, 1, 5)).toBe(4);
  });

  it('handles an empty stage list', () => {
    expect(adjacentStageIndex(0, 1, 0)).toBe(0);
  });
});
