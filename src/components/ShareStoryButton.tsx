/**
 * Generate a 9:16 My day story PNG, then share / copy / download it.
 */

import { useEffect, useState } from 'react';
import type { MyDayDay } from '../lib/myDay';
import {
  blobToFile,
  canShareImageFile,
  copyImageBlob,
  downloadImageBlob,
  shareImageFile,
} from '../lib/shareImage';
import {
  STORY_FILENAME,
  STORY_SHARE_TEXT,
  STORY_SHARE_TITLE,
  renderMyDayStory,
} from '../lib/shareStory';
import type { Theme } from '../lib/theme';

interface Props {
  days: MyDayDay[];
  theme: Theme;
  disabled?: boolean;
}

type Status = 'idle' | 'working' | 'ready' | 'error';

export const ShareStoryButton = ({
  days,
  theme,
  disabled = false,
}: Props) => {
  const [status, setStatus] = useState<Status>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openPreview = (next: Blob) => {
    const url = URL.createObjectURL(next);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(next);
    setPreviewUrl(url);
    setStatus('ready');
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setStatus('idle');
    setMessage(null);
  };

  const generate = async () => {
    if (disabled || status === 'working') return;
    setStatus('working');
    setMessage(null);
    try {
      const next = await renderMyDayStory(days, theme);
      const file = blobToFile(next, STORY_FILENAME);

      // Prefer the native share sheet on phones; fall back to a preview panel.
      if (canShareImageFile(file)) {
        const shared = await shareImageFile(
          file,
          STORY_SHARE_TITLE,
          STORY_SHARE_TEXT,
        );
        if (shared) {
          setStatus('idle');
          return;
        }
      }

      openPreview(next);
    } catch {
      setStatus('error');
      setMessage('Could not create the story image.');
    }
  };

  const onShare = async () => {
    if (!blob) return;
    const file = blobToFile(blob, STORY_FILENAME);
    const ok = await shareImageFile(file, STORY_SHARE_TITLE, STORY_SHARE_TEXT);
    setMessage(ok ? 'Shared' : 'Share isn’t available — try Copy or Download.');
  };

  const onCopy = async () => {
    if (!blob) return;
    const ok = await copyImageBlob(blob);
    setMessage(
      ok ? 'Copied to clipboard' : 'Copy isn’t available here — try Download.',
    );
  };

  const onDownload = () => {
    if (!blob) return;
    downloadImageBlob(blob, STORY_FILENAME);
    setMessage('Downloaded');
  };

  return (
    <>
      <button
        type="button"
        className="myday-share-btn"
        onClick={generate}
        disabled={disabled || status === 'working'}
        aria-busy={status === 'working'}
      >
        {status === 'working' ? 'Creating…' : 'Share story'}
      </button>

      {status === 'error' && message && (
        <p className="myday-share-status" role="status">
          {message}
        </p>
      )}

      {previewUrl && blob && (
        <div
          className="story-modal"
          role="dialog"
          aria-modal="true"
          aria-label="My day story preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) closePreview();
          }}
        >
          <div className="story-modal-panel">
            <img
              className="story-modal-image"
              src={previewUrl}
              alt="FEEL 2026 My day story preview"
            />
            <div className="story-modal-actions">
              <button type="button" className="story-action" onClick={onShare}>
                Share
              </button>
              <button type="button" className="story-action" onClick={onCopy}>
                Copy
              </button>
              <button
                type="button"
                className="story-action"
                onClick={onDownload}
              >
                Download
              </button>
              <button
                type="button"
                className="story-action story-action-ghost"
                onClick={closePreview}
              >
                Close
              </button>
            </div>
            {message && (
              <p className="story-modal-status" role="status">
                {message}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
