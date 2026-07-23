/**
 * Compact brand-row search: icon when collapsed, inline field when expanded.
 * The input stays mounted (CSS width expand) so focus/typing stay reliable.
 */

import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  value: string;
  matchCount: number;
  onChange: (value: string) => void;
}

export const ExpandableSearch = ({ value, matchCount, onChange }: Props) => {
  const [open, setOpen] = useState(() => value.trim().length > 0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();
  const hasQuery = value.trim().length > 0;

  // Keep open while a query is active (e.g. after route switches).
  useEffect(() => {
    if (hasQuery) setOpen(true);
  }, [hasQuery]);

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

  return (
    <div
      ref={rootRef}
      className={open ? 'search-shell is-open' : 'search-shell'}
    >
      <button
        type="button"
        className={hasQuery ? 'search-toggle has-query' : 'search-toggle'}
        aria-label={
          hasQuery ? `Search lineup, ${matchCount} matches` : 'Search lineup'
        }
        aria-expanded={open}
        aria-controls={inputId}
        title="Search (/)"
        tabIndex={open ? -1 : 0}
        onClick={() => {
          setOpen(true);
          // Focus on the next frame so the expanded field is visible first.
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <SearchIcon />
        {!open && hasQuery && (
          <span className="search-badge" aria-hidden="true">
            {matchCount > 99 ? '99+' : matchCount}
          </span>
        )}
      </button>

      <div className="search-field">
        <label className="visually-hidden" htmlFor={inputId}>
          Search lineup
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className="search-input"
          type="text"
          value={value}
          placeholder="Search acts…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          tabIndex={open ? 0 : -1}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            // Don't collapse when focus moves to the clear/toggle inside the shell.
            const next = e.relatedTarget as Node | null;
            if (next && rootRef.current?.contains(next)) return;
            collapseIfEmpty();
          }}
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
        {hasQuery ? (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear search"
            tabIndex={open ? 0 : -1}
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
