/**
 * App shell: a single-stage, Berghain-style timetable with switchable themes.
 * Presentation lives in `styles/theme.css`; this component only supplies
 * semantic class names and the live data from the engine.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClock } from './hooks/useClock';
import { useDominantColor } from './hooks/useDominantColor';
import { useLineup } from './hooks/useLineup';
import { useNowPlaying } from './hooks/useNowPlaying';
import { useStageSwipe } from './hooks/useStageSwipe';
import { readableInk } from './lib/color';
import { isTimeTravelActive } from './lib/devClock';
import { getStageAgenda } from './lib/lineup';
import { slugify } from './lib/slug';
import { getInitialTheme, persistTheme, THEMES } from './lib/theme';
import type { Theme } from './lib/theme';
import { formatClock, formatCountdown } from './lib/time';
import type { AgendaSlot } from './types/lineup';

const slotClass = (status: AgendaSlot['status']): string =>
  status === 'active'
    ? 'slot is-now'
    : status === 'ended'
      ? 'slot is-past'
      : 'slot';

const STAGE_PARAM = 'stage';

type ArtistPhoto = string | null;

const photoMemo = new Map<string, ArtistPhoto>();
const PHOTO_CACHE_PREFIX = 'feel2026:photo:';

/** Minimal JSONP loader (Deezer's public API has no CORS headers). */
const jsonp = <T,>(url: string, timeoutMs = 6000): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const cb = `feelcb_${Math.random().toString(36).slice(2)}`;
    const w = window as unknown as Record<
      string,
      ((data: T) => void) | undefined
    >;
    const script = document.createElement('script');
    let timer = 0;
    const cleanup = () => {
      window.clearTimeout(timer);
      delete w[cb];
      script.remove();
    };
    w[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('jsonp failed'));
    };
    timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('jsonp timeout'));
    }, timeoutMs);
    script.src = `${url}${url.includes('?') ? '&' : '?'}output=jsonp&callback=${cb}`;
    document.head.appendChild(script);
  });

type DeezerSearch = {
  data?: Array<{ name?: string; picture_big?: string; picture_medium?: string }>;
};

const normalizeName = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Guard against fuzzy mismatches (e.g. Deezer returning an unrelated act). */
const nameMatches = (query: string, candidate: string | null | undefined): boolean => {
  if (!candidate) return false;
  const a = normalizeName(query);
  const b = normalizeName(candidate);
  if (a.length < 3 || b.length < 3) return false;
  return a === b || a.includes(b) || b.includes(a);
};

const fetchDeezerPhoto = async (name: string): Promise<ArtistPhoto> => {
  const res = await jsonp<DeezerSearch>(
    `https://api.deezer.com/search/artist?limit=1&q=${encodeURIComponent(name)}`,
  );
  const artist = res.data?.[0];
  if (!artist || !nameMatches(name, artist.name)) return null;
  return artist.picture_big ?? artist.picture_medium ?? null;
};

type AudioDbSearch = {
  artists?: Array<{
    strArtist?: string | null;
    strArtistThumb?: string | null;
    strArtistFanart?: string | null;
  }> | null;
};

