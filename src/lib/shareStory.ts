/**
 * Render a 9:16 Instagram Story PNG of the user's liked My day lineup.
 *
 * Branding sits as a watermark so content can use almost the full frame.
 * Sets pack into adaptive columns so a full weekend of likes can fit.
 * Colours / type follow the active app theme.
 */

import type { MyDayDay } from './myDay';
import type { Theme } from './theme';
import { formatClock } from './time';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export type StorySet = {
  startMs: number;
  artist: string;
  stageName: string;
  live: boolean;
};

export type StoryDayBlock = {
  day: string;
  sets: StorySet[];
};

/** Flatten My day days into day blocks of chronological sets. */
export const toStoryDays = (days: MyDayDay[]): StoryDayBlock[] =>
  days.map((day) => ({
    day: day.day,
    sets: day.rows.flatMap((row) =>
      row.entries.map((entry) => ({
        startMs: entry.slot.startMs,
        artist: entry.slot.artist,
        stageName: entry.stageName,
        live: entry.slot.type === 'LIVE',
      })),
    ),
  }));

/** @deprecated Prefer `toStoryDays` — kept for existing call sites/tests. */
export type StoryLine =
  | { kind: 'day'; day: string }
  | {
      kind: 'set';
      startMs: number;
      artist: string;
      stageName: string;
      live: boolean;
    };

/** Flatten to a linear script (legacy helper used by tests). */
export const flattenStoryLines = (days: MyDayDay[]): StoryLine[] => {
  const lines: StoryLine[] = [];
  for (const block of toStoryDays(days)) {
    lines.push({ kind: 'day', day: block.day });
    for (const set of block.sets) {
      lines.push({ kind: 'set', ...set });
    }
  }
  return lines;
};

export interface StoryPalette {
  theme: Theme;
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  fg: string;
  muted: string;
  accent: string;
  watermark: string;
  star: string;
  font: string;
  /** Soft radial glow colour (neon); null to skip. */
  glow: string | null;
  showStars: boolean;
}

export const getStoryPalette = (theme: Theme): StoryPalette => {
  switch (theme) {
    case 'brutalist':
      return {
        theme,
        bgTop: '#222222',
        bgMid: '#1a1a1a',
        bgBottom: '#111111',
        fg: '#ffffff',
        muted: '#8a8a8a',
        accent: '#2563eb',
        watermark: 'rgba(255, 255, 255, 0.045)',
        star: 'rgba(255, 255, 255, 0.25)',
        font: '"Helvetica Neue", Arial, sans-serif',
        glow: null,
        showStars: false,
      };
    case 'neon':
      return {
        theme,
        bgTop: '#12131a',
        bgMid: '#0b0b0d',
        bgBottom: '#05060a',
        fg: '#eef1ff',
        muted: '#7c80a0',
        accent: '#24e0cf',
        watermark: 'rgba(238, 241, 255, 0.05)',
        star: 'rgba(238, 241, 255, 0.35)',
        font: '"Segoe UI", system-ui, sans-serif',
        glow: 'rgba(236, 72, 153, 0.22)',
        showStars: true,
      };
    case 'seaside':
    default:
      return {
        theme: 'seaside',
        bgTop: '#3b4cc4',
        bgMid: '#232e7a',
        bgBottom: '#1a225c',
        fg: '#fbeee8',
        muted: 'rgba(251, 238, 232, 0.58)',
        accent: '#f6a9a0',
        watermark: 'rgba(251, 238, 232, 0.06)',
        star: 'rgba(251, 238, 232, 0.45)',
        font: '"Avenir Next", "Segoe UI", system-ui, sans-serif',
        glow: 'rgba(246, 169, 160, 0.14)',
        showStars: true,
      };
  }
};

export interface StoryLayoutMetrics {
  columns: number;
  setH: number;
  dayH: number;
  dayGap: number;
  artistSize: number;
  metaSize: number;
  daySize: number;
  twoLine: boolean;
}

export interface StoryPlan {
  metrics: StoryLayoutMetrics;
  /** Day blocks included in the render (sets may be trimmed on last resort). */
  days: StoryDayBlock[];
  overflow: number;
}

const CONTENT_PAD_X = 48;
const CONTENT_TOP = 72;
const CONTENT_BOTTOM = 64;
const COL_GAP = 22;

const METRIC_CANDIDATES: StoryLayoutMetrics[] = [
  {
    columns: 1,
    setH: 58,
    dayH: 44,
    dayGap: 18,
    artistSize: 30,
    metaSize: 20,
    daySize: 24,
    twoLine: true,
  },
  {
    columns: 2,
    setH: 52,
    dayH: 40,
    dayGap: 16,
    artistSize: 24,
    metaSize: 17,
    daySize: 22,
    twoLine: true,
  },
  {
    columns: 2,
    setH: 40,
    dayH: 36,
    dayGap: 14,
    artistSize: 22,
    metaSize: 15,
    daySize: 20,
    twoLine: true,
  },
  {
    columns: 3,
    setH: 38,
    dayH: 34,
    dayGap: 12,
    artistSize: 18,
    metaSize: 13,
    daySize: 18,
    twoLine: true,
  },
  {
    columns: 3,
    setH: 32,
    dayH: 30,
    dayGap: 10,
    artistSize: 16,
    metaSize: 12,
    daySize: 16,
    twoLine: false,
  },
  {
    columns: 3,
    setH: 26,
    dayH: 28,
    dayGap: 8,
    artistSize: 14,
    metaSize: 11,
    daySize: 15,
    twoLine: false,
  },
];

