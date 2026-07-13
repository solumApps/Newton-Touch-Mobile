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
   *  card-tile images sharp on the 1920×540 LCD while staying light; callers whose
   *  images can render wider than that (canvas/promo elements span up to the full
   *  1920px screen) pass a larger maxEdge so the LCD never has to upscale. */
  private static MAX_EDGE = 1080;
  private static QUALITY = 0.8;

  async pick(accept = 'image/*', maxEdge = ImagePickerService.MAX_EDGE): Promise<string | null> {
    const raw = await this.readFile(accept);
    if (!raw) return null;
    try { return await this.downscale(raw, maxEdge); }
    catch { return raw; }   // fallback: original (rare)
  }

  /** Pick a file and return its data-URL UNCHANGED (no downscale) — used for video
   *  where re-encoding isn't possible in the WebView. Returns the MIME-typed data URI. */
  async pickRaw(accept: string): Promise<string | null> {
    return this.readFile(accept);
  }

  /** Pick a file and return its raw bytes — used for archives (e.g. the 360° spin
   *  frames ZIP) that must be parsed rather than displayed. */
  pickBytes(accept: string): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result instanceof ArrayBuffer ? new Uint8Array(reader.result) : null);
        reader.onerror = () => resolve(null);
        reader.readAsArrayBuffer(file);
      };
      input.click();
    });
  }

  /** Downscale + JPEG-re-encode an arbitrary data URL (same pipeline as pick()) —
   *  used per-frame when importing a 360° spin ZIP so a heavy sequence can't
   *  exhaust the LCD's memory. */
  async compress(dataUrl: string, maxEdge = ImagePickerService.MAX_EDGE): Promise<string> {
    try { return await this.downscale(dataUrl, maxEdge); }
    catch { return dataUrl; }
  }

  /** Highest-fidelity pick (Product Promo product images): the ORIGINAL file
   *  bytes pass through UNTOUCHED when the image already fits maxEdge and the
   *  transfer budget — no canvas redraw, no JPEG generation loss, PNG cutouts
   *  keep their alpha and crisp edges. Only a genuinely oversized image is
   *  rescaled, and then at high quality with its format preserved (PNG stays
   *  PNG unless the result would blow the LCD transfer budget). */
  async pickHiFi(accept = 'image/*', maxEdge = 1920, maxBytes = ImagePickerService.HIFI_MAX_BYTES): Promise<string | null> {
    const raw = await this.readFile(accept);
    if (!raw) return null;
    try {
      const { w, h } = await this.measure(raw);
      if (Math.max(w, h) <= maxEdge && this.dataUrlBytes(raw) <= maxBytes) return raw;
      const isPng = raw.startsWith('data:image/png');
      if (isPng) {
        const png = await this.downscale(raw, maxEdge, 'image/png');
        if (this.dataUrlBytes(png) <= maxBytes) return png;
      }
      return await this.downscale(raw, maxEdge, 'image/jpeg', ImagePickerService.HIFI_QUALITY);
    } catch { return raw; }   // undecodable in the WebView → pass through as-is
  }

  /** ~decoded bytes of a data URL (base64 length × 3/4). */
  private dataUrlBytes(dataUrl: string): number {
    const comma = dataUrl.indexOf(',');
    return Math.floor((dataUrl.length - (comma + 1)) * 0.75);
  }

  private measure(dataUrl: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error('decode failed'));
      img.src = dataUrl;
    });
  }

  /** Keep even hi-fi images under the LAN-transfer message budget (each image
   *  ships as ONE message through the Chromium-60 native bridge on the LCD). */
  private static readonly HIFI_MAX_BYTES = 2_500_000;
  private static readonly HIFI_QUALITY = 0.92;

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

  /** Draw to a canvas at a capped size and re-encode (JPEG by default; the hi-fi
   *  path passes 'image/png' to keep alpha/crisp edges) → small data URL. */
  private downscale(dataUrl: string, maxEdge = ImagePickerService.MAX_EDGE, mime: 'image/jpeg' | 'image/png' = 'image/jpeg', quality = ImagePickerService.QUALITY): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const max = maxEdge;
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
        try { resolve(canvas.toDataURL(mime, quality)); }
        catch { resolve(dataUrl); }
      };
      img.onerror = () => reject(new Error('decode failed'));
      img.src = dataUrl;
    });
  }
}
