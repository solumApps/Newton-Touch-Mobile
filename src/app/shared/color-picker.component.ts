import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Reusable colour field for the theme wizard. Preset swatches + a fully in-app
 * custom picker (Hue / Saturation / Lightness sliders) — no native OS colour
 * dialog, so it looks and behaves the same on Android, iOS and web.
 * `value` may be a hex (#RRGGBB) or a CSS gradient string (presets only).
 */
@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
})
export class ColorPickerComponent {
  @Input() label = 'Color';
  @Input() hint = '';
  @Input() value = '#2F006D';
  @Input() presets: string[] = ['#2F006D', '#001973', '#0F172A', '#FFCD00', '#10B981', '#FFFFFF', '#EF4444'];
  @Output() valueChange = new EventEmitter<string>();
  /** When set, shows a "Reset to default" affordance. Clicking emits `reset` so the
   *  parent can clear the stored value (undefined = use the built-in default). */
  @Input() allowReset = false;
  @Output() reset = new EventEmitter<void>();
  /** Whether to offer the "transparent" swatch. Off for things like map markers
   *  where a transparent colour is meaningless. */
  @Input() allowTransparent = true;

  customOpen = false;
  hue = 270; sat = 65; light = 45;

  pick(c: string): void { this.value = c; this.valueChange.emit(c); }
  doReset(): void { this.customOpen = false; this.reset.emit(); }
  onHex(h: string): void { if (/^[0-9a-fA-F]{6}$/.test(h)) this.pick('#' + h); }
  strip(v: string): string { return v?.startsWith('#') ? v.slice(1) : ''; }
  toHex(v: string): string { return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#2F006D'; }

  /** Open the in-app picker, seeding the sliders from the current colour. */
  openCustom(): void {
    const { h, s, l } = this.hexToHsl(this.toHex(this.value));
    this.hue = Math.round(h); this.sat = Math.round(s); this.light = Math.round(l);
    this.customOpen = true;
  }
  closeCustom(): void { this.customOpen = false; }
  applyHsl(): void { this.pick(this.hslToHex(this.hue, this.sat, this.light)); }

  get preview(): string { return this.hslToHex(this.hue, this.sat, this.light); }
  /** CSS gradient for the saturation track (grey → full colour at current hue/light). */
  get satTrack(): string {
    return `linear-gradient(90deg, ${this.hslToHex(this.hue, 0, this.light)}, ${this.hslToHex(this.hue, 100, this.light)})`;
  }
  /** CSS gradient for the lightness track (black → hue → white). */
  get lightTrack(): string {
    return `linear-gradient(90deg, #000, ${this.hslToHex(this.hue, this.sat, 50)}, #fff)`;
  }

  // ---- colour math (no deps) ----
  private hslToHex(h: number, s: number, l: number): string {
    s /= 100; l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }
  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return { h: this.hue, s: this.sat, l: this.light };
    const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0; const l = (max + min) / 2; const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h, s: s * 100, l: l * 100 };
  }
}
