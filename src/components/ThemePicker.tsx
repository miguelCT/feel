/**
 * Compact icon theme switcher for the brand row.
 */

import { THEMES, type Theme } from '../lib/theme';

interface Props {
  value: Theme;
  onChange: (theme: Theme) => void;
}

const LABELS: Record<Theme, string> = {
  brutalist: 'Brutalist',
  neon: 'Neon',
  seaside: 'Seaside',
};

export const ThemePicker = ({ value, onChange }: Props) => (
  <div className="theme-icons" role="group" aria-label="Theme">
    {THEMES.map((theme) => (
      <button
        key={theme}
        type="button"
        className={
          theme === value ? 'theme-icon is-active' : 'theme-icon'
        }
        aria-label={LABELS[theme]}
        aria-pressed={theme === value}
        title={LABELS[theme]}
        onClick={() => onChange(theme)}
      >
        <ThemeGlyph theme={theme} />
      </button>
    ))}
  </div>
);

const ThemeGlyph = ({ theme }: { theme: Theme }) => {
  if (theme === 'brutalist') {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <rect
          x="2"
          y="2"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect x="6" y="6" width="4" height="4" fill="currentColor" />
      </svg>
    );
  }
  if (theme === 'neon') {
    return (
      <svg
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.2 3.2l2.1 2.1M10.7 10.7l2.1 2.1M12.8 3.2l-2.1 2.1M5.3 10.7l-2.1 2.1" />
        <circle cx="8" cy="8" r="2.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  // seaside
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M2 6c1.5-2 3-2 4 0s2.5 2 4 0 2.5-2 4 0" />
      <path d="M2 10c1.5-2 3-2 4 0s2.5 2 4 0 2.5-2 4 0" />
    </svg>
  );
};
