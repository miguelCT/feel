/**
 * Compact brand-row search: icon when collapsed, inline field when expanded.
 * Adds no vertical height beyond the existing header row.
 */

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  matchCount: number;
  onChange: (value: string) => void;
}

export const ExpandableSearch = ({ value, matchCount, onChange }: Props) => {
  const [open, setOpen] = useState(() => value.trim().length > 0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // "/" opens search when focus is not already in an editable field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const collapseIfEmpty = () => {
    if (!value.trim()) setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        className={
          value.trim()
            ? 'search-toggle has-query'
            : 'search-toggle'
        }
        aria-label={
          value.trim()
            ? `Search lineup, ${matchCount} matches`
            : 'Search lineup'
        }
        title="Search (/)"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        {value.trim() !== '' && (
          <span className="search-badge" aria-hidden="true">
            {matchCount > 99 ? '99+' : matchCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="search-field">
      <SearchIcon />
      <input
        ref={inputRef}
        className="search-input"
        type="search"
        value={value}
        placeholder="Search acts…"
        aria-label="Search lineup"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onBlur={collapseIfEmpty}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            if (value) onChange('');
            else {
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }
        }}
      />
      {value ? (
        <button
          type="button"
          className="search-clear"
          aria-label="Clear search"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
};

const SearchIcon = () => (
  <svg
    className="search-icon"
    viewBox="0 0 24 24"
    width="14"
    height="14"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
