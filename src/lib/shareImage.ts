/**
 * Share / copy / download helpers for generated story PNGs.
 */

/** True when the Web Share API can send an image file. */
export const canShareImageFile = (file: File): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare !== 'function') {
    // Older share implementations: try share and let it fail.
    return true;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
};

/** Share a PNG via the OS sheet when supported. */
export const shareImageFile = async (
  file: File,
  title: string,
  text: string,
): Promise<boolean> => {
  if (!canShareImageFile(file)) return false;
  try {
    await navigator.share({ files: [file], title, text });
    return true;
  } catch (err) {
    // User cancel is not a failure worth surfacing.
    if (err instanceof DOMException && err.name === 'AbortError') return true;
    return false;
  }
};

/** Copy a PNG blob to the clipboard when the browser allows it. */
export const copyImageBlob = async (blob: Blob): Promise<boolean> => {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof ClipboardItem === 'undefined'
  ) {
    return false;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type || 'image/png']: blob }),
    ]);
    return true;
  } catch {
    return false;
  }
};

/** Trigger a local download of the PNG. */
export const downloadImageBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the click has a chance to start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
};

export const blobToFile = (blob: Blob, filename: string): File =>
  new File([blob], filename, { type: blob.type || 'image/png' });
