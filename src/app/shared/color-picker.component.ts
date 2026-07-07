import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeCustomColorService } from '../services/theme-custom-color.service';

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
  @Input() transparentValue = 'transparent';

  /** Enable the two-stop linear-gradient builder (B-3). */
  @Input() allowGradient = false;

  constructor(private customColors: ThemeCustomColorService) {}

  customOpen = false;
  hue = 270; sat = 65; light = 45;

  // ---- Gradient builder state ----
  gradientOpen = false;
  g1 = '#2F006D'; g2 = '#001973'; gAngle = 135;
  g1H = 270; g1S = 65; g1L = 45;
  g2H = 220; g2S = 100; g2L = 23;

  get isGradient(): boolean { return /gradient/i.test(this.value || ''); }
  get gradientCss(): string { return `linear-gradient(${this.gAngle}deg, ${this.g1}, ${this.g2})`; }
  get allPresets(): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of [...(this.presets || []), ...this.customColors.colors]) {
      const k = (c || '').trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
    return out;
  }
  
  openGradient(): void {
    this.customOpen = false;
    const m = /linear-gradient\(\s*(-?[0-9.]+)deg\s*,\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/i.exec(this.value || '');
    if (m) { this.gAngle = parseFloat(m[1]); this.g1 = m[2]; this.g2 = m[3]; }
    this.syncG1Hsl();
    this.syncG2Hsl();
    this.gradientOpen = true;
  }
  closeGradient(): void { this.gradientOpen = false; }
  applyGradient(): void { this.pick(this.gradientCss); }
  
  syncG1Hsl(): void {
    const { h, s, l } = this.hexToHsl(this.toHex(this.g1));
    this.g1H = Math.round(h); this.g1S = Math.round(s); this.g1L = Math.round(l);
  }
  syncG2Hsl(): void {
    const { h, s, l } = this.hexToHsl(this.toHex(this.g2));
    this.g2H = Math.round(h); this.g2S = Math.round(s); this.g2L = Math.round(l);
  }

  applyG1Hsl(): void {
    this.g1 = this.hslToHex(this.g1H, this.g1S, this.g1L);
    this.applyGradient();
  }
  applyG2Hsl(): void {
    this.g2 = this.hslToHex(this.g2H, this.g2S, this.g2L);
    this.applyGradient();
  }

  get g1SatTrack(): string {
    return `linear-gradient(90deg, ${this.hslToHex(this.g1H, 0, this.g1L)}, ${this.hslToHex(this.g1H, 100, this.g1L)})`;
  }
  get g1LightTrack(): string {
    return `linear-gradient(90deg, #000, ${this.hslToHex(this.g1H, this.g1S, 50)}, #fff)`;
  }
  get g2SatTrack(): string {
    return `linear-gradient(90deg, ${this.hslToHex(this.g2H, 0, this.g2L)}, ${this.hslToHex(this.g2H, 100, this.g2L)})`;
  }
  get g2LightTrack(): string {
    return `linear-gradient(90deg, #000, ${this.hslToHex(this.g2H, this.g2S, 50)}, #fff)`;
  }

  onG1(h: string): void { if (/^[0-9a-fA-F]{6}$/.test(h)) { this.g1 = '#' + h; this.syncG1Hsl(); this.applyGradient(); } }
  onG2(h: string): void { if (/^[0-9a-fA-F]{6}$/.test(h)) { this.g2 = '#' + h; this.syncG2Hsl(); this.applyGradient(); } }

  pick(c: string): void { this.value = c; this.valueChange.emit(c); }
  doReset(): void { this.customOpen = false; this.reset.emit(); }
  onHex(h: string): void {
    if (/^[0-9a-fA-F]{6}$/.test(h)) {
      const c = '#' + h.toUpperCase();
      this.customColors.add(c);
      this.pick(c);
    }
  }
  strip(v: string): string { return v?.startsWith('#') ? v.slice(1) : ''; }
  toHex(v: string): string { return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#2F006D'; }
  sameColor(a: string, b: string): boolean {
    return this.normColor(a) === this.normColor(b);
  }
  private normColor(v: string): string {
    return (v || '').trim().toLowerCase();
  }

  /** Open the in-app picker, seeding the sliders from the current colour. */
  openCustom(): void {
    const { h, s, l } = this.hexToHsl(this.toHex(this.value));
    this.hue = Math.round(h); this.sat = Math.round(s); this.light = Math.round(l);
    this.customOpen = true;
  }
  closeCustom(): void { this.customOpen = false; }
  applyHsl(): void {
    const c = this.hslToHex(this.hue, this.sat, this.light).toUpperCase();
    this.customColors.add(c);
    this.pick(c);
  }

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
