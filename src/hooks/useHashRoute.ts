import { useEffect, useState } from 'react';
import { parseHashRoute, type Route } from '../lib/routing';

/** Current hash route; updates on `hashchange`. */
export const useHashRoute = (): Route => {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? 'agenda' : parseHashRoute(window.location.hash),
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
};
