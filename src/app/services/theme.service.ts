import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { ThemeTokens } from '@contract/layout';

export interface SavedTheme {
  id: string;
  name: string;
  predefined?: boolean;
  tokens: ThemeTokens;
  updatedAt: number;
}

const KEY = 'nt.themes';
const FILE_VERSION = 1;

/** Manages user themes (offline via Preferences) + .solumtheme export/import. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private cache: SavedTheme[] = [];

  static defaultTokens(): ThemeTokens {
    return {
      headerColor: '#2F006D',
      background: 'linear-gradient(135deg,#2F006D,#001973)',
      cardBackground: 'rgba(255,255,255,0.15)',
      cardText: '#FFFFFF',
      accent: '#FFCD00',
      logoPosition: 'left',
      homeLayout: 'grid-2x3',
      cardStyle: 'image-text',
      includeIntermediate: true,
      intermediateStyle: 'accordion',
      resultTemplate: 'map-list',
      intermediate: { headerColor: 'rgba(0,0,0,0.45)', background: '#1A0036', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium' },
      result: { headerColor: '#2F006D', background: '#0A0A1A', cardBackground: 'rgba(255,255,255,0.06)', cardText: '#FFFFFF', accent: '#FFCD00', pathColor: '#FFCD00', pathStyle: 'dashed' },
      animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true },
      loader: { style: 'spinner', color: '#FFCD00' },
    };
  }

  /** Company-published, read-only themes (shared by Themes list, preview, content). */
  static predefined(): SavedTheme[] {
    const d = ThemeService.defaultTokens();
    return [
      { id: 'pre_retail', name: 'Retail Dark', predefined: true, tokens: d, updatedAt: 0 },
      { id: 'pre_fresh', name: 'Fresh Market', predefined: true, tokens: { ...d, homeLayout: 'hero-list', cardStyle: 'image-only' }, updatedAt: 0 },
      { id: 'pre_warm', name: 'Warm Store', predefined: true, tokens: { ...d, headerColor: '#B45309', background: 'linear-gradient(135deg,#B45309,#78350F)', cardStyle: 'circle', homeLayout: 'circular' }, updatedAt: 0 },
    ];
  }

  async getById(id: string): Promise<SavedTheme | undefined> {
    return ThemeService.predefined().find((t) => t.id === id) ?? (await this.list()).find((t) => t.id === id);
  }

  async list(): Promise<SavedTheme[]> {
    if (!this.cache.length) {
      const { value } = await Preferences.get({ key: KEY });
      this.cache = value ? JSON.parse(value) : [];
    }
    return this.cache;
  }

  async save(theme: SavedTheme): Promise<void> {
    await this.list();
    const i = this.cache.findIndex((t) => t.id === theme.id);
    theme.updatedAt = Date.now();
    if (i >= 0) this.cache[i] = theme; else this.cache.push(theme);
    await Preferences.set({ key: KEY, value: JSON.stringify(this.cache) });
  }

  /** Editing a predefined theme creates a copy in My Themes. */
  async cloneFrom(src: SavedTheme, name: string): Promise<SavedTheme> {
    const copy: SavedTheme = { id: 'thm_' + Date.now(), name, tokens: JSON.parse(JSON.stringify(src.tokens)), updatedAt: Date.now() };
    await this.save(copy);
    return copy;
  }

  // ---- Export / Import (.solumtheme — tiny JSON, no media) ----
  export(theme: SavedTheme): string {
    return JSON.stringify({ kind: 'solumtheme', version: FILE_VERSION, name: theme.name, tokens: theme.tokens }, null, 2);
  }

  async import(text: string): Promise<SavedTheme> {
    const obj = JSON.parse(text);
    if (obj.kind !== 'solumtheme') throw new Error('Not a .solumtheme file');
    // Version-check: merge onto defaults so unknown/missing tokens fall back safely.
    const tokens: ThemeTokens = { ...ThemeService.defaultTokens(), ...(obj.tokens || {}) };
    const theme: SavedTheme = { id: 'thm_' + Date.now(), name: (obj.name || 'Imported Theme'), tokens, updatedAt: Date.now() };
    await this.save(theme);
    return theme;
  }
}
