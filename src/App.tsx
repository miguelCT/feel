/**
 * App shell: theme, hash routes (agenda / timetable / my day), and shared chrome.
 */

import { useEffect, useMemo, useState } from 'react';
import { ExpandableSearch } from './components/ExpandableSearch';
import { ThemePicker } from './components/ThemePicker';
import { useClock } from './hooks/useClock';
import { useHashRoute } from './hooks/useHashRoute';
import { useLikes } from './hooks/useLikes';
import { useLineup } from './hooks/useLineup';
import { isTimeTravelActive } from './lib/devClock';
import { routeHref, type Route } from './lib/routing';
import { countMatchingSlots } from './lib/search';
import { getInitialTheme, persistTheme } from './lib/theme';
import type { Theme } from './lib/theme';
import { MyDayView } from './views/MyDayView';
import { StageView } from './views/StageView';
import { TimetableView } from './views/TimetableView';

const NAV: { route: Route; label: string }[] = [
  { route: 'agenda', label: 'Agenda' },
  { route: 'timetable', label: 'Timetable' },
  { route: 'myday', label: 'My day' },
];

export const App = () => {
  const { stages, loading, error } = useLineup();
  const route = useHashRoute();
  const clockNow = useClock();
  const likes = useLikes();
  const [query, setQuery] = useState('');
  /** True while the search field is expanded/focused — frees brand-row space. */
  const [searchOpen, setSearchOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persistTheme(theme);
  }, [theme]);

  const matchCount = useMemo(
    () => countMatchingSlots(stages, query),
    [stages, query],
  );

  if (loading) return <div className="app state">Loading lineup…</div>;
  if (error)
    return (
      <div className="app state">Failed to load lineup: {error.message}</div>
    );

  const compactHeader = searchOpen || query.trim().length > 0;

  const header = (
    <header className={compactHeader ? 'brand brand-searching' : 'brand'}>
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

      <nav className="viewbar" aria-label="Views">
        {NAV.map(({ route: r, label }) => (
          <a
            key={r}
            href={routeHref(r)}
            className={route === r ? 'view-tab is-active' : 'view-tab'}
            aria-current={route === r ? 'page' : undefined}
          >
            {label}
          </a>
        ))}
      </nav>

      <span className="brand-spacer" />

      <ExpandableSearch
        value={query}
        matchCount={matchCount}
        onChange={setQuery}
        onOpenChange={setSearchOpen}
      />

      <ThemePicker value={theme} onChange={setTheme} />
    </header>
  );

  return (
    <div className={route === 'timetable' ? 'app app-timetable' : 'app'}>
      {isTimeTravelActive() && (
        <div className="timebar">
          ⏱ Simulating {new Date(clockNow).toLocaleString()} — add{' '}
          <code>?now=off</code> to return to real time.
        </div>
      )}

      {route === 'agenda' ? (
        <StageView
          stages={stages}
          query={query}
          header={header}
          likes={likes}
        />
      ) : route === 'myday' ? (
        <MyDayView
          stages={stages}
          query={query}
          header={header}
          likes={likes}
        />
      ) : (
        <>
          <div className="sticky-top">{header}</div>
          <TimetableView stages={stages} query={query} likes={likes} />
        </>
      )}
    </div>
  );
};
