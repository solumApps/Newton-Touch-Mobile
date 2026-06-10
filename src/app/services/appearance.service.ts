import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type AppearanceMode = 'system' | 'light' | 'dark';

const KEY = 'nt.appearance';

/**
 * App-chrome appearance (System / Light / Dark), persisted in Preferences.
 * - 'system' → no class; the `prefers-color-scheme: dark` media query decides.
 * - 'light'  → html.nt-light forces light even if the OS is dark.
 * - 'dark'   → html.nt-dark forces dark.
 * Kiosk/theme previews are unaffected — they always render the theme's own colors.
 */
@Injectable({ providedIn: 'root' })
export class AppearanceService {
  mode: AppearanceMode = 'system';

  /** Load the persisted mode and apply it. Call once at app startup. */
  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: KEY });
    this.mode = value === 'light' || value === 'dark' ? value : 'system';
    this.apply();
  }

  async set(mode: AppearanceMode): Promise<void> {
    this.mode = mode;
    await Preferences.set({ key: KEY, value: mode });
    this.apply();
  }

  private apply(): void {
    const el = document.documentElement;
    el.classList.remove('nt-dark', 'nt-light');
    if (this.mode === 'dark') el.classList.add('nt-dark');
    else if (this.mode === 'light') el.classList.add('nt-light');
  }
}
