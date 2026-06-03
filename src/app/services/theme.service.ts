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

  /** Company-published, read-only themes — each genuinely distinct in layout, card
   *  style, intermediate + result template AND colours (not just background). */
  static predefined(): SavedTheme[] {
    return [
      {
        id: 'pre_retail', name: 'Retail Dark', predefined: true, updatedAt: 0,
        tokens: {
          headerColor: '#2F006D', background: 'linear-gradient(135deg,#2F006D,#001973)',
          cardBackground: 'rgba(255,255,255,0.15)', cardText: '#FFFFFF', accent: '#FFCD00',
          logoPosition: 'left', homeLayout: 'grid-2x3', cardStyle: 'image-text',
          includeIntermediate: true, intermediateStyle: 'accordion', resultTemplate: 'map-list',
          intermediate: { headerColor: 'rgba(0,0,0,0.45)', background: '#1A0036', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium' },
          result: { headerColor: '#2F006D', background: '#0A0A1A', cardBackground: 'rgba(255,255,255,0.06)', cardText: '#FFFFFF', accent: '#FFCD00', pathColor: '#FFCD00', pathStyle: 'dashed' },
          animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true },
          loader: { style: 'spinner', color: '#FFCD00' },
        },
      },
      {
        id: 'pre_fresh', name: 'Fresh Market', predefined: true, updatedAt: 0,
        tokens: {
          headerColor: '#0F7B3F', background: 'linear-gradient(135deg,#0F7B3F,#065F46)',
          cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#84CC16',
          logoPosition: 'center', homeLayout: 'hero-list', cardStyle: 'image-only',
          includeIntermediate: true, intermediateStyle: 'image-grid', resultTemplate: 'cards-map',
          intermediate: { headerColor: '#065F46', background: '#ECFDF5', cardBackground: '#FFFFFF', cardText: '#064E3B', accent: '#84CC16', itemSize: 'large' },
          result: { headerColor: '#0F7B3F', background: '#F0FDF4', cardBackground: '#FFFFFF', cardText: '#064E3B', accent: '#16A34A', pathColor: '#16A34A', pathStyle: 'solid' },
          animation: { transition: 'scale-up', speed: 'normal', applyToAll: true },
          loader: { style: 'dot-pulse', color: '#16A34A' },
        },
      },
      {
        id: 'pre_bakery', name: 'Warm Bakery', predefined: true, updatedAt: 0,
        tokens: {
          headerColor: '#B45309', background: 'linear-gradient(135deg,#B45309,#78350F)',
          cardBackground: 'rgba(255,255,255,0.92)', cardText: '#451A03', accent: '#F59E0B',
          logoPosition: 'left', homeLayout: 'circular', cardStyle: 'circle',
          includeIntermediate: true, intermediateStyle: 'circular', resultTemplate: 'split-panel',
          intermediate: { headerColor: '#78350F', background: '#FFFBEB', cardBackground: '#FFF7E6', cardText: '#7C2D12', accent: '#F59E0B', itemSize: 'medium' },
          result: { headerColor: '#B45309', background: '#FFFBEB', cardBackground: '#FFFFFF', cardText: '#7C2D12', accent: '#EA580C', pathColor: '#EA580C', pathStyle: 'dotted' },
          animation: { transition: 'fade-slide', speed: 'slow', applyToAll: true },
          loader: { style: 'logo', color: '#F59E0B' },
        },
      },
      {
        id: 'pre_minimal', name: 'Minimal Mono', predefined: true, updatedAt: 0,
        tokens: {
          headerColor: '#0F172A', background: '#FFFFFF',
          cardBackground: '#F8FAFC', cardText: '#0F172A', accent: '#0F172A',
          logoPosition: 'center', homeLayout: 'col-4', cardStyle: 'text-rect',
          includeIntermediate: false, intermediateStyle: 'scroll-list', resultTemplate: 'minimal',
          intermediate: { headerColor: '#0F172A', background: '#FFFFFF', cardBackground: '#F1F5F9', cardText: '#0F172A', accent: '#0F172A', itemSize: 'small' },
          result: { headerColor: '#0F172A', background: '#FFFFFF', cardBackground: '#F8FAFC', cardText: '#0F172A', accent: '#0F172A', pathColor: '#0F172A', pathStyle: 'solid' },
          animation: { transition: 'slide-left', speed: 'fast', applyToAll: true },
          loader: { style: 'progress', color: '#0F172A' },
        },
      },
      {
        id: 'pre_vivid', name: 'Vivid Pop', predefined: true, updatedAt: 0,
        tokens: {
          headerColor: '#DB2777', background: 'linear-gradient(135deg,#DB2777,#7C3AED)',
          cardBackground: 'rgba(255,255,255,0.18)', cardText: '#FFFFFF', accent: '#22D3EE',
          logoPosition: 'left', homeLayout: 'pill-row', cardStyle: 'pill',
          includeIntermediate: true, intermediateStyle: 'pill-tabs', resultTemplate: 'card-grid',
          intermediate: { headerColor: '#7C3AED', background: '#2E1065', cardBackground: 'rgba(255,255,255,0.12)', cardText: '#FFFFFF', accent: '#22D3EE', itemSize: 'medium' },
          result: { headerColor: '#DB2777', background: '#1E1B4B', cardBackground: 'rgba(255,255,255,0.10)', cardText: '#FFFFFF', accent: '#22D3EE', pathColor: '#22D3EE', pathStyle: 'animated' },
          animation: { transition: 'shimmer', speed: 'normal', applyToAll: true },
          loader: { style: 'skeleton', color: '#22D3EE' },
        },
      },
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
