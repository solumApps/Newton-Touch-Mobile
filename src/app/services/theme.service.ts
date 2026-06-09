import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { ThemeTokens, HomeLayout, CardStyle, CardShape, CardContent, CardTextPos } from '@contract/layout';
import { DEFAULT_FONT, FONTS } from '../shared/fonts';

/** Default saverOverlay — shown centered with white text, no bg box. */
const DEFAULT_SAVER_OVERLAY = { showContent: true, title: 'Newton Touch', subtitle: 'Touch screen to begin', position: 'center' as const, textColor: '#FFFFFF', bgColor: 'transparent' };

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
      overlayColor: 'rgba(0,0,0,0.6)',
      cardSurface: 'flat',
      navStyle: 'floating',
      nav: { backColor: '#FFFFFF', backBg: 'rgba(0,0,0,0.35)', homeColor: '#FFFFFF', homeBg: 'rgba(0,0,0,0.35)', position: 'bottom-left' },
      logoPosition: 'left',
      homeLayout: 'grid-2x3',
      cardSize: 'normal',
      cardAlign: 'center',
      cardGap: 'normal',
      cardShape: 'rect',
      cardContent: 'image-text',
      cardTextPos: 'overlay-bottom',
      showHeader: true,
      headerStyle: 'logo-only',
      includeIntermediate: true,
      intermediateStyle: 'pill-tabs',
      resultTemplate: 'map-list',
      intermediate: { headerColor: 'rgba(0,0,0,0.45)', background: '#1A0036', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium', showHeader: true, cardShape: 'rect', align: 'center', gap: 'normal' },
      result: { headerColor: '#2F006D', background: '#0A0A1A', cardBackground: 'rgba(255,255,255,0.06)', cardText: '#FFFFFF', accent: '#FFCD00', pathColor: '#FFCD00', pathStyle: 'dashed', showHeader: true },
      animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true },
      loader: { style: 'spinner', color: '#FFCD00' },
      typography: { fontFamily: DEFAULT_FONT, textScale: 'normal', textFit: 'shrink', baseTextColor: '#FFFFFF' },
      saverOverlay: { ...DEFAULT_SAVER_OVERLAY },
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
    out.overlayColor = t?.overlayColor ?? 'rgba(0,0,0,0.6)';
    out.cardSurface = t?.cardSurface ?? 'flat';
    out.navStyle = t?.navStyle ?? 'floating';
    out.cardSize = t?.cardSize ?? 'normal';
    out.cardAlign = t?.cardAlign ?? 'center';
    out.cardGap = t?.cardGap ?? 'normal';
    // Migrate removed styles on read so older saved themes still match the pickers.
    if ((out.homeLayout as string) === 'list') out.homeLayout = 'grid-2x3';
    if ((out.intermediateStyle as string) === 'accordion') out.intermediateStyle = 'pill-tabs';
    if ((out.intermediateStyle as string) === 'scroll-list') out.intermediateStyle = 'card-strip';
    out.nav = { ...d.nav, ...(t?.nav || {}) };
    out.intermediate = { ...d.intermediate, ...(t?.intermediate || {}), showHeader: t?.intermediate?.showHeader ?? true };
    out.result = { ...d.result, ...(t?.result || {}), showHeader: t?.result?.showHeader ?? true };
    out.typography = { ...d.typography, ...(t?.typography || {}) };
    out.saverOverlay = { ...DEFAULT_SAVER_OVERLAY, ...(t?.saverOverlay || {}) };
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
      // 1) Bookstore Classic — warm sepia bookshop kiosk · slab serif · refined.
      { id: 'pre_bookstore', name: 'Bookstore Classic', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#6B3410', background: 'linear-gradient(135deg,#FEF3E2,#F5E0BB)', cardBackground: '#FFFFFF', cardText: '#3E2410', accent: '#B45309',
        logoPosition: 'left', homeLayout: 'grid-2x3', cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'below',
        showHeader: true, headerStyle: 'title+caption',
        includeIntermediate: true, intermediateStyle: 'card-strip', resultTemplate: 'dual-list',
        intermediate: { headerColor: '#6B3410', background: '#FEF3E2', cardBackground: '#FFFFFF', cardText: '#3E2410', accent: '#B45309', itemSize: 'medium', showHeader: true },
        result: { headerColor: '#6B3410', background: '#FEF3E2', cardBackground: '#FFFFFF', cardText: '#3E2410', accent: '#B45309', pathColor: '#B45309', pathStyle: 'dotted', showHeader: true },
        animation: { transition: 'fade-slide', speed: 'slow', applyToAll: true },
        loader: { style: 'logo', color: '#B45309' },
        typography: { fontFamily: font('slab'), textScale: 'normal', textFit: 'wrap', baseTextColor: '#3E2410' },
      }) },

      // 2) Tech Showroom — bold electronics kiosk · drill-stair flow (Staples-style) · brutalist red/black.
      { id: 'pre_tech', name: 'Tech Showroom', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#B91C1C', background: 'linear-gradient(135deg,#1A0000,#3F0F0F)', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#EF4444',
        logoPosition: 'left', homeLayout: 'grid-2x2', cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'overlay-bottom',
        showHeader: true, headerStyle: 'logo+title+caption',
        includeIntermediate: true, intermediateStyle: 'drill-stair', resultTemplate: 'drill-stair',
        intermediate: { headerColor: '#7F1D1D', background: '#1A0000', cardBackground: 'rgba(255,255,255,0.06)', cardText: '#FFFFFF', accent: '#EF4444', itemSize: 'large', showHeader: true },
        result: { headerColor: '#7F1D1D', background: '#FFFFFF', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#EF4444', pathColor: '#EF4444', pathStyle: 'animated', showHeader: true },
        animation: { transition: 'slide-left', speed: 'fast', applyToAll: true },
        loader: { style: 'dot-pulse', color: '#EF4444' },
        typography: { fontFamily: font('bebas'), textScale: 'large', textFit: 'shrink', baseTextColor: '#FFFFFF' },
      }) },

      // 3) Pharmacy Care — clinical blue/white · icon-text categories · in-store routing.
      { id: 'pre_pharmacy', name: 'Pharmacy Care', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#1E40AF', background: '#F8FAFC', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#06B6D4',
        logoPosition: 'center', homeLayout: 'col-4', cardShape: 'rect', cardContent: 'icon-text', cardTextPos: 'center',
        showHeader: true, headerStyle: 'logo+title+caption',
        includeIntermediate: true, intermediateStyle: 'pill-tabs', resultTemplate: 'cards-map',
        intermediate: { headerColor: '#1E40AF', background: '#ECFEFF', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#06B6D4', itemSize: 'medium', showHeader: true },
        result: { headerColor: '#1E40AF', background: '#F1F5F9', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#06B6D4', pathColor: '#06B6D4', pathStyle: 'solid', showHeader: true },
        animation: { transition: 'scale-up', speed: 'normal', applyToAll: true },
        loader: { style: 'spinner', color: '#06B6D4' },
        typography: { fontFamily: font('inter'), textScale: 'normal', textFit: 'wrap', baseTextColor: '#0F172A' },
      }) },

      // 4) Café Express — direct browsing, no intermediate · warm espresso · filter-list result.
      { id: 'pre_cafe', name: 'Café Express', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#6F4E37', background: 'linear-gradient(135deg,#FAF3E7,#E8D5B5)', cardBackground: '#FFFFFF', cardText: '#3F2A1A', accent: '#D97706',
        logoPosition: 'center', homeLayout: 'hero-list', cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'overlay-bottom',
        showHeader: true, headerStyle: 'title-only',
        includeIntermediate: false, intermediateStyle: 'scroll-list', resultTemplate: 'filter-list',
        intermediate: { headerColor: '#6F4E37', background: '#FAF3E7', cardBackground: '#FFFFFF', cardText: '#3F2A1A', accent: '#D97706', itemSize: 'medium', showHeader: true },
        result: { headerColor: '#6F4E37', background: '#FAF3E7', cardBackground: '#FFFFFF', cardText: '#3F2A1A', accent: '#D97706', pathColor: '#D97706', pathStyle: 'solid', showHeader: true },
        animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true },
        loader: { style: 'skeleton', color: '#D97706' },
        typography: { fontFamily: font('source'), textScale: 'large', textFit: 'shrink', baseTextColor: '#3F2A1A' },
      }) },

      // 5) Boutique Glamour — visual-first fashion lookbook, no intermediate · rose-gold · elegant.
      { id: 'pre_boutique', name: 'Boutique Glamour', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#C2185B', background: 'linear-gradient(135deg,#FBE4EC,#E8C8D6)', cardBackground: 'rgba(255,255,255,0.85)', cardText: '#4A1424', accent: '#E8B4B8',
        logoPosition: 'right', homeLayout: 'grid-2x2', cardShape: 'circle', cardContent: 'image-only', cardTextPos: 'below',
        showHeader: true, headerStyle: 'title+caption',
        includeIntermediate: false, intermediateStyle: 'image-grid', resultTemplate: 'minimal',
        intermediate: { headerColor: '#C2185B', background: '#FBE4EC', cardBackground: 'rgba(255,255,255,0.85)', cardText: '#4A1424', accent: '#E8B4B8', itemSize: 'large', showHeader: true },
        result: { headerColor: '#C2185B', background: '#FBE4EC', cardBackground: 'rgba(255,255,255,0.85)', cardText: '#4A1424', accent: '#E8B4B8', pathColor: '#E8B4B8', pathStyle: 'dashed', showHeader: true },
        animation: { transition: 'shimmer', speed: 'normal', applyToAll: true },
        loader: { style: 'progress', color: '#E8B4B8' },
        typography: { fontFamily: font('nunito'), textScale: 'normal', textFit: 'wrap', baseTextColor: '#4A1424' },
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