const dayBlockHeight = (
  setCount: number,
  metrics: StoryLayoutMetrics,
): number => {
  if (setCount <= 0) return 0;
  const rows = Math.ceil(setCount / metrics.columns);
  return metrics.dayH + rows * metrics.setH;
};

const totalHeight = (
  days: StoryDayBlock[],
  metrics: StoryLayoutMetrics,
): number => {
  let h = 0;
  days.forEach((day, i) => {
    h += dayBlockHeight(day.sets.length, metrics);
    if (i < days.length - 1) h += metrics.dayGap;
  });
  return h;
};

/**
 * Pick the roomiest metrics that still fit every set; fall back to densest
 * packing and trim only if even that overflows the frame.
 */
export const planStoryLayout = (
  days: StoryDayBlock[],
  contentHeight: number = STORY_HEIGHT - CONTENT_TOP - CONTENT_BOTTOM,
): StoryPlan => {
  for (const metrics of METRIC_CANDIDATES) {
    if (totalHeight(days, metrics) <= contentHeight) {
      return { metrics, days, overflow: 0 };
    }
  }

  // Last resort: densest metrics, keep as many leading sets as fit.
  const metrics = METRIC_CANDIDATES[METRIC_CANDIDATES.length - 1]!;
  const kept: StoryDayBlock[] = [];
  let used = 0;
  let included = 0;
  const totalSets = days.reduce((n, d) => n + d.sets.length, 0);

  for (const day of days) {
    const gap = kept.length > 0 ? metrics.dayGap : 0;
    const sets: StorySet[] = [];

    for (const set of day.sets) {
      const withSet = dayBlockHeight(sets.length + 1, metrics);
      const without = sets.length === 0 ? 0 : dayBlockHeight(sets.length, metrics);
      const delta =
        sets.length === 0 ? gap + withSet : withSet - without;
      if (used + delta > contentHeight) {
        if (sets.length > 0) kept.push({ day: day.day, sets });
        return {
          metrics,
          days: kept,
          overflow: totalSets - included - sets.length,
        };
      }
      sets.push(set);
      used += delta;
      included += 1;
    }

    if (sets.length > 0) kept.push({ day: day.day, sets });
  }

  return { metrics, days: kept, overflow: totalSets - included };
};

