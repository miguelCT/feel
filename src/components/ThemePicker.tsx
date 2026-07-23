/**
 * Compact theme control: shows the active theme as an icon; clicking opens
 * a native <select> (and its system picker when available).
 */

import { useRef, useState } from 'react';
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

export const ThemePicker = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const openPicker = () => {
    setOpen(true);
    const el = selectRef.current;
    if (!el) return;
    // Keep this in the same user-gesture turn so showPicker is allowed.
    el.focus();
    try {
      (el as HTMLSelectElement & { showPicker?: () => void }).showPicker?.();
    } catch {
      /* falls back to the visible <select> */
    }
  };

  return (
    <div className={open ? 'theme-picker is-open' : 'theme-picker'}>
      <button
        type="button"
        className="theme-icon is-active"
        aria-label={`Theme: ${LABELS[value]}. Change theme`}
        title={LABELS[value]}
        tabIndex={open ? -1 : 0}
        aria-hidden={open}
        onClick={openPicker}
      >
        <ThemeGlyph theme={value} />
      </button>

      <label className="theme-select-wrap">
        <span className="visually-hidden">Theme</span>
        <select
          ref={selectRef}
          className="theme-select"
          value={value}
          aria-label="Theme"
          tabIndex={open ? 0 : -1}
          onChange={(e) => {
            onChange(e.target.value as Theme);
            setOpen(false);
          }}
          onBlur={() => setOpen(false)}
        >
          {THEMES.map((theme) => (
            <option key={theme} value={theme}>
              {LABELS[theme]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

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
