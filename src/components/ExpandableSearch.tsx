/**
 * Compact brand-row search: icon when collapsed, inline field when expanded.
 * The input stays mounted (CSS width expand) so focus/typing stay reliable.
 * Parent is notified on open/close so the brand row can free space immediately.
 */

import { useEffect, useId, useRef, useState } from 'react';

interface Props {
  value: string;
  matchCount: number;
  onChange: (value: string) => void;
  /** Fired whenever the field expands or collapses (focus/click, not only typing). */
  onOpenChange?: (open: boolean) => void;
}

export const ExpandableSearch = ({
  value,
  matchCount,
  onChange,
  onOpenChange,
}: Props) => {
  const [open, setOpen] = useState(() => value.trim().length > 0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();
  const hasQuery = value.trim().length > 0;

  // Keep open while a query is active (e.g. after route switches).
  useEffect(() => {
    if (hasQuery) setOpen(true);
  }, [hasQuery]);

  // Tell the parent so it can hide FEEL / free row space on open, not only on type.
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    // Focus after layout has applied brand-searching (frees horizontal space).
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
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
        onClick={() => setOpen(true)}
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
          inputMode="search"
          enterKeyHint="search"
          value={value}
          placeholder="Search acts…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          tabIndex={open ? 0 : -1}
          onFocus={() => setOpen(true)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
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
              inputRef.current?.focus({ preventScroll: true });
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
