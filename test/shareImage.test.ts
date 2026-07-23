import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  blobToFile,
  canShareImageFile,
  copyImageBlob,
  downloadImageBlob,
} from '../src/lib/shareImage';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shareImage helpers', () => {
  it('wraps a blob as a named File', () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    const file = blobToFile(blob, 'feel.png');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('feel.png');
    expect(file.type).toBe('image/png');
  });

  it('detects when file share is unavailable', () => {
    vi.stubGlobal('navigator', {});
    const file = blobToFile(new Blob(['x'], { type: 'image/png' }), 'a.png');
    expect(canShareImageFile(file)).toBe(false);
  });

  it('respects navigator.canShare for files', () => {
    const file = blobToFile(new Blob(['x'], { type: 'image/png' }), 'a.png');
    vi.stubGlobal('navigator', {
      share: vi.fn(),
      canShare: ({ files }: { files?: File[] }) => !!files?.length,
    });
    expect(canShareImageFile(file)).toBe(true);
  });

  it('copies an image blob when ClipboardItem is available', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { write } });
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItem {
        constructor(public items: Record<string, Blob>) {}
      },
    );
    const blob = new Blob(['png'], { type: 'image/png' });
    await expect(copyImageBlob(blob)).resolves.toBe(true);
    expect(write).toHaveBeenCalledOnce();
  });

  it('triggers a download via a temporary anchor', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const createElement = vi
      .spyOn(document, 'createElement')
      .mockImplementation(() => {
        return {
          href: '',
          download: '',
          rel: '',
          click,
          remove,
        } as unknown as HTMLAnchorElement;
      });
    const append = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((n) => n);
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: vi.fn(),
    });

    downloadImageBlob(new Blob(['x'], { type: 'image/png' }), 'story.png');
    expect(createElement).toHaveBeenCalledWith('a');
    expect(append).toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
  });
});
