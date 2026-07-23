/**
 * Render a 9:16 Instagram Story PNG of the user's liked My day lineup.
 *
 * Drawing stays on a canvas (no DOM snapshot) so results are stable across
 * themes and don't depend on on-screen scroll/collapse state.
 */

import type { MyDayDay } from './myDay';
import { formatClock } from './time';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export type StoryLine =
  | { kind: 'day'; day: string }
  | {
      kind: 'set';
      startMs: number;
      artist: string;
      stageName: string;
      live: boolean;
    };

/** Flatten My day days into a linear story script (day headers + sets). */
export const flattenStoryLines = (days: MyDayDay[]): StoryLine[] => {
  const lines: StoryLine[] = [];
  for (const day of days) {
    lines.push({ kind: 'day', day: day.day });
    for (const row of day.rows) {
      for (const entry of row.entries) {
        lines.push({
          kind: 'set',
          startMs: entry.slot.startMs,
          artist: entry.slot.artist,
          stageName: entry.stageName,
          live: entry.slot.type === 'LIVE',
        });
      }
    }
  }
  return lines;
};

export interface StoryFit {
  visible: StoryLine[];
  overflow: number;
  /** Compact single-line sets when the list is dense. */
  compact: boolean;
}

/**
 * Fit as many lines as possible into the story content band.
 * Day headers always keep their following sets when space allows; leftover
 * sets are counted in `overflow` and surfaced as "+N more".
 */
export const fitStoryLines = (
  lines: StoryLine[],
  contentHeight: number,
): StoryFit => {
  const setCount = lines.filter((l) => l.kind === 'set').length;
  const compact = setCount > 14;

  const dayH = compact ? 56 : 64;
  const setH = compact ? 52 : 78;
  const moreH = 48;

  const visible: StoryLine[] = [];
  let used = 0;
  let overflow = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const h = line.kind === 'day' ? dayH : setH;
    const remainingAfter = lines.slice(i + 1).filter((l) => l.kind === 'set')
      .length;
    // Reserve room for a "+N more" footer when this line won't be the last set.
    const needFooter =
      line.kind === 'set' && remainingAfter > 0 ? moreH : 0;

    if (used + h + needFooter > contentHeight && visible.length > 0) {
      overflow =
        lines.slice(i).filter((l) => l.kind === 'set').length;
      // Drop a trailing day header with no sets under it.
      if (visible[visible.length - 1]?.kind === 'day') visible.pop();
      break;
    }

    visible.push(line);
    used += h;
  }

  return { visible, overflow, compact };
};

const truncate = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ellipsis;
};

const drawSeagull = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  color: string,
): void => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 10 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 80 * scale, cy);
  ctx.bezierCurveTo(
    cx - 40 * scale,
    cy - 36 * scale,
    cx - 10 * scale,
    cy - 36 * scale,
    cx,
    cy,
  );
  ctx.bezierCurveTo(
    cx + 10 * scale,
    cy - 36 * scale,
    cx + 40 * scale,
    cy - 36 * scale,
    cx + 80 * scale,
    cy,
  );
  ctx.stroke();
  ctx.restore();
};

