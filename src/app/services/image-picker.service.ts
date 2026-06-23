import { Injectable } from '@angular/core';

/**
 * Picks an image and returns it as a COMPRESSED data-URL string (stored inline in
 * the draft, baked into layout.json on deploy). Raw phone photos are multi-MB; left
 * uncompressed they bloat layout.json to tens of MB and OOM-crash the LCD when the
 * LAN plugin serializes the payload. So every image is downscaled (max edge) and
 * re-encoded as JPEG to keep the payload small. Works in browser + Capacitor WebView.
 */
@Injectable({ providedIn: 'root' })
export class ImagePickerService {
  /** Max longest-edge px and JPEG quality. Images are deployed as separate files
   *  (referenced by ntimg:<id>), not embedded base64 — so the LCD renderer loads them
   *  lazily/evictably and only the current page's images sit in memory. 1080px keeps
   *  them sharp on the 1920×540 LCD while staying light. */
  private static MAX_EDGE = 1080;
  private static QUALITY = 0.8;

  async pick(accept = 'image/*'): Promise<string | null> {
    const raw = await this.readFile(accept);
    if (!raw) return null;
    try { return await this.downscale(raw); }
    catch { return raw; }   // fallback: original (rare)
  }

  /** Pick a file and return its data-URL UNCHANGED (no downscale) — used for video
   *  where re-encoding isn't possible in the WebView. Returns the MIME-typed data URI. */
  async pickRaw(accept: string): Promise<string | null> {
    return this.readFile(accept);
  }

  private readFile(accept: string): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  /** Draw to a canvas at a capped size and re-encode as JPEG → small data URL. */
  private downscale(dataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const max = ImagePickerService.MAX_EDGE;
        let { width, height } = img;
        if (width > max || height > max) {
          if (width >= height) { height = Math.round((height * max) / width); width = max; }
          else { width = Math.round((width * max) / height); height = max; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, width, height);
        try { resolve(canvas.toDataURL('image/jpeg', ImagePickerService.QUALITY)); }
        catch { resolve(dataUrl); }
      };
      img.onerror = () => reject(new Error('decode failed'));
      img.src = dataUrl;
    });
  }
}
