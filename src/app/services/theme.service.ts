import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import type { ThemeTokens, HomeLayout, CardStyle, CardShape, CardContent, CardTextPos } from '@contract/layout';
import { THEME_ENUM_VALUES, coerceEnum, coerceColumns, coerceNavIcon } from '@contract/layout';
import { DEFAULT_FONT, FONTS } from '../shared/fonts';
import { ImageStoreService } from './image-store.service';

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
  /** Emits whenever the saved-theme list changes (save / remove / import) so list
   *  views refresh immediately, independent of Ionic view lifecycle timing. */
  readonly changed = new Subject<void>();

  constructor(private images: ImageStoreService) {}

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
      // 'col-3' (not legacy 'grid-2x3') so a NEW theme's preview matches the
      // pre-selected "Columns" tile in the wizard exactly.
      homeLayout: 'col-3',
      columns: 3,
      scrollMode: 'vertical',
      cardSize: 'normal',
      cardAlign: 'center',
      cardGap: 'normal',
      cardShape: 'rect',
      cardContent: 'image-text',
      cardTextPos: 'overlay-bottom',
      showHeader: true,
      headerStyle: 'logo-only',
      headerLayout: 'preset',
      logoPos: 'left',
      titlePos: 'center',
      captionPos: 'center',
      includeIntermediate: true,
      intermediateStyle: 'columns',
      resultTemplate: 'map-list',
      intermediate: { headerColor: 'rgba(0,0,0,0.45)', background: '#1A0036', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium', showHeader: true, cardShape: 'rect', align: 'center', scrollMode: 'horizontal', valign: 'middle', gap: 'normal' },
      result: { headerColor: '#2F006D', background: '#0A0A1A', cardBackground: 'rgba(255,255,255,0.06)', cardText: '#FFFFFF', accent: '#FFCD00', pathColor: '#FFCD00', pathStyle: 'dashed', showHeader: true },
      // Default to no page transition — faster, more responsive navigation
      // (per team feedback). The transition options remain available in the
      // Motion step for anyone who wants them.
      animation: { transition: 'none', speed: 'normal', applyToAll: true },
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
    out.headerLayout = t?.headerLayout ?? 'preset';
    out.logoPos = t?.logoPos ?? 'left';
    out.titlePos = t?.titlePos ?? 'center';
    out.captionPos = t?.captionPos ?? 'center';
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
    const nav = { ...d.nav, ...(t?.nav || {}) };
    out.nav = nav;
    out.intermediate = { ...d.intermediate, ...(t?.intermediate || {}), showHeader: t?.intermediate?.showHeader ?? true };
    out.result = { ...d.result, ...(t?.result || {}), showHeader: t?.result?.showHeader ?? true };
    // Deep-merge animation + loader too — a partial object from an older/newer
    // .solumtheme file must never leave undefined fields behind.
    out.animation = { ...d.animation, ...(t?.animation || {}) };
    out.loader = { ...d.loader, ...(t?.loader || {}) };
    out.typography = { ...d.typography, ...(t?.typography || {}) };
    const saver = { ...DEFAULT_SAVER_OVERLAY, ...(t?.saverOverlay || {}) };
    out.saverOverlay = saver;
    // Enum safety net: coerce unknown/invalid values (e.g. from a newer app
    // version's export) to defaults with a console warning — never pass through.
    const E = THEME_ENUM_VALUES;
    out.logoPosition = coerceEnum(out.logoPosition, E.logoPosition, d.logoPosition, 'logoPosition');
    out.homeLayout = coerceEnum(out.homeLayout, E.homeLayout, d.homeLayout, 'homeLayout');
    out.cardSize = coerceEnum(out.cardSize, E.cardSize, 'normal', 'cardSize');
    out.columns = coerceColumns(t?.columns);
    let sm = t?.scrollMode;
    if (!sm || sm === 'auto') {
      const columnLayouts = ['grid-2x3', 'grid-2x2', 'col-2', 'col-3', 'col-4', 'hero-list'];
      sm = columnLayouts.includes(out.homeLayout) ? 'vertical' : 'horizontal';
    }
    out.scrollMode = coerceEnum(sm, E.scrollMode, 'vertical', 'scrollMode');
    out.cardAlign = coerceEnum(out.cardAlign, E.align, 'center', 'cardAlign');
    if (out.homeLayout === 'promo-categories' && out.cardAlign === 'center') {
      out.cardAlign = 'left';
    }
    out.cardGap = coerceEnum(out.cardGap, E.gap, 'normal', 'cardGap');
    out.cardShape = coerceEnum(out.cardShape, E.cardShape, d.cardShape, 'cardShape');
    out.cardContent = coerceEnum(out.cardContent, E.cardContent, d.cardContent, 'cardContent');
    out.cardTextPos = coerceEnum(out.cardTextPos, E.cardTextPos, d.cardTextPos, 'cardTextPos');
    out.cardSurface = coerceEnum(out.cardSurface, E.cardSurface, 'flat', 'cardSurface');
    out.navStyle = coerceEnum(out.navStyle, E.navStyle, 'floating', 'navStyle');
    out.headerStyle = coerceEnum(out.headerStyle, E.headerStyle, 'logo-only', 'headerStyle');
    out.headerLayout = coerceEnum(out.headerLayout, E.headerLayout, 'preset', 'headerLayout');
    out.logoPos = coerceEnum(out.logoPos, E.headerItemPos, 'left', 'logoPos');
    out.titlePos = coerceEnum(out.titlePos, E.headerItemPos, 'center', 'titlePos');
    out.captionPos = coerceEnum(out.captionPos, E.headerItemPos, 'center', 'captionPos');
    out.intermediateStyle = coerceEnum(out.intermediateStyle, E.intermediateStyle, d.intermediateStyle, 'intermediateStyle');
    out.resultTemplate = coerceEnum(out.resultTemplate, E.resultTemplate, d.resultTemplate, 'resultTemplate');
    nav.position = coerceEnum(nav.position, E.navButtonPosition, 'bottom-left', 'nav.position');
    if (nav.backPosition !== undefined) nav.backPosition = coerceEnum(nav.backPosition, E.navButtonPosition, 'bottom-left', 'nav.backPosition');
    if (nav.homePosition !== undefined) nav.homePosition = coerceEnum(nav.homePosition, E.navButtonPosition, 'bottom-right', 'nav.homePosition');
    // Nav icon/size/mode tokens (defaults preserve the legacy glyph buttons).
    if (nav.size !== undefined) nav.size = coerceEnum(nav.size, E.navButtonSize, 'normal', 'nav.size');
    if (nav.mode !== undefined) nav.mode = coerceEnum(nav.mode, E.navButtonMode, 'icon', 'nav.mode');
    nav.backIcon = coerceNavIcon(nav.backIcon);
    nav.homeIcon = coerceNavIcon(nav.homeIcon);
    out.intermediate.itemSize = coerceEnum(out.intermediate.itemSize, E.itemSize, d.intermediate.itemSize, 'intermediate.itemSize');
    out.intermediate.cardShape = coerceEnum(out.intermediate.cardShape, E.cardShape, 'rect', 'intermediate.cardShape');
    out.intermediate.align = coerceEnum(out.intermediate.align, E.align, 'center', 'intermediate.align');
    out.intermediate.textAlign = coerceEnum(out.intermediate.textAlign, E.align, 'center', 'intermediate.textAlign');
    out.intermediate.scrollMode = coerceEnum(out.intermediate.scrollMode, E.scrollMode, 'horizontal', 'intermediate.scrollMode');
    out.intermediate.valign = coerceEnum(out.intermediate.valign, E.valign, 'middle', 'intermediate.valign');
    out.intermediate.gap = coerceEnum(out.intermediate.gap, E.gap, 'normal', 'intermediate.gap');
    out.result.pathStyle = coerceEnum(out.result.pathStyle, E.pathStyle, d.result.pathStyle, 'result.pathStyle');
    out.animation.transition = coerceEnum(out.animation.transition, E.transition, d.animation.transition, 'animation.transition');
    out.animation.speed = coerceEnum(out.animation.speed, E.animSpeed, d.animation.speed, 'animation.speed');
    out.loader.style = coerceEnum(out.loader.style, E.loaderStyle, d.loader.style, 'loader.style');
    out.typography.textScale = coerceEnum(out.typography.textScale, E.textScale, d.typography.textScale, 'typography.textScale');
    out.typography.textFit = coerceEnum(out.typography.textFit, E.textFit, d.typography.textFit, 'typography.textFit');
    // Per-element typography tokens stay undefined when absent (= inherit global).
    if (out.typography.cardTextScale !== undefined) out.typography.cardTextScale = coerceEnum(out.typography.cardTextScale, E.textScale, 'normal', 'typography.cardTextScale');
    if (out.typography.headerTextScale !== undefined) out.typography.headerTextScale = coerceEnum(out.typography.headerTextScale, E.textScale, 'normal', 'typography.headerTextScale');
    if (out.typography.cardTextCase !== undefined) out.typography.cardTextCase = coerceEnum(out.typography.cardTextCase, E.textCase, 'default', 'typography.cardTextCase');
    if (out.typography.headerTextCase !== undefined) out.typography.headerTextCase = coerceEnum(out.typography.headerTextCase, E.textCase, 'default', 'typography.headerTextCase');
    saver.position = coerceEnum(saver.position, E.saverOverlayPosition, 'center', 'saverOverlay.position');
    // maxHomeItems: positive integer or undefined (= unlimited, user themes).
    const cap = Number(t?.maxHomeItems);
    out.maxHomeItems = Number.isFinite(cap) && cap >= 1 ? Math.round(cap) : undefined;
    // Optional fine-grained text multiplier (slider) — clamp to a sane range.
    const tsn = Number(out.typography.textScaleNum);
    out.typography.textScaleNum = out.typography.textScaleNum !== undefined && Number.isFinite(tsn)
      ? Math.min(2.0, Math.max(0.7, tsn)) : undefined;
    // Optional fine-grained card-size multiplier (slider).
    const csn = Number(out.cardSizeScale);
    out.cardSizeScale = out.cardSizeScale !== undefined && Number.isFinite(csn)
      ? Math.min(1.25, Math.max(0.8, csn)) : undefined;
    // Optional independent horizontal card-text alignment.
    out.cardTextAlign = ['left', 'center', 'right'].includes(out.cardTextAlign as string) ? out.cardTextAlign : undefined;
    // Optional background-image framing (B-4).
    const clampPct = (v: any, lo: number, hi: number) => { const n = Number(v); return v !== undefined && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined; };
    out.bgImageX = clampPct(out.bgImageX, 0, 100);
    out.bgImageY = clampPct(out.bgImageY, 0, 100);
    out.bgImageZoom = clampPct(out.bgImageZoom, 100, 300);
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
      // 1) Fresh Market — vibrant grocery kiosk · promo rail with big featured copy · garden greens.
      { id: 'pre_fresh_market', name: 'Fresh Market', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#15803D', background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', cardBackground: '#FFFFFF', cardText: '#14532D', accent: '#22C55E', overlayColor: 'rgba(20,83,45,0.65)',
        logoPosition: 'left', homeLayout: 'promo-categories', maxHomeItems: 6, cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'overlay-bottom',
        cardSize: 'large', cardAlign: 'left', cardGap: 'normal', cardSurface: 'raised',
        showHeader: true, headerStyle: 'logo+title',
        includeIntermediate: true, intermediateStyle: 'image-grid', resultTemplate: 'promo-list',
        intermediate: { headerColor: '#15803D', background: '#F0FDF4', cardBackground: '#FFFFFF', cardText: '#14532D', accent: '#22C55E', itemSize: 'medium', showHeader: true, cardShape: 'rect', align: 'center', gap: 'normal' },
        result: { headerColor: '#15803D', background: '#F0FDF4', cardBackground: '#FFFFFF', cardText: '#14532D', accent: '#16A34A', pathColor: '#16A34A', pathStyle: 'solid', showHeader: true },
        animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true },
        loader: { style: 'progress', color: '#22C55E' },
        typography: { fontFamily: font('source'), textScale: 'normal', textFit: 'wrap', baseTextColor: '#14532D' },
        saverOverlay: { showContent: true, title: 'Fresh Market', subtitle: 'Touch to find today’s freshest picks', position: 'bottom', textColor: '#FFFFFF', bgColor: 'rgba(20,83,45,0.55)' },
      }) },

      // 2) Volt Mega Store — dark electronics superstore · neon-cyan bento tiles · glow surface.
      { id: 'pre_volt', name: 'Volt Mega Store', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#0B1220', background: 'linear-gradient(135deg,#050B14,#0E1B2C)', cardBackground: 'rgba(34,211,238,0.08)', cardText: '#E6FBFF', accent: '#22D3EE', overlayColor: 'rgba(2,12,27,0.72)',
        logoPosition: 'left', homeLayout: 'bento', maxHomeItems: 6, cardShape: 'rect', cardContent: 'gradient', cardTextPos: 'center',
        cardSize: 'normal', cardAlign: 'center', cardGap: 'tight', cardSurface: 'glow',
        showHeader: true, headerStyle: 'logo+title+caption',
        includeIntermediate: true, intermediateStyle: 'columns', resultTemplate: 'card-grid',
        intermediate: { headerColor: '#0B1220', background: '#050B14', cardBackground: 'rgba(34,211,238,0.07)', cardText: '#E6FBFF', accent: '#22D3EE', itemSize: 'large', showHeader: true, cardShape: 'rect', align: 'left', gap: 'tight' },
        result: { headerColor: '#0B1220', background: '#070F1A', cardBackground: 'rgba(255,255,255,0.06)', cardText: '#E6FBFF', accent: '#22D3EE', pathColor: '#22D3EE', pathStyle: 'animated', showHeader: true },
        animation: { transition: 'slide-left', speed: 'fast', applyToAll: true },
        loader: { style: 'dot-pulse', color: '#22D3EE' },
        typography: { fontFamily: font('inter'), textScale: 'normal', textFit: 'shrink', baseTextColor: '#E6FBFF' },
        saverOverlay: { showContent: true, title: 'Volt Mega Store', subtitle: 'Tap to explore the latest tech', position: 'bottom-right', textColor: '#22D3EE', bgColor: 'rgba(5,11,20,0.6)' },
      }) },

      // 3) Atelier Mode — elegant fashion boutique · horizontal pill lookbook rail, no intermediate.
      { id: 'pre_atelier', name: 'Atelier Mode', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#1C1917', background: 'linear-gradient(160deg,#FAF7F2,#EDE5DA)', cardBackground: '#FFFFFF', cardText: '#1C1917', accent: '#A16207', overlayColor: 'rgba(28,25,23,0.55)',
        logoPosition: 'center', homeLayout: 'h-scroll', maxHomeItems: 8, cardShape: 'pill', cardContent: 'image-text', cardTextPos: 'below',
        cardSize: 'large', cardAlign: 'center', cardGap: 'loose', cardSurface: 'flat',
        showHeader: true, headerStyle: 'title+caption',
        includeIntermediate: false, intermediateStyle: 'card-strip', resultTemplate: 'shelf',
        intermediate: { headerColor: '#1C1917', background: '#FAF7F2', cardBackground: '#FFFFFF', cardText: '#1C1917', accent: '#A16207', itemSize: 'medium', showHeader: true, cardShape: 'pill', align: 'center', gap: 'loose' },
        result: { headerColor: '#1C1917', background: '#FAF7F2', cardBackground: '#FFFFFF', cardText: '#1C1917', accent: '#A16207', pathColor: '#A16207', pathStyle: 'dotted', showHeader: true },
        animation: { transition: 'shimmer', speed: 'normal', applyToAll: true },
        loader: { style: 'skeleton', color: '#A16207' },
        typography: { fontFamily: font('nunito'), textScale: 'normal', textFit: 'wrap', baseTextColor: '#1C1917' },
        saverOverlay: { showContent: true, title: 'Atelier Mode', subtitle: 'Touch to browse the collection', position: 'center', textColor: '#FFFFFF', bgColor: 'transparent' },
      }) },

      // 4) Summit Sports — bold sports & outdoor wall · full-height image strips · blaze orange.
      { id: 'pre_summit', name: 'Summit Sports', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#EA580C', background: 'linear-gradient(135deg,#1C1917,#292524)', cardBackground: 'rgba(255,255,255,0.10)', cardText: '#FFFFFF', accent: '#F97316', overlayColor: 'rgba(0,0,0,0.45)',
        logoPosition: 'center', homeLayout: 'image-strip', maxHomeItems: 5, cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'overlay-top',
        cardSize: 'normal', cardAlign: 'center', cardGap: 'tight', cardSurface: 'outlined',
        showHeader: true, headerStyle: 'title-only',
        includeIntermediate: true, intermediateStyle: 'center-tiles', resultTemplate: 'map-full',
        intermediate: { headerColor: '#EA580C', background: '#1C1917', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#F97316', itemSize: 'large', showHeader: true, cardShape: 'rect', align: 'center', gap: 'tight' },
        result: { headerColor: '#EA580C', background: '#171412', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#F97316', pathColor: '#F97316', pathStyle: 'solid', showHeader: true },
        animation: { transition: 'scale-up', speed: 'fast', applyToAll: true },
        loader: { style: 'spinner', color: '#F97316' },
        typography: { fontFamily: font('bebas'), textScale: 'large', textFit: 'shrink', baseTextColor: '#FFFFFF' },
        saverOverlay: { showContent: true, title: 'Summit Sports', subtitle: 'Touch to gear up', position: 'bottom-left', textColor: '#FFFFFF', bgColor: 'rgba(0,0,0,0.45)' },
      }) },

      // 5) Maison Lumière — premium gold-on-black · hexagon text tiles · glass surface · hero product reveal.
      { id: 'pre_maison', name: 'Maison Lumière', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#0A0A0A', background: 'linear-gradient(135deg,#050505,#1A1408)', cardBackground: 'rgba(212,175,55,0.10)', cardText: '#F5E7C6', accent: '#D4AF37', overlayColor: 'rgba(10,10,10,0.70)',
        logoPosition: 'center', homeLayout: 'grid-2x2', columns: 4, maxHomeItems: 8, scrollMode: 'auto', cardShape: 'hexagon', cardContent: 'text-only', cardTextPos: 'center',
        cardSize: 'small', cardAlign: 'center', cardGap: 'loose', cardSurface: 'glass',
        showHeader: true, headerStyle: 'logo+title',
        includeIntermediate: true, intermediateStyle: 'hex-grid', resultTemplate: 'product-focus',
        intermediate: { headerColor: '#0A0A0A', background: '#0B0905', cardBackground: 'rgba(212,175,55,0.10)', cardText: '#F5E7C6', accent: '#D4AF37', itemSize: 'medium', showHeader: true, cardShape: 'hexagon', align: 'center', gap: 'loose' },
        result: { headerColor: '#0A0A0A', background: '#0B0905', cardBackground: 'rgba(245,231,198,0.06)', cardText: '#F5E7C6', accent: '#D4AF37', pathColor: '#D4AF37', pathStyle: 'dashed', showHeader: true },
        animation: { transition: 'fade-slide', speed: 'slow', applyToAll: true },
        loader: { style: 'logo', color: '#D4AF37' },
        typography: { fontFamily: font('jakarta'), textScale: 'normal', textFit: 'shrink', baseTextColor: '#F5E7C6' },
        saverOverlay: { showContent: true, title: 'Maison Lumière', subtitle: 'Touch to discover the collection', position: 'center', textColor: '#F5E7C6', bgColor: 'transparent' },
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
      // Resolve idb: backgroundImage refs eagerly so consumers always see data URIs.
      this.cache = await Promise.all(raw.map(async (t) => ({ ...t, tokens: await this.mapMedia(ThemeService.normalize(t.tokens), (v) => this.resolveRef(v)) })));
    }
    return this.cache;
  }

  // ---- Media externalization (QuotaExceededError fix) ----
  // Same pattern as ContentService: Preferences is localStorage-backed (~5 MB),
  // so backgroundImage data URIs are persisted as `idb:<id>` refs (blobs in
  // IndexedDB, 't' namespace) and resolved back to data URIs on read. Themes
  // saved by older versions hold raw data URIs — externalized on next save.

  private async resolveRef(v: string): Promise<string> {
    if (!v.startsWith('idb:')) return v;
    const data = await this.images.get(v.slice(4));
    if (data === undefined) console.warn(`[nt-theme] Missing image blob ${v} — was it gc'd externally?`);
    return data ?? v;
  }

  /** Map every media-bearing token (root/intermediate/result backgroundImage) through `fn`. */
  private async mapMedia(t: ThemeTokens, fn: (v: string) => Promise<string>): Promise<ThemeTokens> {
    const val = async (v?: string): Promise<string | undefined> => (v ? await fn(v) : v);
    return {
      ...t,
      backgroundImage: await val(t.backgroundImage),
      intermediate: { ...t.intermediate, backgroundImage: await val(t.intermediate?.backgroundImage) },
      result: { ...t.result, backgroundImage: await val(t.result?.backgroundImage) },
      // Custom nav-button icons may be data URIs — externalize/resolve like other media.
      nav: t.nav ? { ...t.nav, backIcon: await val(t.nav.backIcon), homeIcon: await val(t.nav.homeIcon) } : t.nav,
    };
  }

  /** Persist themes with media externalized to IndexedDB, then gc orphaned blobs. */
  private async persist(next: SavedTheme[]): Promise<void> {
    const live = new Set<string>();
    const collect = async (v: string): Promise<string> => {
      const r = v.startsWith('data:') ? 'idb:' + (await this.images.put(v, 't')) : v;
      if (r.startsWith('idb:')) live.add(r.slice(4));
      return r;
    };
    const stored = await Promise.all(next.map(async (t) => ({ ...t, tokens: await this.mapMedia(t.tokens, collect) })));
    try {
      await Preferences.set({ key: KEY, value: JSON.stringify(stored) });
    } catch (e) {
      console.error('[nt-theme] Failed to persist themes (storage quota exceeded?) — changes are in memory only this session.', e);
    }
    await this.images.gc(live, 't');
  }

  /** True if another saved/predefined theme already uses this name (case-insensitive,
   *  trimmed). Pass the current theme id to exclude it when renaming/re-saving. */
  async nameExists(name: string, exceptId?: string): Promise<boolean> {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    const target = norm(name);
    if (!target) return false;
    const all = [...ThemeService.predefined(), ...(await this.list())];
    return all.some((t) => t.id !== exceptId && norm(t.name) === target);
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
    await this.persist(next);
    this.changed.next();
  }

  /** Delete a saved theme (predefined themes are read-only and cannot be deleted). */
  async remove(id: string): Promise<void> {
    await this.list();
    // New array reference (not in-place mutation) so list consumers re-render.
    const next = this.cache.filter((t) => t.id !== id);
    this.cache = next;
    await this.persist(next);
    this.changed.next();
  }

  /** Editing a predefined theme creates a copy in My Themes. */
  async cloneFrom(src: SavedTheme, name: string): Promise<SavedTheme> {
    const tokens: ThemeTokens = JSON.parse(JSON.stringify(src.tokens));
    // User-created themes have no designed capacity — copies are unlimited.
    delete tokens.maxHomeItems;
    const copy: SavedTheme = { id: 'thm_' + Date.now(), name, tokens, updatedAt: Date.now() };
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
    if (typeof obj.version === 'number' && obj.version > FILE_VERSION) {
      console.warn(`[nt-theme] Importing .solumtheme v${obj.version} into an app that writes v${FILE_VERSION} — unknown fields/values will be coerced to defaults.`);
    }
    // Version-check: merge onto defaults so unknown/missing tokens fall back safely.
    const tokens: ThemeTokens = ThemeService.normalize(obj.tokens || {});
    const theme: SavedTheme = { id: 'thm_' + Date.now(), name: (obj.name || 'Imported Theme'), tokens, updatedAt: Date.now() };
    await this.save(theme);
    return theme;
  }
}