/** Legacy linear fitter — rebuilt from the column planner for older tests. */
export const fitStoryLines = (
  lines: StoryLine[],
  contentHeight: number,
): { visible: StoryLine[]; overflow: number; compact: boolean } => {
  const days: StoryDayBlock[] = [];
  let current: StoryDayBlock | null = null;
  for (const line of lines) {
    if (line.kind === 'day') {
      current = { day: line.day, sets: [] };
      days.push(current);
    } else if (current) {
      current.sets.push({
        startMs: line.startMs,
        artist: line.artist,
        stageName: line.stageName,
        live: line.live,
      });
    }
  }
  const plan = planStoryLayout(days, contentHeight);
  const visible: StoryLine[] = [];
  for (const block of plan.days) {
    visible.push({ kind: 'day', day: block.day });
    for (const set of block.sets) {
      visible.push({ kind: 'set', ...set });
    }
  }
  return {
    visible,
    overflow: plan.overflow,
    compact: plan.metrics.columns > 1 || !plan.metrics.twoLine,
  };
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
  ctx.lineWidth = Math.max(2, 8 * scale);
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
    [0.08, 0.05, 3],
    [0.22, 0.09, 2.2],
    [0.78, 0.04, 3.5],
    [0.9, 0.11, 2.4],
    [0.15, 0.18, 2],
    [0.85, 0.2, 2.6],
    [0.05, 0.88, 2.2],
    [0.93, 0.84, 2.8],
    [0.48, 0.93, 2],
  ];
  for (const [nx, ny, r] of stars) {
    ctx.beginPath();
    ctx.arc(nx * w, ny * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawWatermark = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  palette: StoryPalette,
): void => {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.watermark;
  ctx.font = `800 220px ${palette.font}`;
  ctx.fillText('FEEL', w / 2, h * 0.38);
  ctx.font = `800 160px ${palette.font}`;
  ctx.fillText('MY DAY', w / 2, h * 0.52);
  drawSeagull(ctx, w / 2, h * 0.28, 2.4, palette.watermark);
  ctx.restore();
};

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  palette: StoryPalette,
): void => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, palette.bgTop);
  sky.addColorStop(0.55, palette.bgMid);
  sky.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  if (palette.glow) {
    const glow = ctx.createRadialGradient(
      w * 0.15,
      h * 0.08,
      20,
      w * 0.15,
      h * 0.08,
      w * 0.7,
    );
    glow.addColorStop(0, palette.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  if (palette.showStars) drawStars(ctx, w, h, palette.star);
  drawWatermark(ctx, w, h, palette);
};

const countSets = (days: StoryDayBlock[]): number =>
  days.reduce((n, d) => n + d.sets.length, 0);

/** Paint the story onto a canvas and return a PNG blob. */
export const renderMyDayStory = async (
  days: MyDayDay[],
  theme: Theme = 'seaside',
): Promise<Blob> => {
  const w = STORY_WIDTH;
  const h = STORY_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const palette = getStoryPalette(theme);
  drawBackground(ctx, w, h, palette);

  const storyDays = toStoryDays(days);
  const contentHeight = h - CONTENT_TOP - CONTENT_BOTTOM;
  const plan = planStoryLayout(storyDays, contentHeight);
  const { metrics } = plan;
  const innerW = w - CONTENT_PAD_X * 2;
  const colW =
    (innerW - COL_GAP * Math.max(0, metrics.columns - 1)) / metrics.columns;

  // Tiny chrome — count only; brand lives in the watermark.
  const setTotal = countSets(storyDays);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.accent;
  ctx.font = `800 22px ${palette.font}`;
  ctx.fillText('FEEL 2026', CONTENT_PAD_X, 36);
  ctx.fillStyle = palette.muted;
  ctx.font = `700 18px ${palette.font}`;
  ctx.textAlign = 'right';
  ctx.fillText(
    setTotal === 1 ? '1 set' : `${setTotal} sets`,
    w - CONTENT_PAD_X,
    36,
  );

  let y = CONTENT_TOP;
  for (let di = 0; di < plan.days.length; di++) {
    const block = plan.days[di]!;

    ctx.textAlign = 'left';
    ctx.fillStyle = palette.accent;
    ctx.font = `800 ${metrics.daySize}px ${palette.font}`;
    ctx.fillText(block.day.toUpperCase(), CONTENT_PAD_X, y + metrics.dayH * 0.55);
    ctx.fillStyle =
      palette.theme === 'brutalist'
        ? 'rgba(255,255,255,0.18)'
        : palette.accent;
    ctx.globalAlpha = palette.theme === 'brutalist' ? 1 : 0.35;
    ctx.fillRect(
      CONTENT_PAD_X,
      y + metrics.dayH - 8,
      innerW,
      palette.theme === 'brutalist' ? 2 : 2,
    );
    ctx.globalAlpha = 1;
    y += metrics.dayH;

    block.sets.forEach((set, i) => {
      const col = i % metrics.columns;
      const row = Math.floor(i / metrics.columns);
      const x = CONTENT_PAD_X + col * (colW + COL_GAP);
      const rowY = y + row * metrics.setH;
      const time = formatClock(set.startMs);
      const artistLabel = set.live ? `${set.artist} · Live` : set.artist;

      if (metrics.twoLine) {
        ctx.fillStyle = palette.muted;
        ctx.font = `700 ${metrics.metaSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(time, x, rowY + metrics.setH * 0.32);

        ctx.fillStyle = palette.fg;
        ctx.font = `800 ${metrics.artistSize}px ${palette.font}`;
        ctx.fillText(
          truncate(ctx, artistLabel, colW - 8),
          x,
          rowY + metrics.setH * 0.62,
        );

        // Stage tucked on the time row, right-aligned in the cell.
        ctx.fillStyle = palette.muted;
        ctx.font = `700 ${Math.max(11, metrics.metaSize - 1)}px ${palette.font}`;
        ctx.textAlign = 'right';
        ctx.fillText(
          truncate(ctx, set.stageName, colW * 0.55),
          x + colW,
          rowY + metrics.setH * 0.32,
        );
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = palette.muted;
        ctx.font = `700 ${metrics.metaSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillText(time, x, rowY + metrics.setH * 0.55);

        const timeW = ctx.measureText(time).width + 8;
        ctx.fillStyle = palette.fg;
        ctx.font = `800 ${metrics.artistSize}px ${palette.font}`;
        ctx.fillText(
          truncate(ctx, `${artistLabel} · ${set.stageName}`, colW - timeW),
          x + timeW,
          rowY + metrics.setH * 0.55,
        );
      }
    });

    const rows = Math.ceil(block.sets.length / metrics.columns);
    y += rows * metrics.setH;
    if (di < plan.days.length - 1) y += metrics.dayGap;
  }

  if (plan.overflow > 0) {
    ctx.fillStyle = palette.fg;
    ctx.font = `800 20px ${palette.font}`;
    ctx.textAlign = 'left';
    ctx.fillText(
      `+${plan.overflow} more`,
      CONTENT_PAD_X,
      Math.min(y + 24, h - 28),
    );
  }

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
