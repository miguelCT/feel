/**
 * "Pin to lock screen" — surfaces the currently playing set as an OS
 * now-playing card via the Media Session API.
 *
 * The card only appears while media is playing, so we loop a short, generated
 * silent WAV to keep the session alive. `loop` isn't always honoured for
 * `data:` URIs on Android Chrome, so an `ended` listener replays as a fallback.
 * Starting audio needs a user gesture (autoplay policy), hence the explicit
 * toggle. Works best on Android Chrome; iOS Safari support is limited and
 * degrades gracefully.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Build a base64 `data:` URI for `seconds` of 16-bit mono PCM silence.
 *
 * Chrome/Android only surfaces a media notification when the media is longer
 * than ~5s, so the default is comfortably above that threshold.
 */
const buildSilentWavDataUri = (seconds = 10, sampleRate = 8000): string => {
  const numSamples = seconds * sampleRate;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  // Sample region is already zero-filled — i.e. silence.

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
};

/** Draw a FEEL 2026 mark for the notification artwork, matching the branding. */
const buildArtwork = (): string => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Deep-blue sky gradient.
  const sky = ctx.createLinearGradient(0, 0, 0, size);
  sky.addColorStop(0, '#3b4cc4');
  sky.addColorStop(1, '#26307f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);

  // Stars.
  ctx.fillStyle = '#eef1ff';
  const stars = [
    [70, 90, 3],
    [430, 70, 4],
    [360, 150, 2.5],
    [130, 170, 2.5],
    [450, 320, 3],
    [64, 300, 3.5],
    [250, 60, 2.5],
  ] as const;
  for (const [x, y, r] of stars) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Seagull.
  ctx.strokeStyle = '#f6a9a0';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(196, 176);
  ctx.bezierCurveTo(226, 146, 256, 146, 276, 176);
  ctx.bezierCurveTo(296, 146, 326, 146, 356, 176);
  ctx.stroke();

  // Wordmark.
  ctx.fillStyle = '#f6a9a0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 116px Helvetica, Arial, sans-serif';
  ctx.fillText('FEEL', size / 2, size / 2 - 24);
  ctx.font = '800 116px Helvetica, Arial, sans-serif';
  ctx.fillText('2026', size / 2, size / 2 + 92);
  return canvas.toDataURL('image/png');
};

export interface NowPlayingControls {
  /** Whether the Media Session API is available at all. */
  supported: boolean;
  /** Whether the now-playing card is currently pinned. */
  pinned: boolean;
  /** Toggle the pinned card on/off (must be called from a user gesture). */
  toggle: () => void;
}

/**
 * Pin the given set to the OS now-playing card:
 * - `title`    → artist playing the set
 * - `subtitle` → stage name
 * - `details`  → static extra line (e.g. the set's time range)
 *
 * Metadata updates automatically as any of these change.
 */
export const useNowPlaying = (
  title: string | null,
  subtitle: string,
  details?: string | null,
): NowPlayingControls => {
  const supported =
    typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  const [pinned, setPinned] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const artworkRef = useRef<string>('');

  const applyMetadata = useCallback(() => {
    if (!supported || !title) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: details ? `${subtitle} · ${details}` : subtitle,
      album: 'Feel 2026',
      artwork: [
        { src: artworkRef.current, sizes: '512x512', type: 'image/png' },
      ],
    });
  }, [supported, title, subtitle, details]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPinned(false);
    if (supported) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }, [supported]);

  const start = useCallback(async () => {
    if (!supported) return;
    if (!audioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      // iOS reads a file's real duration and paints a scrubber/timer on the
      // lock screen, ignoring `setPositionState`. A live silent MediaStream has
      // no duration, so iOS treats it as a live stream and shows no timer.
      // Android Chrome, however, only raises its media notification for a real
      // file-backed track, so keep the WAV loop there.
      const isIOS =
        /iP(hone|od|ad)/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (isIOS && AudioCtx) {
        try {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const dest = ctx.createMediaStreamDestination();
          const gain = ctx.createGain();
          gain.gain.value = 0; // fully silent
          const osc = ctx.createOscillator();
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
          audio.srcObject = dest.stream;
        } catch {
          /* Web Audio unavailable — fall through to the WAV loop below. */
        }
      }
      if (!audio.srcObject) {
        // Fallback: fixed-length silent WAV, replayed on `ended` for browsers
        // that ignore `loop` on data: URIs (older Android Chrome).
        audio.src = buildSilentWavDataUri();
        audio.addEventListener('ended', () => {
          audio.currentTime = 0;
          void audio.play();
        });
      }
      audioRef.current = audio;
    }
    if (!artworkRef.current) artworkRef.current = buildArtwork();
    try {
      // A suspended AudioContext must be resumed from within the user gesture.
      await audioCtxRef.current?.resume();
      await audioRef.current.play();
      // Set metadata immediately so the card has content the instant it shows.
      applyMetadata();
      navigator.mediaSession.playbackState = 'playing';
      // Advertise the session as live (no defined end) so the OS card hides the
      // progress bar and elapsed/total time.
      try {
        navigator.mediaSession.setPositionState({ duration: Infinity });
      } catch {
        // Some builds reject a non-finite duration — just clear any state.
        try {
          navigator.mediaSession.setPositionState();
        } catch {
          /* position state unsupported — nothing to suppress */
        }
      }
      navigator.mediaSession.setActionHandler('pause', () => stop());
      navigator.mediaSession.setActionHandler('play', () => {
        void audioRef.current?.play();
        navigator.mediaSession.playbackState = 'playing';
      });
      setPinned(true);
    } catch {
      // Autoplay blocked or unsupported — leave the card unpinned.
      setPinned(false);
    }
  }, [supported, stop, applyMetadata]);

  const toggle = useCallback(() => {
    if (pinned) stop();
    else void start();
  }, [pinned, start, stop]);

  // Keep the card's metadata in sync with the current set.
  useEffect(() => {
    if (!pinned || !supported) return;
    if (!title) {
      stop();
      return;
    }
    applyMetadata();
  }, [pinned, supported, title, stop, applyMetadata]);

  // Pause the silent loop if the component ever unmounts.
  useEffect(() => () => audioRef.current?.pause(), []);

  return { supported, pinned, toggle };
};
