/**
 * Multi-stage horizontal timetable (Gantt-style) with a live "now" indicator.
 */

import { useEffect, useMemo, useRef } from 'react';
import { LikeButton } from '../components/LikeButton';
import { useClock } from '../hooks/useClock';
import type { LikesApi } from '../hooks/useLikes';
import { slotStatus } from '../lib/lineup';
import {
  filterStagesByQuery,
  findFirstMatch,
  normalizeSearch,
} from '../lib/search';
import { formatClock } from '../lib/time';
import {
  getFestivalBounds,
  getHourTicks,
  getStageBlocks,
  timeToX,
  timelineWidth,
  PX_PER_MINUTE,
} from '../lib/timetable';
import type { Stage } from '../types/lineup';

const STAGE_COL_W = 88;
const ROW_H = 64;
const HEADER_H = 34;

interface Props {
  stages: Stage[];
  query: string;
  likes: LikesApi;
}

export const TimetableView = ({ stages, query, likes }: Props) => {
  const now = useClock();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const didScrollRef = useRef(false);
  const lastScrolledQuery = useRef('');

  const visibleStages = useMemo(
    () => filterStagesByQuery(stages, query),
    [stages, query],
  );
  const hasQuery = normalizeSearch(query).length > 0;

  // Bounds stay festival-wide so the now-line / scale don't jump while filtering.
  const bounds = useMemo(() => getFestivalBounds(stages), [stages]);
  const ticks = useMemo(
    () => (bounds ? getHourTicks(bounds) : []),
    [bounds],
  );
  const width = bounds ? timelineWidth(bounds) : 0;

  const nowX = bounds ? timeToX(now, bounds.startMs) : 0;
  const nowInRange =
    !!bounds && now >= bounds.startMs && now <= bounds.endMs;

  // Scroll so "now" sits ~30% from the left on first paint (no active search).
  useEffect(() => {
    if (!bounds || !nowInRange || didScrollRef.current || hasQuery) return;
    const el = scrollerRef.current;
    if (!el) return;
    const target = Math.max(0, nowX - el.clientWidth * 0.3);
    el.scrollLeft = target;
    didScrollRef.current = true;
  }, [bounds, nowInRange, nowX, hasQuery]);

  // Scroll to the first matching block whenever the query changes.
  useEffect(() => {
    if (!hasQuery || !bounds) {
      lastScrolledQuery.current = '';
      return;
    }
    const match = findFirstMatch(stages, query);
    if (!match) return;
    if (lastScrolledQuery.current === query) return;
    lastScrolledQuery.current = query;

    const rowIndex = visibleStages.findIndex(
      (stage) => stage.name === match.stageName,
    );
    if (rowIndex < 0) return;

    const el = scrollerRef.current;
    if (!el) return;
    const x = timeToX(match.slot.startMs, bounds.startMs);
    const id = window.requestAnimationFrame(() => {
      el.scrollTo({
        left: Math.max(0, x - el.clientWidth * 0.25),
        top: Math.max(0, HEADER_H + rowIndex * ROW_H - el.clientHeight * 0.25),
        behavior: 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [hasQuery, query, stages, visibleStages, bounds]);

  const scrollToNow = () => {
    const el = scrollerRef.current;
    if (!el || !bounds) return;
    const x = timeToX(now, bounds.startMs);
    el.scrollTo({
      left: Math.max(0, x - el.clientWidth * 0.3),
      behavior: 'smooth',
    });
  };

  if (!bounds) {
    return <div className="state">No timetable data.</div>;
  }

  if (hasQuery && visibleStages.length === 0) {
    return (
      <div className="timetable">
        <div className="timetable-toolbar">
          <button
            type="button"
            className="timetable-now-btn"
            onClick={scrollToNow}
            disabled={!nowInRange}
          >
            Jump to now
          </button>
        </div>
        <p className="search-empty">No acts match “{query.trim()}”.</p>
      </div>
    );
  }

  return (
    <div className="timetable">
      <div className="timetable-toolbar">
        <button
          type="button"
          className="timetable-now-btn"
          onClick={scrollToNow}
          disabled={!nowInRange}
        >
          Jump to now
        </button>
      </div>

      <div className="timetable-frame" ref={scrollerRef}>
        <div
          className="timetable-canvas"
          style={{
            width: STAGE_COL_W + width,
            minHeight: HEADER_H + visibleStages.length * ROW_H,
          }}
        >
          {/* Sticky stage labels */}
          <div
            className="timetable-stages"
            style={{ width: STAGE_COL_W, flex: 'none' }}
          >
            <div className="timetable-stages-head" style={{ height: HEADER_H }}>
              Stage
            </div>
            {visibleStages.map((stage) => (
              <div
                key={stage.name}
                className="timetable-stage-label"
                style={{ height: ROW_H }}
              >
                {stage.name}
              </div>
            ))}
          </div>

          {/* Scrollable timeline body */}
          <div className="timetable-body" style={{ width, flex: 'none' }}>
            <div className="timetable-ruler" style={{ height: HEADER_H, width }}>
              {ticks.map((tick) => (
                <div
                  key={tick.ms}
                  className="timetable-tick"
                  style={{ left: tick.x }}
                >
                  {tick.dayLabel && (
                    <span className="timetable-tick-day">{tick.dayLabel}</span>
                  )}
                  <span className="timetable-tick-hour">{tick.label}</span>
                </div>
              ))}
            </div>

            <div className="timetable-rows" style={{ width }}>
              {ticks.map((tick) => (
                <div
                  key={`grid-${tick.ms}`}
                  className="timetable-gridline"
                  style={{
                    left: tick.x,
                    height: visibleStages.length * ROW_H,
                  }}
                />
              ))}

              {visibleStages.map((stage) => {
                const blocks = getStageBlocks(stage, bounds.startMs);
                return (
                  <div
                    key={stage.name}
                    className="timetable-row"
                    style={{ height: ROW_H, width }}
                  >
                    {blocks.map(({ slot, left, width: blockW }) => {
                      const status = slotStatus(slot, now);
                      const liked = likes.isLiked(
                        stage.name,
                        slot.artist,
                        slot.start_time,
                      );
                      return (
                        <div
                          key={`${slot.artist}-${slot.start_time}`}
                          className={
                            status === 'active'
                              ? liked
                                ? 'timetable-block is-now is-liked'
                                : 'timetable-block is-now'
                              : status === 'ended'
                                ? liked
                                  ? 'timetable-block is-past is-liked'
                                  : 'timetable-block is-past'
                                : liked
                                  ? 'timetable-block is-liked'
                                  : 'timetable-block'
                          }
                          style={{ left, width: blockW }}
                          title={`${slot.artist} · ${formatClock(slot.startMs)}–${formatClock(slot.endMs)}`}
                        >
                          <LikeButton
                            liked={liked}
                            className="like-btn-block"
                            onToggle={() =>
                              likes.toggleLike(
                                stage.name,
                                slot.artist,
                                slot.start_time,
                              )
                            }
                          />
                          <span className="timetable-block-artist">
                            {slot.artist}
                          </span>
                          <span className="timetable-block-time">
                            {formatClock(slot.startMs)}–{formatClock(slot.endMs)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {nowInRange && (
              <div
                className="timetable-now-line"
                style={{
                  left: nowX,
                  height: HEADER_H + visibleStages.length * ROW_H,
                }}
                aria-hidden="true"
              >
                <span className="timetable-now-cap">
                  {formatClock(now)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <span className="visually-hidden">
        Scale {PX_PER_MINUTE} pixels per minute
      </span>
    </div>
  );
};
