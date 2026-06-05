import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { ThemeTokens, HomeLayout, CardStyle, CardShape, CardContent, CardTextPos } from '@contract/layout';
import { DEFAULT_FONT, FONTS } from '../shared/fonts';

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
      cardSurface: 'flat',
      navStyle: 'floating',
      logoPosition: 'left',
      homeLayout: 'grid-2x3',
      cardShape: 'rect',
      cardContent: 'image-text',
      cardTextPos: 'overlay-bottom',
      showHeader: true,
      headerStyle: 'logo-only',
      includeIntermediate: true,
      intermediateStyle: 'accordion',
      resultTemplate: 'map-list',
      intermediate: { headerColor: 'rgba(0,0,0,0.45)', background: '#1A0036', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium', showHeader: true },
      result: { headerColor: '#2F006D', background: '#0A0A1A', cardBackground: 'rgba(255,255,255,0.06)', cardText: '#FFFFFF', accent: '#FFCD00', pathColor: '#FFCD00', pathStyle: 'dashed', showHeader: true },
      animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true },
      loader: { style: 'spinner', color: '#FFCD00' },
      typography: { fontFamily: DEFAULT_FONT, textScale: 'normal', textFit: 'shrink', baseTextColor: '#FFFFFF' },
    };
  }

  /** Migrate legacy/partial saved themes to the current shape (called on read). */
  static normalize(t: any): ThemeTokens {
    const d = ThemeService.defaultTokens();
    const legacyLayout: Record<string, { homeLayout: HomeLayout; cardStyle: CardStyle }> = {
      hexagonal: { homeLayout: 'grid-2x3', cardStyle: 'hexagon' },
      circular: { homeLayout: 'grid-2x2', cardStyle: 'circle' },
      'pill-row': { homeLayout: 'list', cardStyle: 'pill' },
    };
    // Legacy single-axis cardStyle → independent shape/content/text-position.
    const legacyCard: Record<string, { shape: CardShape; content: CardContent; pos: CardTextPos }> = {
      'image-text': { shape: 'rect', content: 'image-text', pos: 'overlay-bottom' },
      'text-rect': { shape: 'rect', content: 'text-only', pos: 'center' },
      'pill': { shape: 'pill', content: 'text-only', pos: 'center' },
      'hexagon': { shape: 'hexagon', content: 'text-only', pos: 'center' },
      'image-only': { shape: 'rect', content: 'image-only', pos: 'overlay-bottom' },
      'circle': { shape: 'circle', content: 'text-only', pos: 'center' },
      'icon-text': { shape: 'rect', content: 'icon-text', pos: 'center' },
      'color-block': { shape: 'rect', content: 'color-block', pos: 'center' },
      'gradient': { shape: 'rect', content: 'gradient', pos: 'overlay-bottom' },
      'list-row': { shape: 'rect', content: 'image-text', pos: 'overlay-bottom' },
    };
    const out: ThemeTokens = { ...d, ...t };
    const lm = legacyLayout[(t?.homeLayout) as string];
    let legacyStyle: string | undefined = t?.cardStyle;
    if (lm) { out.homeLayout = lm.homeLayout; legacyStyle = legacyStyle ?? lm.cardStyle; }
    // Card axes: prefer new fields; else derive from legacy cardStyle; else defaults.
    if (!t?.cardShape || !t?.cardContent) {
      const c = legacyCard[legacyStyle ?? ''] ?? { shape: d.cardShape, content: d.cardContent, pos: d.cardTextPos };
      out.cardShape = t?.cardShape ?? c.shape;
      out.cardContent = t?.cardContent ?? c.content;
      out.cardTextPos = t?.cardTextPos ?? c.pos;
    }
    delete (out as any).cardStyle;
    out.showHeader = t?.showHeader ?? true;
    out.headerStyle = t?.headerStyle ?? 'logo-only';
    out.cardSurface = t?.cardSurface ?? 'flat';
    out.navStyle = t?.navStyle ?? 'floating';
    out.intermediate = { ...d.intermediate, ...(t?.intermediate || {}), showHeader: t?.intermediate?.showHeader ?? true };
    out.result = { ...d.result, ...(t?.result || {}), showHeader: t?.result?.showHeader ?? true };
    out.typography = { ...d.typography, ...(t?.typography || {}) };
    return out;
  }

  /** Company-published, read-only themes — each genuinely distinct in layout, card
   *  style, intermediate + result template AND colours (not just background). */
  static predefined(): SavedTheme[] {
    const d = ThemeService.defaultTokens();
    const font = (id: string) => FONTS.find((f) => f.id === id)!.stack;
    const mk = (over: Partial<ThemeTokens>): ThemeTokens => ({
      ...d, ...over,
      intermediate: { ...d.intermediate, ...(over.intermediate || {}) },
      result: { ...d.result, ...(over.result || {}) },
      animation: { ...d.animation, ...(over.animation || {}) },
      loader: { ...d.loader, ...(over.loader || {}) },
      typography: { ...d.typography, ...(over.typography || {}) },
    });
    return [
      { id: 'pre_retail', name: 'Retail Dark', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#2F006D', background: 'linear-gradient(135deg,#2F006D,#001973)', cardBackground: 'rgba(255,255,255,0.15)', cardText: '#FFFFFF', accent: '#FFCD00',
        homeLayout: 'grid-2x3', cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'overlay-bottom', intermediateStyle: 'accordion', resultTemplate: 'map-list',
        typography: { ...d.typography, fontFamily: font('inter') },
      }) },
      { id: 'pre_fresh', name: 'Fresh Market', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#0F7B3F', background: 'linear-gradient(135deg,#0F7B3F,#065F46)', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#84CC16',
        logoPosition: 'center', homeLayout: 'hero-list', cardShape: 'rect', cardContent: 'image-only', cardTextPos: 'overlay-bottom', intermediateStyle: 'image-grid', resultTemplate: 'cards-map',
        intermediate: { headerColor: '#065F46', background: '#ECFDF5', cardBackground: '#FFFFFF', cardText: '#064E3B', accent: '#84CC16', itemSize: 'large', showHeader: true },
        result: { headerColor: '#0F7B3F', background: '#F0FDF4', cardBackground: '#FFFFFF', cardText: '#064E3B', accent: '#16A34A', pathColor: '#16A34A', pathStyle: 'solid', showHeader: true },
        animation: { transition: 'scale-up', speed: 'normal', applyToAll: true }, loader: { style: 'dot-pulse', color: '#16A34A' },
        typography: { ...d.typography, fontFamily: font('source'), baseTextColor: '#0F172A' },
      }) },
      { id: 'pre_bakery', name: 'Warm Bakery', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#B45309', background: 'linear-gradient(135deg,#B45309,#78350F)', cardBackground: 'rgba(255,255,255,0.92)', cardText: '#451A03', accent: '#F59E0B',
        homeLayout: 'grid-2x2', cardShape: 'circle', cardContent: 'image-text', cardTextPos: 'below', intermediateStyle: 'circular', resultTemplate: 'split-panel',
        intermediate: { headerColor: '#78350F', background: '#FFFBEB', cardBackground: '#FFF7E6', cardText: '#7C2D12', accent: '#F59E0B', itemSize: 'medium', showHeader: true },
        result: { headerColor: '#B45309', background: '#FFFBEB', cardBackground: '#FFFFFF', cardText: '#7C2D12', accent: '#EA580C', pathColor: '#EA580C', pathStyle: 'dotted', showHeader: true },
        animation: { transition: 'fade-slide', speed: 'slow', applyToAll: true }, loader: { style: 'logo', color: '#F59E0B' },
        typography: { ...d.typography, fontFamily: font('slab') },
      }) },
      { id: 'pre_minimal', name: 'Minimal Mono', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#0F172A', background: '#FFFFFF', cardBackground: '#F8FAFC', cardText: '#0F172A', accent: '#0F172A',
        logoPosition: 'center', homeLayout: 'col-4', cardShape: 'rect', cardContent: 'text-only', cardTextPos: 'center', includeIntermediate: false, intermediateStyle: 'scroll-list', resultTemplate: 'minimal',
        intermediate: { headerColor: '#0F172A', background: '#FFFFFF', cardBackground: '#F1F5F9', cardText: '#0F172A', accent: '#0F172A', itemSize: 'small', showHeader: true },
        result: { headerColor: '#0F172A', background: '#FFFFFF', cardBackground: '#F8FAFC', cardText: '#0F172A', accent: '#0F172A', pathColor: '#0F172A', pathStyle: 'solid', showHeader: true },
        animation: { transition: 'slide-left', speed: 'fast', applyToAll: true }, loader: { style: 'progress', color: '#0F172A' },
        typography: { ...d.typography, fontFamily: font('nunito'), baseTextColor: '#0F172A' },
      }) },
      { id: 'pre_vivid', name: 'Vivid Pop', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#DB2777', background: 'linear-gradient(135deg,#DB2777,#7C3AED)', cardBackground: 'rgba(255,255,255,0.18)', cardText: '#FFFFFF', accent: '#22D3EE',
        homeLayout: 'list', cardShape: 'pill', cardContent: 'text-only', cardTextPos: 'center', intermediateStyle: 'pill-tabs', resultTemplate: 'card-grid',
        intermediate: { headerColor: '#7C3AED', background: '#2E1065', cardBackground: 'rgba(255,255,255,0.12)', cardText: '#FFFFFF', accent: '#22D3EE', itemSize: 'medium', showHeader: true },
        result: { headerColor: '#DB2777', background: '#1E1B4B', cardBackground: 'rgba(255,255,255,0.10)', cardText: '#FFFFFF', accent: '#22D3EE', pathColor: '#22D3EE', pathStyle: 'animated', showHeader: true },
        animation: { transition: 'shimmer', speed: 'normal', applyToAll: true }, loader: { style: 'skeleton', color: '#22D3EE' },
        typography: { ...d.typography, fontFamily: font('bebas') },
      }) },
    ];
  }

  async getById(id: string): Promise<SavedTheme | undefined> {
    return ThemeService.predefined().find((t) => t.id === id) ?? (await this.list()).find((t) => t.id === id);
  }

  async list(): Promise<SavedTheme[]> {
    if (!this.cache.length) {
      const { value } = await Preferences.get({ key: KEY });
      const raw: SavedTheme[] = value ? JSON.parse(value) : [];
      this.cache = raw.map((t) => ({ ...t, tokens: ThemeService.normalize(t.tokens) }));
    }
    return this.cache;
  }

  async save(theme: SavedTheme): Promise<void> {
    await this.list();
    theme.updatedAt = Date.now();
    const i = this.cache.findIndex((t) => t.id === theme.id);
    // Replace cache reference so consumers (e.g. themes.page) see a new identity
    // and Angular CD picks it up — otherwise in-place mutation goes unnoticed.
    const next = [...this.cache];
    if (i >= 0) next[i] = theme; else next.push(theme);
    this.cache = next;
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
  }

  /** Delete a saved theme (predefined themes are read-only and cannot be deleted). */
  async remove(id: string): Promise<void> {
    await this.list();
    // New array reference (not in-place mutation) so list consumers re-render.
    const next = this.cache.filter((t) => t.id !== id);
    this.cache = next;
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
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
    const tokens: ThemeTokens = ThemeService.normalize(obj.tokens || {});
    const theme: SavedTheme = { id: 'thm_' + Date.now(), name: (obj.name || 'Imported Theme'), tokens, updatedAt: Date.now() };
    await this.save(theme);
    return theme;
  }
}
