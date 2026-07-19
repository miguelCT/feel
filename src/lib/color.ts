/**
 * Client-side dominant/vibrant colour extraction using Color Thief.
 *
 * The extracted accent is the most *vibrant* (highest-saturation, reasonably
 * bright) entry from the image palette rather than the raw dominant colour,
 * which tends to be a muddy average. Falls back to the dominant colour, then
 * to a neutral, so callers always get a usable value.
 */

import ColorThief from 'colorthief';

export type RGB = [number, number, number];

export interface ArtistColor {
  hex: string;
  rgb: RGB;
}

const NEUTRAL: ArtistColor = { hex: '#888888', rgb: [136, 136, 136] };

const clamp = (n: number): number => Math.max(0, Math.min(255, Math.round(n)));

export const rgbToHex = ([r, g, b]: RGB): string =>
  `#${[r, g, b]
    .map((c) => clamp(c).toString(16).padStart(2, '0'))
    .join('')}`;

/**
 * Pick a legible ink colour (near-black or white) for text drawn on top of the
 * given background. Uses the perceived-brightness (YIQ) heuristic so the
 * accent block stays readable whatever colour gets extracted per artist.
 */
export const readableInk = ([r, g, b]: RGB): string =>
  (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#0a0a0a' : '#ffffff';

/** HSV saturation/value of an RGB triple, each in the 0..1 range. */
const saturationValue = ([r, g, b]: RGB): { s: number; v: number } => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const v = max / 255;
  const s = max === 0 ? 0 : (max - min) / max;
  return { s, v };
};

/**
 * Score a colour for "vibrancy": mostly saturation, but penalise very dark or
 * blown-out colours so the accent stays lively and readable.
 */
const vibrancyScore = (rgb: RGB): number => {
  const { s, v } = saturationValue(rgb);
  const brightnessPenalty = v < 0.15 || v > 0.97 ? 0.4 : 1;
  return s * brightnessPenalty;
};

const shared = new ColorThief();

/**
 * Extract the vibrant accent colour from an already-loaded, same-origin image.
 * The image MUST be fully loaded (`img.complete === true`) before calling.
 */
export const extractVibrantColor = (img: HTMLImageElement): ArtistColor => {
  try {
    const palette = shared.getPalette(img, 8) ?? [];
    if (palette.length === 0) {
      const dominant = shared.getColor(img);
      return { hex: rgbToHex(dominant), rgb: dominant };
    }
    const best = palette.reduce((a, b) =>
      vibrancyScore(b) > vibrancyScore(a) ? b : a,
    );
    return { hex: rgbToHex(best), rgb: best };
  } catch {
    return NEUTRAL;
  }
};

/**
 * Load an image URL and extract its vibrant colour. Resolves to `null` if the
 * image cannot be loaded (e.g. missing asset) so callers can fall back.
 */
export const extractColorFromUrl = (url: string): Promise<ArtistColor | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(extractVibrantColor(img));
    img.onerror = () => resolve(null);
    img.src = url;
  });
