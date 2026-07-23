/**
 * Tiny hash router for GitHub Pages (relative `base`) — no history server needed.
 *
 * Routes:
 *   #/          → agenda (single-stage list)
 *   #/agenda    → agenda
 *   #/timetable → multi-stage horizontal timetable
 *   #/myday     → liked sets, vertical timeline
 */

export const ROUTES = ['agenda', 'timetable', 'myday'] as const;
export type Route = (typeof ROUTES)[number];

const DEFAULT_ROUTE: Route = 'agenda';

export const isRoute = (value: string | null | undefined): value is Route =>
  !!value && (ROUTES as readonly string[]).includes(value);

/** Parse `window.location.hash` into a known route. */
export const parseHashRoute = (hash: string): Route => {
  const raw = hash.replace(/^#\/?/, '').split(/[/?#]/)[0] ?? '';
  if (!raw || raw === '') return DEFAULT_ROUTE;
  return isRoute(raw) ? raw : DEFAULT_ROUTE;
};

/** Build a hash href for a route (keeps existing query string on the URL). */
export const routeHref = (route: Route): string =>
  route === DEFAULT_ROUTE ? '#/' : `#/${route}`;

export const navigateHash = (route: Route): void => {
  const next = routeHref(route);
  if (window.location.hash === next || (route === DEFAULT_ROUTE && !window.location.hash)) {
    // Still notify listeners when already on the default empty hash.
    if (parseHashRoute(window.location.hash) !== route) {
      window.location.hash = next;
    }
    return;
  }
  window.location.hash = next;
};
