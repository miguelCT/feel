/**
 * Theme selection. The active theme is applied via a `data-theme` attribute on
 * <html> (see `theme.css`). Selectable at runtime with `?theme=neon` and
 * remembered in localStorage.
 */

export const THEMES = ['brutalist', 'neon', 'seaside'] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'feel2026:theme';
const DEFAULT_THEME: Theme = 'seaside';

const isTheme = (value: string | null): value is Theme =>
  value !== null && (THEMES as readonly string[]).includes(value);

/** Resolve the initial theme from `?theme=`, then localStorage, then default. */
export const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return DEFAULT_THEME;

  const param = new URLSearchParams(window.location.search).get('theme');
  if (isTheme(param)) {
    persistTheme(param);
    return param;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : DEFAULT_THEME;
};

/** Remember the chosen theme. */
export const persistTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Non-fatal; theme just won't persist across reloads.
  }
};
