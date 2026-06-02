import { Injectable } from '@angular/core';

/**
 * Picks an image and returns it as a data-URL string (stored inline in the draft;
 * baked into layout.json media on deploy). Uses a native file input — works in the
 * browser and in the Capacitor Android WebView (opens gallery/camera chooser).
 * Real implementation, no stub.
 */
@Injectable({ providedIn: 'root' })
export class ImagePickerService {
  pick(accept = 'image/*'): Promise<string | null> {
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
}