const drawStars = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
): void => {
  ctx.fillStyle = color;
  const stars: Array<[number, number, number]> = [
    [0.08, 0.05, 3.5],
    [0.22, 0.09, 2.5],
    [0.78, 0.04, 4],
    [0.9, 0.11, 2.8],
    [0.15, 0.18, 2.2],
    [0.85, 0.2, 3],
    [0.05, 0.88, 2.5],
    [0.93, 0.84, 3.2],
  ];
  for (const [nx, ny, r] of stars) {
    ctx.beginPath();
    ctx.arc(nx * w, ny * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** Paint the story onto a canvas and return a PNG blob. */
export const renderMyDayStory = async (days: MyDayDay[]): Promise<Blob> => {
  const w = STORY_WIDTH;
  const h = STORY_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const padX = 72;
  const contentTop = 420;
  const contentBottom = h - 140;
  const contentHeight = contentBottom - contentTop;

  // Seaside sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#3b4cc4');
  sky.addColorStop(0.55, '#232e7a');
  sky.addColorStop(1, '#1a225c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawStars(ctx, w, h, 'rgba(251, 238, 232, 0.55)');
  drawSeagull(ctx, w / 2, 118, 1.15, '#f6a9a0');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f6a9a0';
  ctx.font = '800 96px "Avenir Next", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('FEEL 2026', w / 2, 220);

  ctx.fillStyle = '#fbeee8';
  ctx.font = '800 64px "Avenir Next", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('My day', w / 2, 310);

  const setTotal = days.reduce(
    (n, d) => n + d.rows.reduce((m, r) => m + r.entries.length, 0),
    0,
  );
  ctx.fillStyle = 'rgba(251, 238, 232, 0.62)';
  ctx.font = '700 28px "Avenir Next", "Segoe UI", system-ui, sans-serif';
  ctx.fillText(
    setTotal === 1 ? '1 liked set' : `${setTotal} liked sets`,
    w / 2,
    362,
  );

  const lines = flattenStoryLines(days);
  const { visible, overflow, compact } = fitStoryLines(lines, contentHeight);

  const dayH = compact ? 56 : 64;
  const setH = compact ? 52 : 78;
  let y = contentTop;

  ctx.textAlign = 'left';
  for (const line of visible) {
    if (line.kind === 'day') {
      ctx.fillStyle = '#f6a9a0';
      ctx.font = '800 26px "Avenir Next", "Segoe UI", system-ui, sans-serif';
      ctx.fillText(line.day.toUpperCase(), padX, y + dayH * 0.55);
      // Rule under day label.
      ctx.fillStyle = 'rgba(246, 169, 160, 0.35)';
      ctx.fillRect(padX, y + dayH - 10, w - padX * 2, 2);
      y += dayH;
      continue;
    }

    const time = formatClock(line.startMs);
    const artistLabel = line.live ? `${line.artist} · Live` : line.artist;

    if (compact) {
      ctx.fillStyle = 'rgba(251, 238, 232, 0.55)';
      ctx.font = '700 28px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(time, padX, y + setH * 0.55);

      ctx.fillStyle = '#fbeee8';
      ctx.font = '800 30px "Avenir Next", "Segoe UI", system-ui, sans-serif';
      const artistX = padX + 130;
      const maxArtist = w - padX - artistX - 200;
      ctx.fillText(truncate(ctx, artistLabel, maxArtist), artistX, y + setH * 0.55);

      ctx.fillStyle = 'rgba(251, 238, 232, 0.55)';
      ctx.font = '700 24px "Avenir Next", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        truncate(ctx, line.stageName, 190),
        w - padX,
        y + setH * 0.55,
      );
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = 'rgba(251, 238, 232, 0.55)';
      ctx.font = '700 30px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(time, padX, y + 28);

      ctx.fillStyle = '#fbeee8';
      ctx.font = '800 36px "Avenir Next", "Segoe UI", system-ui, sans-serif';
      ctx.fillText(
        truncate(ctx, artistLabel, w - padX * 2 - 140),
        padX + 140,
        y + 28,
      );

      ctx.fillStyle = 'rgba(251, 238, 232, 0.55)';
      ctx.font = '700 26px "Avenir Next", "Segoe UI", system-ui, sans-serif';
      ctx.fillText(
        truncate(ctx, line.stageName, w - padX * 2 - 140),
        padX + 140,
        y + 58,
      );
    }
    y += setH;
  }

  if (overflow > 0) {
    ctx.fillStyle = 'rgba(251, 238, 232, 0.7)';
    ctx.font = '800 28px "Avenir Next", "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `+${overflow} more on My day`,
      padX,
      Math.min(y + 36, contentBottom - 8),
    );
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(251, 238, 232, 0.45)';
  ctx.font = '700 24px "Avenir Next", "Segoe UI", system-ui, sans-serif';
  ctx.fillText('FEEL · my lineup', w / 2, h - 72);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encode failed'))),
      'image/png',
    );
  });
};

export const STORY_FILENAME = 'feel-2026-my-day.png';
export const STORY_SHARE_TITLE = 'My FEEL 2026 day';
export const STORY_SHARE_TEXT = 'My liked sets at FEEL 2026';
