/**
 * Vertical "My day" timeline of liked sets — timetable rotated 90°.
 * Time runs top→bottom; concurrent likes stack horizontally in a row.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { LikeButton } from '../components/LikeButton';
import { ShareStoryButton } from '../components/ShareStoryButton';
import { useClock } from '../hooks/useClock';
import type { LikesApi } from '../hooks/useLikes';
import { buildMyDay } from '../lib/myDay';
import { normalizeSearch, slotMatches } from '../lib/search';
import { formatClock, formatCountdown } from '../lib/time';
import type { Stage } from '../types/lineup';

interface Props {
  stages: Stage[];
  query: string;
  likes: LikesApi;
  /** Shared chrome (brand + view switcher) rendered inside the sticky top. */
  header: ReactNode;
}

const entryClass = (status: 'ended' | 'active' | 'upcoming'): string =>
  status === 'active'
    ? 'myday-card is-now'
    : status === 'ended'
      ? 'myday-card is-past'
      : 'myday-card';

export const MyDayView = ({ stages, query, likes, header }: Props) => {
  const clockNow = useClock();
  const hasQuery = normalizeSearch(query).length > 0;
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>(
    {},
  );

  // Story/share always uses the full liked list (not the search filter).
  const allDays = useMemo(
    () => buildMyDay(stages, likes.isLiked, clockNow),
    [stages, likes.isLiked, clockNow],
  );

  const days = useMemo(() => {
    if (!hasQuery) return allDays;
    return allDays
      .map((day) => ({
        ...day,
        rows: day.rows
          .map((row) => ({
            ...row,
            entries: row.entries.filter(({ slot }) => slotMatches(slot, query)),
          }))
          .filter((row) => row.entries.length > 0),
      }))
      .filter((day) => day.rows.length > 0);
  }, [allDays, hasQuery, query]);

  return (
    <>
      <div className="sticky-top">{header}</div>

      <div className="myday">
        {likes.count === 0 ? (
          <p className="myday-empty">
            Heart acts in Agenda or Timetable — they show up here, ordered by
            time.
          </p>
        ) : (
          <>
            <div className="myday-toolbar">
              <ShareStoryButton days={allDays} />
            </div>
            {hasQuery && days.length === 0 ? (
              <p className="search-empty">
                No liked acts match “{query.trim()}”.
              </p>
            ) : (
              days.map((day) => (
                <details
                  key={day.day}
                  className={day.isPast ? 'myday-day is-past' : 'myday-day'}
                  open={openOverrides[day.day] ?? !day.isPast}
                  onToggle={(e) => {
                    const isOpen = e.currentTarget.open;
                    setOpenOverrides((prev) => ({
                      ...prev,
                      [day.day]: isOpen,
                    }));
                  }}
                >
                  <summary className="myday-day-summary">
                    <span>{day.day}</span>
                  </summary>
                  <div className="myday-timeline">
                    {day.rows.map((row) => (
                      <div
                        key={row.startMs}
                        className={
                          row.entries.some((e) => e.status === 'active')
                            ? 'myday-row is-now'
                            : 'myday-row'
                        }
                      >
                        <time
                          className="myday-time"
                          dateTime={row.entries[0]?.slot.start_time}
                        >
                          {formatClock(row.startMs)}
                        </time>
                        <div className="myday-stack">
                          {row.entries.map((entry) => (
                            <article
                              key={entry.key}
                              className={entryClass(entry.status)}
                              aria-current={
                                entry.status === 'active' ? 'true' : undefined
                              }
                            >
                              <LikeButton
                                liked
                                className="like-btn-myday"
                                onToggle={() =>
                                  likes.toggleLike(
                                    entry.stageName,
                                    entry.slot.artist,
                                    entry.slot.start_time,
                                  )
                                }
                              />
                              <p className="myday-card-artist">
                                {entry.slot.artist}
                                {entry.slot.type === 'LIVE' && (
                                  <span className="slot-tag">Live</span>
                                )}
                              </p>
                              <p className="myday-card-meta">
                                {entry.stageName}
                                <span className="myday-card-range">
                                  {' '}
                                  · {formatClock(entry.slot.startMs)}–
                                  {formatClock(entry.slot.endMs)}
                                </span>
                              </p>
                              {entry.status === 'active' &&
                                entry.countdownMs !== null && (
                                  <p className="myday-card-cd">
                                    {formatCountdown(entry.countdownMs)}
                                  </p>
                                )}
                            </article>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))
            )}
          </>
        )}
      </div>
    </>
  );
};
