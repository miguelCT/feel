/**
 * Artist image resolution.
 *
 * Images live in `public/images/` named after the slugified artist. Keeping
 * this behind a single helper means a future switch to remote-fetched images
 * only touches this file.
 */

/** Turn an artist name into a filesystem/URL-safe slug. */
export const slugify = (artist: string): string =>
  artist
    .toLowerCase()
    .normalize('NFKD')
    // strip diacritics
    .replace(/[\u0300-\u036f]/g, '')
    // collapse anything non-alphanumeric into single hyphens
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Resolve the local image URL for an artist. Uses Vite's BASE_URL so it works
 * both in dev and when deployed under a GitHub Pages sub-path.
 */
export const resolveArtistImage = (
  artist: string,
  ext = 'jpg',
): string => `${import.meta.env.BASE_URL}images/${slugify(artist)}.${ext}`;
