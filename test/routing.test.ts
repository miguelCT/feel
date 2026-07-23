import { describe, expect, it } from 'vitest';
import { parseHashRoute, routeHref } from '../src/lib/routing';

describe('parseHashRoute', () => {
  it('defaults empty hash to agenda', () => {
    expect(parseHashRoute('')).toBe('agenda');
    expect(parseHashRoute('#')).toBe('agenda');
    expect(parseHashRoute('#/')).toBe('agenda');
  });

  it('recognizes known routes', () => {
    expect(parseHashRoute('#/agenda')).toBe('agenda');
    expect(parseHashRoute('#/timetable')).toBe('timetable');
  });

  it('falls back on unknown routes', () => {
    expect(parseHashRoute('#/nope')).toBe('agenda');
  });
});

describe('routeHref', () => {
  it('uses #/ for the default agenda route', () => {
    expect(routeHref('agenda')).toBe('#/');
    expect(routeHref('timetable')).toBe('#/timetable');
  });
});
