/**
 * Load and parse the static lineup document from `public/lineup.json`.
 *
 * The fetch is service-worker friendly: it hits a plain static URL that Workbox
 * precaches, so after first load it resolves instantly and fully offline.
 */

import { useEffect, useState } from 'react';
import { parseStages } from '../lib/lineup';
import type { RawStage, Stage } from '../types/lineup';

interface LineupResult {
  stages: Stage[];
  loading: boolean;
  error: Error | null;
}

export const useLineup = (): LineupResult => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `${import.meta.env.BASE_URL}lineup.json`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load lineup: ${res.status}`);
        return res.json() as Promise<RawStage[]>;
      })
      .then((raw) => {
        if (cancelled) return;
        setStages(parseStages(raw));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { stages, loading, error };
};
