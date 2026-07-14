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
      headerTextColor: '#FFFFFF',
      background: 'linear-gradient(135deg,#2F006D,#001973)',
      cardBackground: 'rgba(255,255,255,0.15)',
      cardText: '#FFFFFF',
      accent: '#FFCD00',
      overlayColor: 'rgba(0,0,0,0.6)',
      cardSurface: 'flat',
      navStyle: 'floating',
      nav: { backColor: '#FFFFFF', backBg: '#0f172a', homeColor: '#FFFFFF', homeBg: '#0f172a', position: 'bottom-left' },
      logoPosition: 'left',
      // 'col-3' (not legacy 'grid-2x3') so a NEW theme's preview matches the
      // pre-selected "Columns" tile in the wizard exactly.
      homeLayout: 'col-3',
      columns: 3,
      scrollMode: 'horizontal',
      cardSize: 'normal',
      cardAlign: 'center',
      cardGap: 'normal',
      cardShape: 'rect',
      cardContent: 'image-text',
      cardTextPos: 'overlay-bottom',
      cardOverlayStyle: 'gradient',
      showHeader: true,
      headerStyle: 'logo-only',
      headerLayout: 'preset',
      logoPos: 'left',
      titlePos: 'center',
      captionPos: 'center',
      includeIntermediate: true,
      intermediateStyle: 'columns',
      resultTemplate: 'map-list',
    intermediate: { headerColor: 'rgba(0,0,0,0.45)', headerTextColor: '#FFFFFF', background: '#1A0036', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium', showHeader: true, showTracklist: true, cardShape: 'rect', align: 'center', scrollMode: 'horizontal', valign: 'top', gap: 'normal', textPos: 'overlay-bottom', navPosition: 'bottom-left', navSplit: false, navBackPosition: 'bottom-left', navHomePosition: 'bottom-right', fsSortOrder: 'az' },
      result: { headerColor: 'transparent', background: '#1a0036', cardBackground: '#0f172a', cardText: '#FFFFFF', accent: '#ffcd00', popularText: '#FFFFFF', pathColor: '#ffcd00', pathStyle: 'dashed', showHeader: true, showTracklist: true, navPosition: 'bottom-left', navSplit: false, navBackPosition: 'bottom-left', navHomePosition: 'bottom-right', filterPos: 'center' },
      // Default to fade-slide transition (original default).
      // The transition options remain available in the
      // Animations step for anyone who wants them.
      animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true },
      loader: { style: 'spinner', color: '#FFCD00' },
      typography: { fontFamily: DEFAULT_FONT, textScale: 'normal', textFit: 'shrink', baseTextColor: '#FFFFFF' },
      saverOverlay: { ...DEFAULT_SAVER_OVERLAY },
      screensaver: { mode: 'slideshow' },
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
    out.headerTextColor = t?.headerTextColor ?? d.headerTextColor;
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
    out.customColors = Array.isArray(t?.customColors)
      ? Array.from(new Set<string>(t.customColors
          .filter((c: unknown): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))
          .map((c: string) => c.toUpperCase()))).slice(0, 24)
      : undefined;
    const nav = { ...d.nav, ...(t?.nav || {}) };
    out.nav = nav;
    out.intermediate = {
      ...d.intermediate,
      ...(t?.intermediate || {}),
      promptTextColor: t?.intermediate?.promptTextColor ?? (t?.intermediate?.headerTextColor ?? d.intermediate.headerTextColor),
      showHeader: t?.intermediate?.showHeader ?? true,
      showTracklist: t?.intermediate?.showTracklist ?? true,
      navPosition: t?.intermediate?.navPosition ?? (t?.nav?.position ?? d.intermediate.navPosition),
      navSplit: t?.intermediate?.navSplit ?? (t?.nav?.split ?? d.intermediate.navSplit),
      navBackPosition: t?.intermediate?.navBackPosition ?? (t?.nav?.backPosition ?? d.intermediate.navBackPosition),
      navHomePosition: t?.intermediate?.navHomePosition ?? (t?.nav?.homePosition ?? d.intermediate.navHomePosition),
    };
    out.intermediate.fsSortOrder = out.intermediate.fsSortOrder === 'za' || out.intermediate.fsSortOrder === 'none' ? out.intermediate.fsSortOrder : 'az';
    out.result = {
      ...d.result,
      ...(t?.result || {}),
      showHeader: t?.result?.showHeader ?? true,
      showTracklist: t?.result?.showTracklist ?? true,
      navPosition: t?.result?.navPosition ?? (t?.nav?.position ?? d.result.navPosition),
      navSplit: t?.result?.navSplit ?? (t?.nav?.split ?? d.result.navSplit),
      navBackPosition: t?.result?.navBackPosition ?? (t?.nav?.backPosition ?? d.result.navBackPosition),
      navHomePosition: t?.result?.navHomePosition ?? (t?.nav?.homePosition ?? d.result.navHomePosition),
    };
    // Deep-merge animation + loader too — a partial object from an older/newer
    // .solumtheme file must never leave undefined fields behind.
    out.animation = { ...d.animation, ...(t?.animation || {}) };
    out.loader = { ...d.loader, ...(t?.loader || {}) };
    out.typography = { ...d.typography, ...(t?.typography || {}) };
    const saver = { ...DEFAULT_SAVER_OVERLAY, ...(t?.saverOverlay || {}) };
    out.saverOverlay = saver;
    const screensaver = { ...d.screensaver, ...(t?.screensaver || {}) };
    out.screensaver = screensaver;
    // Enum safety net: coerce unknown/invalid values (e.g. from a newer app
    // version's export) to defaults with a console warning — never pass through.
    const E = THEME_ENUM_VALUES;
    out.logoPosition = coerceEnum(out.logoPosition, E.logoPosition, d.logoPosition, 'logoPosition');
    out.homeLayout = coerceEnum(out.homeLayout, E.homeLayout, d.homeLayout, 'homeLayout');
    out.cardSize = coerceEnum(out.cardSize, E.cardSize, 'normal', 'cardSize');
    out.columns = coerceColumns(t?.columns);
    let sm = t?.scrollMode;
    if (!sm || sm === 'auto') {
      sm = 'horizontal';
    }
    out.scrollMode = coerceEnum(sm, E.scrollMode, 'horizontal', 'scrollMode');
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
    if (out.intermediate.navPosition !== undefined) out.intermediate.navPosition = coerceEnum(out.intermediate.navPosition, E.navButtonPosition, 'bottom-left', 'intermediate.navPosition');
    if (out.intermediate.navBackPosition !== undefined) out.intermediate.navBackPosition = coerceEnum(out.intermediate.navBackPosition, E.navButtonPosition, 'bottom-left', 'intermediate.navBackPosition');
    if (out.intermediate.navHomePosition !== undefined) out.intermediate.navHomePosition = coerceEnum(out.intermediate.navHomePosition, E.navButtonPosition, 'bottom-right', 'intermediate.navHomePosition');
    out.intermediate.cardShape = coerceEnum(out.intermediate.cardShape, E.cardShape, 'rect', 'intermediate.cardShape');
    out.intermediate.align = coerceEnum(out.intermediate.align, E.align, 'center', 'intermediate.align');
    out.intermediate.textAlign = coerceEnum(out.intermediate.textAlign, E.align, 'center', 'intermediate.textAlign');
    out.intermediate.scrollMode = coerceEnum(out.intermediate.scrollMode, E.scrollMode, 'horizontal', 'intermediate.scrollMode');
    out.intermediate.valign = coerceEnum(out.intermediate.valign, E.valign, 'middle', 'intermediate.valign');
    out.intermediate.gap = coerceEnum(out.intermediate.gap, E.gap, 'normal', 'intermediate.gap');
    out.intermediate.textPos = coerceEnum(out.intermediate.textPos, E.cardTextPos, d.intermediate.textPos || 'overlay-bottom', 'intermediate.textPos');
    out.result.pathStyle = coerceEnum(out.result.pathStyle, E.pathStyle, d.result.pathStyle, 'result.pathStyle');
    if (out.result.navPosition !== undefined) out.result.navPosition = coerceEnum(out.result.navPosition, E.navButtonPosition, 'bottom-left', 'result.navPosition');
    if (out.result.navBackPosition !== undefined) out.result.navBackPosition = coerceEnum(out.result.navBackPosition, E.navButtonPosition, 'bottom-left', 'result.navBackPosition');
    if (out.result.navHomePosition !== undefined) out.result.navHomePosition = coerceEnum(out.result.navHomePosition, E.navButtonPosition, 'bottom-right', 'result.navHomePosition');
    out.result.filterPos = coerceEnum(out.result.filterPos, E.filterPosition, 'center', 'result.filterPos');
    out.animation.transition = coerceEnum(out.animation.transition, E.transition, d.animation.transition, 'animation.transition');
    out.animation.speed = coerceEnum(out.animation.speed, E.animSpeed, d.animation.speed, 'animation.speed');
    out.loader.style = coerceEnum(out.loader.style, E.loaderStyle, d.loader.style, 'loader.style');
    out.typography.textScale = coerceEnum(out.typography.textScale, E.textScale, d.typography.textScale, 'typography.textScale');
    out.typography.textFit = coerceEnum(out.typography.textFit, E.textFit, d.typography.textFit, 'typography.textFit');
    screensaver.mode = coerceEnum(screensaver.mode, ['slideshow', 'single-image', 'video'], 'slideshow', 'screensaver.mode');
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
    const clampScale = (v: unknown): number | undefined => {
      const n = Number(v);
      return v !== undefined && Number.isFinite(n) ? Math.min(2.0, Math.max(0.6, n)) : undefined;
    };
    out.typography.cardTextScaleNum = clampScale(out.typography.cardTextScaleNum);
    out.typography.headerTextScaleNum = clampScale(out.typography.headerTextScaleNum);
    out.typography.promoCopyTextScaleNum = clampScale(out.typography.promoCopyTextScaleNum);
    out.typography.promoCardTextScaleNum = clampScale(out.typography.promoCardTextScaleNum);
    out.typography.intermediateTextScaleNum = clampScale(out.typography.intermediateTextScaleNum);
    out.typography.resultTextScaleNum = clampScale(out.typography.resultTextScaleNum);
    // Optional fine-grained card-size multiplier (slider).
    const csn = Number(out.cardSizeScale);
    out.cardSizeScale = out.cardSizeScale !== undefined && Number.isFinite(csn)
      ? Math.min(1.1, Math.max(0.8, csn)) : undefined;
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
      { id: 'pre_electro_pulse', name: 'Electro Pulse', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#070B18', headerTextColor: '#EAFBFF', background: 'linear-gradient(135deg,#050816,#10213A)', cardBackground: 'rgba(34,211,238,0.12)', cardText: '#EAFBFF', accent: '#22D3EE', overlayColor: 'rgba(5,8,22,0.72)',
        logoPosition: 'left', homeLayout: 'bento', maxHomeItems: 7, cardShape: 'rect', cardContent: 'gradient', cardTextPos: 'center',
        cardSize: 'normal', cardAlign: 'center', cardGap: 'tight', cardSurface: 'glow', showHeader: true, headerStyle: 'logo+title+caption',
        includeIntermediate: true, intermediateStyle: 'finder-select', resultTemplate: 'finder-detail',
        intermediate: { headerColor: '#070B18', headerTextColor: '#EAFBFF', background: '#07101F', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#22D3EE', itemSize: 'medium', showHeader: false, cardShape: 'rect', align: 'center', gap: 'normal', heroColor: '#0D1930', fsCardContent: 'image-text', fsCardShape: 'rect', fsTextPos: 'center', fsTextAlign: 'center', fsShowPrompt: true, fsShowBack: true, promptPrefix: 'SELECT YOUR', stepLabels: ['Device', 'Brand', 'Model'] },
        result: { headerColor: '#070B18', background: '#07101F', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#22D3EE', pathColor: '#22D3EE', pathStyle: 'animated', showHeader: true, railBg: '#0D1930', findColor: '#0EA5E9' },
        animation: { transition: 'slide-left', speed: 'fast', applyToAll: true }, loader: { style: 'dot-pulse', color: '#22D3EE' },
        typography: { fontFamily: font('inter'), textScale: 'normal', textFit: 'shrink', baseTextColor: '#EAFBFF', cardTextScaleNum: 1.05, headerTextScaleNum: 1.05, intermediateTextScaleNum: 1, resultTextScaleNum: 0.95 },
        saverOverlay: { showContent: true, title: 'Electro Pulse', subtitle: 'Touch to compare the latest devices', position: 'bottom-right', textColor: '#EAFBFF', bgColor: 'rgba(7,11,24,0.62)' },
      }) },
      { id: 'pre_fresh_market', name: 'Bakery Glow', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#7C2D12', headerTextColor: '#FFF7ED', background: 'linear-gradient(135deg,#FFF7ED,#FED7AA)', cardBackground: '#FFFFFF', cardText: '#431407', accent: '#EA580C', overlayColor: 'rgba(67,20,7,0.58)',
        logoPosition: 'left', homeLayout: 'promo-categories', maxHomeItems: 6, cardShape: 'pill', cardContent: 'image-text', cardTextPos: 'overlay-bottom',
        cardSize: 'large', cardAlign: 'left', cardGap: 'normal', cardSurface: 'raised', showHeader: true, headerStyle: 'logo+title',
        includeIntermediate: true, intermediateStyle: 'brand-rail', resultTemplate: 'promo-list',
        intermediate: { headerColor: '#7C2D12', headerTextColor: '#FFF7ED', background: 'linear-gradient(135deg,#FFF7ED,#FDBA74)', cardBackground: '#FFF7ED', cardText: '#431407', accent: '#EA580C', itemSize: 'large', showHeader: true, cardShape: 'circle', align: 'center', gap: 'normal', content: 'image-text', textPos: 'below', brandRailMessagePos: 'right', brandRailMessageAlign: 'center', brandRailMessageBgColor: 'rgba(124,45,18,0.22)', brandRailMessageTextColor: '#431407' },
        result: { headerColor: '#7C2D12', background: '#FFF7ED', cardBackground: '#FFFFFF', cardText: '#431407', accent: '#EA580C', pathColor: '#EA580C', pathStyle: 'solid', showHeader: true },
        animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true }, loader: { style: 'progress', color: '#EA580C' },
        typography: { fontFamily: font('source'), textScale: 'normal', textFit: 'wrap', baseTextColor: '#431407', promoCopyTextScaleNum: 1.12, promoCardTextScaleNum: 0.95, cardTextScaleNum: 1 },
        saverOverlay: { showContent: true, title: 'Bakery Glow', subtitle: 'Tap for fresh offers and aisle help', position: 'bottom', textColor: '#FFF7ED', bgColor: 'rgba(124,45,18,0.55)' },
      }) },
      { id: 'pre_supermarket2', name: 'Supermarket2', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: 'transparent', headerTextColor: '#FFFFFF', background: '#FFFFFF', backgroundImage: 'assets/dummy/supermarket2/background.jpg', bgImageX: 50, bgImageY: 50, bgImageZoom: 100,
        cardBackground: 'rgba(255,255,255,0.15)', cardText: '#FFFFFF', accent: '#FFCD00', overlayColor: 'rgba(0,0,0,0.6)',
        logoPosition: 'left', homeLayout: 'col-3', columns: 3, maxHomeItems: 5, scrollMode: 'horizontal',
        cardShape: 'circle', cardContent: 'image-text', cardTextPos: 'overlay-bottom', cardSize: 'normal', cardAlign: 'left', cardGap: 'normal', cardSurface: 'flat',
        showHeader: true, headerStyle: 'logo-only', includeIntermediate: true, intermediateStyle: 'columns', resultTemplate: 'product-focus',
        intermediate: { headerColor: 'transparent', headerTextColor: '#FFFFFF', background: '#FFFFFF', backgroundImage: 'assets/dummy/supermarket2/background.jpg', bgImageX: 50, bgImageY: 50, bgImageZoom: 100, cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium', showHeader: true, showTracklist: true, cardShape: 'circle', align: 'center', scrollMode: 'horizontal', valign: 'middle', gap: 'normal', content: 'image-text', textPos: 'overlay-bottom', textAlign: 'center', brandRailMessagePos: 'left', brandRailMessageBgColor: 'transparent' },
        result: { headerColor: 'transparent', background: '#FFFFFF', backgroundImage: 'assets/dummy/supermarket2/background.jpg', cardBackground: 'rgba(255,255,255,0.15)', cardText: '#FFFFFF', accent: '#FFCD00', popularText: '#FFFFFF', pathColor: '#FFCD00', pathStyle: 'dashed', showHeader: false, showTracklist: true, filterPos: 'center' },
        animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true }, loader: { style: 'dot-pulse', color: '#FFCD00' },
        typography: { fontFamily: font('inter'), textScale: 'normal', textFit: 'shrink', baseTextColor: '#FFFFFF', cardTextScaleNum: 0.92, intermediateTextScaleNum: 0.95, resultTextScaleNum: 1.0 },
        saverOverlay: { showContent: true, title: 'Supermarket2', subtitle: 'Touch to find fresh picks', position: 'center', textColor: '#FFFFFF', bgColor: 'transparent' },
        screensaver: { mode: 'slideshow' },
      }) },
      { id: 'pre_furniture', name: 'Furniture', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: 'transparent', headerTextColor: '#FFFFFF', background: '#FFFFFF', backgroundImage: 'assets/dummy/furniture/background.jpg', bgImageX: 50, bgImageY: 50, bgImageZoom: 100,
        cardBackground: 'rgba(255,255,255,0.16)', cardText: '#FFFFFF', accent: '#FFCD75', overlayColor: 'rgba(53,38,25,0.64)',
        logoPosition: 'left', homeLayout: 'promo-categories', maxHomeItems: 5, scrollMode: 'horizontal',
        cardShape: 'circle', cardContent: 'image-text', cardTextPos: 'overlay-bottom', cardSize: 'normal', cardAlign: 'left', cardGap: 'normal', cardSurface: 'glass',
        showHeader: true, headerStyle: 'logo-only', includeIntermediate: true, intermediateStyle: 'brand-rail', resultTemplate: 'hero-product',
        intermediate: { headerColor: 'transparent', headerTextColor: '#FFFFFF', background: 'linear-gradient(135deg,#2F006D,#001973)', backgroundImage: 'assets/dummy/furniture/background.jpg', bgImageX: 50, bgImageY: 50, bgImageZoom: 100, cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium', showHeader: true, showTracklist: true, cardShape: 'rect', align: 'left', scrollMode: 'horizontal', valign: 'middle', gap: 'normal', content: 'image-text', textPos: 'overlay-bottom', brandRailMessagePos: 'left', brandRailMessageBgColor: 'transparent', brandRailMessageTextColor: '#FFFFFF', overlayStyle: 'gradient', textOverlay: true, overlayShape: 'bar' },
        result: { headerColor: 'transparent', background: '#1A0036', backgroundImage: 'assets/dummy/furniture/background.jpg', cardBackground: 'rgba(255,255,255,0.15)', cardText: '#FFFFFF', accent: '#FFCD00', popularText: '#FFFFFF', pathColor: '#FFCD00', pathStyle: 'dashed', showHeader: false, showTracklist: true, navPosition: 'bottom-center', filterPos: 'center' },
        nav: { backColor: '#FFFFFF', backBg: '#0F172A', homeColor: '#FFFFFF', homeBg: '#0F172A', position: 'bottom-center' },
        animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true }, loader: { style: 'logo', color: '#FFCD75' },
        typography: { fontFamily: font('source'), textScale: 'normal', textFit: 'shrink', baseTextColor: '#FFFFFF', promoCopyTextScaleNum: 1.1, promoCardTextScaleNum: 0.95, resultTextScaleNum: 1.05 },
        saverOverlay: { showContent: true, title: 'Furniture', subtitle: 'Touch to choose your style', position: 'bottom-left', textColor: '#FFFFFF', bgColor: 'rgba(0,0,0,0.4)' },
        screensaver: { mode: 'slideshow' },
      }) },
      { id: 'pre_tool_works', name: 'Tool Works', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#111827', headerTextColor: '#FACC15', background: 'linear-gradient(135deg,#1F2937,#111827)', cardBackground: '#FACC15', cardText: '#111827', accent: '#FACC15', overlayColor: 'rgba(17,24,39,0.72)',
        logoPosition: 'left', homeLayout: 'finder-select', maxHomeItems: 6, cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'below',
        cardSize: 'normal', cardAlign: 'center', cardGap: 'normal', cardSurface: 'outlined', showHeader: true, headerStyle: 'logo+title',
        includeIntermediate: true, intermediateStyle: 'finder-select', resultTemplate: 'drill-filter',
        intermediate: { headerColor: '#111827', headerTextColor: '#FACC15', background: '#F3F4F6', cardBackground: '#FFFFFF', cardText: '#111827', accent: '#FACC15', itemSize: 'medium', showHeader: false, cardShape: 'rect', align: 'center', gap: 'normal', heroColor: '#111827', fsCardContent: 'icon-text', fsCardShape: 'rect', fsTextPos: 'center', fsTextAlign: 'center', fsShowPrompt: true, fsShowBack: true, promptPrefix: 'CHOOSE', stepLabels: ['Fastener', 'Type', 'Size'] },
        result: { headerColor: '#111827', background: '#F3F4F6', cardBackground: '#FFFFFF', cardText: '#111827', accent: '#FACC15', pathColor: '#FACC15', pathStyle: 'solid', showHeader: true },
        animation: { transition: 'scale-up', speed: 'fast', applyToAll: true }, loader: { style: 'spinner', color: '#FACC15' },
        typography: { fontFamily: font('jakarta'), textScale: 'normal', textFit: 'shrink', baseTextColor: '#111827', cardTextScaleNum: 1.08, intermediateTextScaleNum: 1.05, resultTextScaleNum: 0.92 },
        saverOverlay: { showContent: true, title: 'Tool Works', subtitle: 'Touch to find the right part', position: 'bottom-left', textColor: '#FACC15', bgColor: 'rgba(17,24,39,0.72)' },
      }) },
      { id: 'pre_dairy_fresh', name: 'Dairy Fresh', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#075985', headerTextColor: '#ECFEFF', background: 'linear-gradient(135deg,#E0F2FE,#F0FDFA)', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#14B8A6', overlayColor: 'rgba(7,89,133,0.56)',
        logoPosition: 'center', homeLayout: 'col-4', columns: 4, maxHomeItems: 8, cardShape: 'circle', cardContent: 'image-text', cardTextPos: 'below',
        cardSize: 'normal', cardAlign: 'center', cardGap: 'loose', cardSurface: 'glass', showHeader: true, headerStyle: 'logo+title',
        includeIntermediate: true, intermediateStyle: 'columns', resultTemplate: 'shelf',
        intermediate: { headerColor: '#075985', headerTextColor: '#ECFEFF', background: '#E0F2FE', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#14B8A6', itemSize: 'medium', showHeader: true, cardShape: 'circle', align: 'center', gap: 'loose', content: 'image-text', textPos: 'below' },
        result: { headerColor: '#075985', background: '#F8FAFC', cardBackground: '#FFFFFF', cardText: '#0F172A', accent: '#14B8A6', pathColor: '#14B8A6', pathStyle: 'dashed', showHeader: true },
        animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true }, loader: { style: 'skeleton', color: '#14B8A6' },
        typography: { fontFamily: font('nunito'), textScale: 'normal', textFit: 'wrap', baseTextColor: '#0F172A', cardTextScaleNum: 1, intermediateTextScaleNum: 1, resultTextScaleNum: 0.95 },
        saverOverlay: { showContent: true, title: 'Dairy Fresh', subtitle: 'Touch for chilled picks and offers', position: 'center', textColor: '#ECFEFF', bgColor: 'rgba(7,89,133,0.46)' },
      }) },
      { id: 'pre_beauty_lane', name: 'Beauty Lane', predefined: true, updatedAt: 0, tokens: mk({
        headerColor: '#000000', headerTextColor: '#FFFFFF', background: '#FFFFFF', cardBackground: '#FFFFFF', cardText: '#111827', accent: '#EC4899', overlayColor: 'rgba(0,0,0,0.52)',
        logoPosition: 'left', homeLayout: 'image-strip', columns: 4, maxHomeItems: 4, cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'overlay-bottom',
        cardSize: 'large', cardAlign: 'center', cardGap: 'tight', cardSurface: 'flat', showHeader: true, headerStyle: 'logo+title',
        includeIntermediate: false, intermediateStyle: 'card-strip', resultTemplate: 'catalog-grid',
        intermediate: { headerColor: '#000000', headerTextColor: '#FFFFFF', background: '#FFFFFF', cardBackground: '#FFFFFF', cardText: '#111827', accent: '#EC4899', itemSize: 'medium', showHeader: true, cardShape: 'pill', align: 'center', gap: 'normal', content: 'image-text', textPos: 'below' },
        result: { headerColor: '#000000', background: '#FFFFFF', cardBackground: '#FFFFFF', cardText: '#111827', accent: '#EC4899', pathColor: '#EC4899', pathStyle: 'dotted', showHeader: true },
        animation: { transition: 'shimmer', speed: 'normal', applyToAll: true }, loader: { style: 'logo', color: '#EC4899' },
        typography: { fontFamily: font('inter'), textScale: 'normal', textFit: 'shrink', baseTextColor: '#111827', cardTextScaleNum: 0.95, headerTextScaleNum: 0.95, resultTextScaleNum: 0.9 },
        saverOverlay: { showContent: true, title: 'Beauty Lane', subtitle: 'Touch to browse by concern or finish', position: 'bottom-right', textColor: '#FFFFFF', bgColor: 'rgba(0,0,0,0.46)' },
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