const fetchAudioDbPhoto = async (name: string): Promise<ArtistPhoto> => {
  const res = await fetch(
    `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(name)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as AudioDbSearch;
  const artist = data.artists?.[0];
  if (!artist || !nameMatches(name, artist.strArtist)) return null;
  return artist.strArtistThumb ?? artist.strArtistFanart ?? null;
};

/** Deezer first, then TheAudioDB; hits cached in memory + localStorage. */
const resolveArtistPhoto = async (name: string): Promise<ArtistPhoto> => {
  const memo = photoMemo.get(name);
  if (memo !== undefined) return memo;
  try {
    const stored = localStorage.getItem(PHOTO_CACHE_PREFIX + name);
    if (stored) {
      photoMemo.set(name, stored);
      return stored;
    }
  } catch {
    /* localStorage unavailable */
  }

  let url: ArtistPhoto = null;
  try {
    url = await fetchDeezerPhoto(name);
  } catch {
    /* Deezer unreachable */
  }
  if (!url) {
    try {
      url = await fetchAudioDbPhoto(name);
    } catch {
      /* TheAudioDB unreachable */
    }
  }

  photoMemo.set(name, url);
  if (url) {
    try {
      localStorage.setItem(PHOTO_CACHE_PREFIX + name, url);
    } catch {
      /* ignore */
    }
  }
  return url;
};

/** Ongoing-DJ thumbnail: real photo when available, else the FEEL seagull mark. */
const ArtistAvatar = ({ name, url }: { name: string; url: ArtistPhoto }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [url]);

  if (url && !broken) {
    return (
      <img
        className="now-photo"
        src={url}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="now-photo now-avatar" role="img" aria-label={name}>
      <svg
        className="now-avatar-mark"
        viewBox="18 14 20 8"
        aria-hidden="true"
        fill="none"
      >
        <path
          d="M20 20c3-3 6-3 8 0 2-3 5-3 8 0"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const readStageParam = (): string | null =>
  typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get(STAGE_PARAM);

/** Reflect the current stage in the URL (replace, so it stays shareable). */
const writeStageParam = (slug: string): void => {
  const url = new URL(window.location.href);
  url.searchParams.set(STAGE_PARAM, slug);
  window.history.replaceState(null, '', url);
};

/** Resolve a real press photo for the artist (null while loading / none found). */
const useArtistPhoto = (name: string | null): ArtistPhoto => {
  const [url, setUrl] = useState<ArtistPhoto>(null);
  useEffect(() => {
    setUrl(null);
    if (!name) return;
    let cancelled = false;
    resolveArtistPhoto(name).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return url;
};

export const App = () => {
  const { stages, loading, error } = useLineup();
  const [selected, setSelected] = useState<number | null>(null);
  const clockNow = useClock();

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
  }, [theme]);

  // User's explicit expand/collapse choices per day; reset when stage changes.
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>(
    {},
  );
  useEffect(() => {
    setOpenOverrides({});
  }, [selected]);

  // Resolve the initial stage from the URL once the lineup has loaded. The
  // functional update keeps this safe under StrictMode's double-invoked
  // effects: once a stage is chosen we never re-resolve.
  useEffect(() => {
    if (stages.length === 0) return;
    setSelected((prev) => {
      if (prev !== null) return prev;
      const slug = readStageParam();
      const idx = slug
        ? stages.findIndex((s) => slugify(s.name) === slug)
        : -1;
      return idx >= 0 ? idx : 0;
    });
  }, [stages]);

  // Keep the URL in sync so the current stage can be shared via a link. Skip
  // until a stage is resolved so we never clobber the incoming ?stage= param.
  useEffect(() => {
    if (selected === null) return;
    const current = stages[selected];
    if (current) writeStageParam(slugify(current.name));
  }, [selected, stages]);

  const activeIndex = selected ?? 0;

  // Bring the selected tab into view — it can otherwise sit off-screen in the
  // horizontally scrolling stage bar.
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [activeIndex]);

  const stage = stages[activeIndex] ?? null;

  // Full timetable for the selected stage, recomputed each tick.
  const agenda = useMemo(
    () => (stage ? getStageAgenda(stage, clockNow) : []),
    [stage, clockNow],
  );

  // The currently playing slot (drives both the hero and the accent colour).
  const active = useMemo(() => {
    for (const day of agenda) {
      for (const entry of day.slots) {
        if (entry.status === 'active') return entry;
      }
    }
    return null;
  }, [agenda]);

  // Fallback for the hero when nothing is live: the next upcoming set.
  const nextUp = useMemo(() => {
    for (const day of agenda) {
      for (const entry of day.slots) {
        if (entry.status === 'upcoming') return entry.slot;
      }
    }
    return null;
  }, [agenda]);

  const accent = useDominantColor(active?.slot.artist ?? null);

  // Real press photo for the ongoing DJ (Deezer → TheAudioDB → avatar).
  const nowPhoto = useArtistPhoto(active?.slot.artist ?? null);

  // Apply the accent colour — plus a legible ink colour derived from it — to
  // CSS custom properties so text on the accent block stays readable.
  useEffect(() => {
    const root = document.documentElement.style;
    const rgb = accent?.rgb ?? [236, 72, 153];
    root.setProperty('--accent', accent?.hex ?? '#ec4899');
    root.setProperty('--accent-ink', readableInk(rgb));
  }, [accent]);

  // Optional OS "now playing" card for the active set.
  const nowPlaying = useNowPlaying(
    active?.slot.artist ?? null,
    stage?.name ?? 'Feel 2026',
    active
      ? `${formatClock(active.slot.startMs)}–${formatClock(active.slot.endMs)}`
      : null,
  );

  // The condensed now-strip in the sticky bar is only shown once the full hero
  // has scrolled up under the stage tabs — so the "in session" pill collapses
  // into the strip instead of duplicating it. A callback ref (re)attaches the
  // observer whenever the hero mounts, incl. after the initial loading state.
  const [heroOnScreen, setHeroOnScreen] = useState(true);
  const heroObserverRef = useRef<IntersectionObserver | null>(null);
  const heroRef = useCallback((node: HTMLElement | null) => {
    heroObserverRef.current?.disconnect();
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroOnScreen(entry?.isIntersecting ?? true),
      { rootMargin: '-140px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(node);
    heroObserverRef.current = observer;
  }, []);

  // Swipe left/right on the stage body to move between stages. Kept off the
  // sticky stagebar so its own horizontal scroll still works.
  const goToStage = useCallback((nextIndex: number) => {
    setSelected(nextIndex);
  }, []);
  const stageSwipe = useStageSwipe({
    activeIndex,
    stageCount: stages.length,
    onSwipe: goToStage,
  });

  if (loading) return <div className="app state">Loading lineup…</div>;
  if (error)
    return (
      <div className="app state">Failed to load lineup: {error.message}</div>
    );

  return (
    <div className="app">
      {isTimeTravelActive() && (
        <div className="timebar">
          ⏱ Simulating {new Date(clockNow).toLocaleString()} — add{' '}
          <code>?now=off</code> to return to real time.
        </div>
      )}

      <div className="sticky-top">
        <header className="brand">
        <svg
          className="brand-mark"
          viewBox="18 14 20 8"
          aria-hidden="true"
          fill="none"
        >
          <path
            d="M20 20c3-3 6-3 8 0 2-3 5-3 8 0"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
        <h1 className="brand-name">FEEL 2026</h1>
        <span className="brand-spacer" />
        <div className="theme-switch" role="group" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t}
              className={t === theme ? 'is-active' : undefined}
              onClick={() => setTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

        <nav className="stagebar" aria-label="Stages">
          {stages.map((s, i) => (
            <button
              key={s.name}
              ref={i === activeIndex ? activeTabRef : undefined}
              className={i === activeIndex ? 'stage-tab is-active' : 'stage-tab'}
              onClick={() => setSelected(i)}
              aria-pressed={i === activeIndex}
            >
              {s.name}
            </button>
          ))}
        </nav>
        {active && !heroOnScreen && (
          <div className="now-strip" aria-hidden="true">
            <span className="now-strip-dot" />
            <span className="now-strip-artist">{active.slot.artist}</span>
            <span className="now-strip-cd">
              {formatCountdown(active.countdownMs ?? 0)}
            </span>
          </div>
        )}
      </div>

      <div
        className="stage-surface"
        {...stageSwipe}
        aria-label="Swipe left or right to change stage"
      >
        <section className="now-hero" ref={heroRef}>
          {active && nowPlaying.supported && (
            <button
              type="button"
              className={nowPlaying.pinned ? 'pin-icon is-pinned' : 'pin-icon'}
              onClick={nowPlaying.toggle}
              aria-pressed={nowPlaying.pinned}
              aria-label={
                nowPlaying.pinned
                  ? 'Unpin from lock screen'
                  : 'Pin to lock screen'
              }
              title={
                nowPlaying.pinned ? 'Pinned to lock screen' : 'Pin to lock screen'
              }
            >
              <span className="pin-glyph" aria-hidden="true">
                📌
              </span>
            </button>
          )}
          {stage && <p className="now-stage">{stage.name}</p>}
          {active ? (
            <div className="now-live">
              <ArtistAvatar name={active.slot.artist} url={nowPhoto} />
              <div className="now-live-text">
                <p className="now-kicker">In session now</p>
                <h2 className="now-artist">{active.slot.artist}</h2>
                <p className="now-remaining">
                  {formatCountdown(active.countdownMs ?? 0)}
                </p>
                <p className="now-meta">
                  {active.slot.type === 'LIVE' && 'Live · '}until{' '}
                  {formatClock(active.slot.endMs)}
                </p>
              </div>
            </div>
          ) : nextUp ? (
            <>
              <p className="now-kicker">Up next</p>
              <h2 className="now-artist">{nextUp.artist}</h2>
              <p className="now-meta">
                {nextUp.type === 'LIVE' ? 'Live' : 'DJ'} ·{' '}
                {formatClock(nextUp.startMs)}
              </p>
            </>
          ) : (
            <>
              <p className="now-kicker">Stage closed</p>
              <h2 className="now-artist">—</h2>
            </>
          )}
        </section>

        <div className="agenda">
          {agenda.map((day) => (
            <details
              key={day.day}
              className={day.isPast ? 'day is-past' : 'day'}
              open={openOverrides[day.day] ?? !day.isPast}
              onToggle={(e) => {
                const isOpen = e.currentTarget.open;
                setOpenOverrides((prev) => ({ ...prev, [day.day]: isOpen }));
              }}
            >
              <summary className="day-summary">
                <span>{day.day}</span>
              </summary>
              <ul className="day-list">
                {day.slots.map(({ slot, status, countdownMs }) => (
                  <li
                    key={`${slot.artist}-${slot.start_time}`}
                    className={slotClass(status)}
                    aria-current={status === 'active' ? 'true' : undefined}
                  >
                    <span className="slot-time">
                      {status === 'active' ? 'Now' : formatClock(slot.startMs)}
                    </span>
                    <span className="slot-artist">
                      {slot.artist}
                      <span className="slot-end">
                        –{formatClock(slot.endMs)}
                      </span>
                      {slot.type === 'LIVE' && (
                        <span className="slot-tag">Live</span>
                      )}
                    </span>
                    {status === 'active' && countdownMs !== null && (
                      <span className="slot-cd">
                        {formatCountdown(countdownMs)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};
