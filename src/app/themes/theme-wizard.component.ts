import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar, IonFooter } from '@ionic/angular/standalone';
import { ColorPickerComponent } from '../shared/color-picker.component';
import { ContentPreviewStripComponent } from '../shared/content-preview-strip.component';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { ImagePickerService } from '../services/image-picker.service';
import { FONTS } from '../shared/fonts';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { ThemeTokens, HomeLayout, CardShape, CardContent, CardTextPos, IntermediateStyle, ResultTemplate, TransitionType, AnimSpeed, LoaderStyle, LogoPosition, TextScale, TextFit, TextCase, HeaderStyle, CardSurface, NavStyle, NavButtonPosition, NavButtonMode, NavButtonSize, SaverOverlayPosition, ScrollMode } from '@contract/layout';
import { MIN_COLUMNS, MAX_COLUMNS, columnsForLayout, coerceColumns, NAV_ICONS, navIconKind } from '@contract/layout';

type PreviewPage = 'home' | 'inter' | 'result' | 'saver';
interface Step { key: string; page: PreviewPage; }

/** Visual theme wizard. Live preview re-renders the selected layout/card/intermediate/result
 *  + colours. Steps for intermediate are hidden when intermediate is skipped. */
@Component({
  selector: 'app-theme-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerComponent, ContentPreviewStripComponent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar, IonFooter],
  templateUrl: './theme-wizard.component.html',
  styleUrls: ['./theme-wizard.component.scss'],
})
export class ThemeWizardComponent implements OnInit {
  readonly resultTransparentHeaderColor = 'transparent';
  @ViewChild('wizardSteps') wizardSteps?: ElementRef<HTMLElement>;
  @ViewChild(IonContent) content?: IonContent;
  name = '';
  id: string | null = null;
  openedFromPreview = false;
  previewReturnId: string | null = null;
  t: ThemeTokens = ThemeService.defaultTokens();
  saverMode = 'slideshow';
  stepIndex = 0;
  /** Shown on the Review step when the chosen name collides with an existing theme. */
  nameError = '';

  private allSteps: Step[] = [
    { key: 'home', page: 'home' },
    { key: 'colors', page: 'home' },
    { key: 'type', page: 'home' },
    { key: 'intStyle', page: 'inter' },
    { key: 'intColors', page: 'inter' },
    { key: 'resTemplate', page: 'result' },
    { key: 'resColors', page: 'result' },
    { key: 'anim', page: 'home' },
    { key: 'saver', page: 'saver' },
    { key: 'review', page: 'home' },
  ];
  private readonly stepNames: Record<string, string> = {
    home: 'Home',
    colors: 'Colors',
    type: 'Type',
    intStyle: 'Intermediate',
    intColors: 'Intermediate colors',
    resTemplate: 'Result',
    resColors: 'Result colors',
    anim: 'Loader',
    saver: 'Screensaver',
    review: 'Review',
  };

  slots = [0, 1, 2, 3, 4, 5];
  labels = ['Bakery', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Drinks'];

  /** Grid/column variants collapse into ONE 'Columns' tile — the free column
   *  stepper picks the count (legacy layouts still map onto it when editing). */
  homeLayouts: HomeLayout[] = ['col-3', 'fullscreen', 'image-strip', 'promo-categories', 'bento'];
  layoutLabels: Record<HomeLayout, string> = {
    'grid-2x3': 'Columns', 'grid-2x2': 'Columns', 'col-2': 'Columns', 'col-3': 'Columns', 'col-4': 'Columns',
    'hero-list': 'Hero + list', 'list': 'List rows', 'fullscreen': 'Fullscreen',
    'image-strip': 'Image strips', 'hero-start': 'Hero start', 'promo-categories': 'Promo categories',
    'h-scroll': 'Horizontal scroll', 'bento': 'Bento grid',
  };
  /** Independent card axes — any shape × any content × any text position. */
  cardShapes: { id: CardShape; label: string }[] = [
    { id: 'rect', label: 'Rectangle' }, { id: 'pill', label: 'Pill' }, { id: 'circle', label: 'Circle' }, { id: 'hexagon', label: 'Hexagon' },
  ];
  // 'color-block' removed from the picker — it looked identical to 'text-only'
  // (both are text on a coloured card). Enum + CSS kept so older themes render.
  cardContents: { id: CardContent; label: string }[] = [
    { id: 'image-text', label: 'Image + Text' }, { id: 'image-only', label: 'Image only' }, { id: 'text-only', label: 'Text only' },
    { id: 'icon-text', label: 'Icon + Text' }, { id: 'gradient', label: 'Gradient' },
  ];
  cardTextPositions: { id: CardTextPos; label: string }[] = [
    { id: 'overlay-top', label: 'Inner Top' }, { id: 'overlay-bottom', label: 'Inner Bottom' }, { id: 'center', label: 'Center' }, { id: 'above', label: 'Top (above)' }, { id: 'below', label: 'Below' },
  ];
  /** Text-position applies to every content with a label (all except image-only),
   *  and to hero-start (it positions the hero copy). */
  get showTextPos(): boolean { return this.t.homeLayout === 'hero-start' || this.t.cardContent !== 'image-only'; }
  /** Text overlay only makes sense for image-text content when the text is
   *  positioned on top of the image (overlay-top, overlay-bottom, center).
   *  For 'above'/'below' positions text is outside the image, and for
   *  non-image content types there is no image to overlay on. */
  private readonly overlayPositions: CardTextPos[] = ['overlay-top', 'overlay-bottom', 'center'];
  get overlayRelevant(): boolean {
    return this.t.cardContent === 'image-text' && this.overlayPositions.includes(this.t.cardTextPos);
  }
  /** 'Below' only makes sense when there is an image to sit below — hidden for
   *  every text-style content, and for arrangements with no under-card area
   *  (image-strip, hero-start). Centralized so every QA scenario goes through
   *  one rule (B6, C2, C3, D3, E3). */
  private readonly noBelowContents: CardContent[] = ['text-only', 'icon-text', 'color-block', 'gradient'];
  private readonly noBelowLayouts: HomeLayout[] = ['image-strip', 'hero-start'];
  private get homeBelowHidden(): boolean {
    return this.noBelowContents.includes(this.t.cardContent) || this.noBelowLayouts.includes(this.t.homeLayout);
  }
  get textPositionsFor(): { id: CardTextPos; label: string }[] {
    return this.homeBelowHidden ? this.cardTextPositions.filter((p) => p.id !== 'below' && p.id !== 'above') : this.cardTextPositions;
  }
  get interTextPositions(): { id: CardTextPos; label: string }[] {
    return (this.t.intermediate.content || 'image-text') === 'text-only' ? this.cardTextPositions.filter((p) => p.id !== 'below' && p.id !== 'above') : this.cardTextPositions;
  }
  /** When the current selection is a now-hidden 'below', coerce it to 'center'
   *  (edit-time only — deployed themes keep rendering via CSS fallbacks). */
  private coerceTextPos(): void {
    if ((this.t.cardTextPos === 'below' || this.t.cardTextPos === 'above') && this.homeBelowHidden) this.t.cardTextPos = 'center';
    if ((this.t.intermediate.content || 'image-text') === 'text-only' && (this.t.intermediate.textPos === 'below' || this.t.intermediate.textPos === 'above')) this.t.intermediate.textPos = 'center';
  }
  /** Pick card shape; clamp columns if the new shape has a tighter max. */
  pickShape(s: CardShape): void {
    this.t.cardShape = s;
    if (this.t.columns && this.t.columns > this.maxColumns) {
      this.t.columns = this.maxColumns;
    }
    if (typeof this.t.cardSizeScale === 'number' && this.t.cardSizeScale > this.cardSizeMax) {
      this.setCardSize(this.cardSizeMax);
    }
  }
  pickContent(c: CardContent): void { this.t.cardContent = c; this.coerceTextPos(); }
  pickInterContent(c: 'image-text' | 'text-only'): void { this.t.intermediate.content = c; this.coerceTextPos(); }

  /** Layouts where circle/hexagon shapes don't render well and are hidden.
   *  h-scroll DOES support all shapes (handled inside the rail), hero-list does NOT. */
  private readonly noShapeLayouts: HomeLayout[] = ['list', 'fullscreen', 'image-strip', 'hero-list', 'bento'];

  pickLayout(l: HomeLayout): void {
    this.t.homeLayout = l;
    // Reset the free column count so the new layout's default applies.
    this.t.columns = undefined;
    if (l === 'image-strip') this.t.columns = 4;
    if (l === 'bento') this.t.columns = 4;
    // Reset layout-dependent settings so stale values from the previous layout
    // don't bleed into the new one (e.g. 'loose' gap on a tight layout).
    this.t.cardGap = 'normal';
    this.t.cardGapNum = undefined;
    this.t.cardAlign = 'center';
    this.t.cardVAlign = 'middle';
    this.t.cardSize = 'normal';
    this.t.cardSizeScale = undefined;
    // Auto-reset circle/hexagon when switching to shape-incompatible layouts
    if (this.noShapeLayouts.includes(l) &&
        (this.t.cardShape === 'circle' || this.t.cardShape === 'hexagon')) {
      this.t.cardShape = 'rect';
    }
    // Auto-reset overflow scrolling if the new layout doesn't offer the current
    // mode (e.g. Column+Horizontal → Hero+List, which has no Horizontal option):
    // leaving a stale 'horizontal' applied the scroll-horizontal class to a
    // layout that can't lay out as a row and broke the preview/render.
    if (!this.scrollModesFor.some((m) => m.id === this.t.scrollMode)) {
      this.t.scrollMode = 'vertical';
    }
    this.coerceTextPos();
  }

  /** Only show circle/hexagon shapes for layouts where they make visual sense. */
  get availableCardShapes(): { id: CardShape; label: string }[] {
    let base = this.noShapeLayouts.includes(this.t.homeLayout)
      ? this.cardShapes.filter(s => s.id !== 'circle' && s.id !== 'hexagon')
      : this.cardShapes;
    // Image-only cards get a 'None' option so the image shows un-masked
    // (any other shape clips/rounds the image).
    if (this.t.cardContent === 'image-only') base = [{ id: 'none', label: 'None' }, ...base];
    return base;
  }
  // ----- Free column count (grid/column layouts) -----
  readonly minColumns = MIN_COLUMNS;
  /** Dynamic max columns: circle/hex (square cards) get a tighter cap because
   *  the card height constrains width on the landscape kiosk (1920×540). */
  get maxColumns(): number {
    const shape = this.t.cardShape;
    if (shape === 'circle' || shape === 'hexagon') return 5;
    return MAX_COLUMNS;
  }
  /** Layouts whose column count can be freely overridden. */
  private readonly columnLayouts: HomeLayout[] = ['grid-2x3', 'grid-2x2', 'col-2', 'col-3', 'col-4'];
  get columnsMatter(): boolean { return this.columnLayouts.includes(this.t.homeLayout) || this.itemCountMatters; }
  /** The single 'Columns' tile is selected for every legacy grid/col id. */
  get isGridLike(): boolean { return this.columnLayouts.includes(this.t.homeLayout); }
  get isHeroStart(): boolean { return this.t.homeLayout === 'hero-start'; }
  /** Layouts with a free ITEM count (same stepper, different meaning). */
  get itemCountMatters(): boolean { return ['image-strip', 'bento', 'hero-list'].includes(this.t.homeLayout); }
  /** Overflow-scrolling control: hidden where it breaks the layout or is moot. */
  get scrollMatters(): boolean { return !['image-strip', 'hero-start', 'bento', 'fullscreen', 'promo-categories'].includes(this.t.homeLayout); }
  /** Card gap: hidden where cards always fill the screen. */
  get gapMatters(): boolean { return !['image-strip', 'fullscreen'].includes(this.t.homeLayout); }
  get scrollModesFor(): { id: ScrollMode; label: string }[] {
    return this.t.homeLayout === 'hero-list' ? this.scrollModes.filter(m => m.id !== 'horizontal') : this.scrollModes;
  }
  /** Intermediate content options (image layouts only). */
  interContents: { id: 'image-text' | 'text-only'; label: string }[] = [
    { id: 'image-text', label: 'Image + Text' }, { id: 'text-only', label: 'Text only' },
  ];
  /** Alignment is a no-op for styles whose items always fill the row. */
  get intAlignMatters(): boolean {
    return !['fullscreen', 'accordion', 'scroll-list', 'drill-stair'].includes(this.t.intermediateStyle);
  }
  /** Intermediate text-position applies to these styles. */
  get intTextPosMatters(): boolean {
    return ['columns', 'card-strip', 'circular', 'hex-grid', 'fullscreen'].includes(this.t.intermediateStyle);
  }
  get isImageStrip(): boolean { return this.t.homeLayout === 'image-strip'; }
  /** Card size: hidden where cards always fill the screen (fullscreen, strips). */
  get sizeMatters(): boolean { return !['fullscreen', 'image-strip'].includes(this.t.homeLayout); }
  get isHeroList(): boolean { return this.t.homeLayout === 'hero-list'; }
  /** hero-list: the alignment control means VERTICAL alignment of the list. */
  get alignsFor(): { id: 'left' | 'center' | 'right'; label: string }[] {
    return this.isHeroList
      ? [{ id: 'left', label: 'Top' }, { id: 'center', label: 'Center' }, { id: 'right', label: 'Bottom' }]
      : this.aligns;
  }
  /** Result: overlay text positions make sense on card-style templates. */
  get resTextPosMatters(): boolean {
    return ['card-grid', 'cards-map', 'catalog-grid'].includes(this.t.resultTemplate);
  }
  /** Result: card shape applies to templates with product cards/thumbnails. */
  get resShapeMatters(): boolean {
    return ['map-list', 'cards-map', 'list-only', 'map-full', 'card-grid', 'catalog-grid', 'filter-list', 'map-filter-list', 'shelf'].includes(this.t.resultTemplate);
  }
  /** Row templates only change the small thumbnail — rect/pill are no-ops there. */
  get resShapesFor(): { id: CardShape; label: string }[] {
    const thumbOnly = ['map-list', 'list-only', 'filter-list', 'map-filter-list'].includes(this.t.resultTemplate);
    return thumbOnly ? this.cardShapes.filter((s) => s.id === 'circle' || s.id === 'hexagon') : this.cardShapes;
  }
  /** Effective count shown in the stepper: override, else derived from the layout. */
  get effectiveColumns(): number { return this.t.columns ?? columnsForLayout(this.t.homeLayout); }
  get computedColumns(): number {
    const c = this.effectiveColumns;
    if (this.t.homeLayout === 'bento') {
      return Math.max(2, 1 + Math.ceil((c - 1) / 2));
    }
    return c;
  }
  stepColumns(delta: number): void {
    const next = Math.min(this.maxColumns, Math.max(this.minColumns, this.effectiveColumns + delta));
    this.t.columns = next;
    // Clamp card size if new column count reduces headroom.
    if (typeof this.t.cardSizeScale === 'number' && this.t.cardSizeScale > this.cardSizeMax) {
      this.setCardSize(this.cardSizeMax);
    }
  }
  setColumns(v: string): void { this.t.columns = coerceColumns(v); }

  /** Fine-grained global text size (slider). Seeds from the legacy bucket when the
   *  numeric override isn't set yet; keeps the bucket loosely in sync for any
   *  consumer that still reads textScale. */
  get textScaleValue(): number {
    const n = this.t.typography.textScaleNum;
    if (typeof n === 'number') return n;
    return this.t.typography.textScale === 'compact' ? 0.8 : this.t.typography.textScale === 'large' ? 1.25 : 1;
  }
  setTextScale(v: string | number): void {
    const n = Math.min(2.0, Math.max(0.7, Number(v)));
    this.t.typography.textScaleNum = n;
    this.t.typography.textScale = n < 0.95 ? 'compact' : n > 1.12 ? 'large' : 'normal';
  }

  /** Fine-grained card size (slider). Seeds from the legacy bucket; keeps the
   *  bucket loosely in sync for consumers that still read cardSize. */
  get cardSizeValue(): number {
    const n = this.t.cardSizeScale;
    if (typeof n === 'number') return n;
    const s = this.t.cardSize || 'normal';
    return s === 'xs' ? 0.8 : s === 'small' ? 0.9 : s === 'large' ? 1.2 : 1;
  }
  /** Dynamic card size max: more columns → less room to scale up.
   *  Also accounts for gap eating into available width. */
  get cardSizeMax(): number {
    const cols = this.computedColumns;
    const gap = this.cardGapValue;
    // Base max shrinks as columns grow; gap further reduces headroom.
    return Math.max(0.9, 1.25 - (cols - 3) * 0.06 - gap * 0.005);
  }
  setCardSize(v: string | number): void {
    const n = Math.min(this.cardSizeMax, Math.max(0.8, Number(v)));
    this.t.cardSizeScale = n;
    this.t.cardSize = n <= 0.85 ? 'xs' : n < 0.97 ? 'small' : n > 1.1 ? 'large' : 'normal';
  }

  /** Fine-grained card gap (slider). Seeds from the legacy bucket. */
  get cardGapValue(): number {
    const n = this.t.cardGapNum;
    if (typeof n === 'number') return n;
    const g = this.t.cardGap || 'normal';
    return g === 'tight' ? 2 : g === 'loose' ? 10 : 5;
  }
  setCardGap(v: string | number): void {
    const n = Math.min(20, Math.max(0, Number(v)));
    this.t.cardGapNum = n;
    this.t.cardGap = n <= 3 ? 'tight' : n >= 8 ? 'loose' : 'normal';
  }

  /** Fine-grained intermediate card gap (slider). */
  get intCardGapValue(): number {
    const n = this.t.intermediate.gapNum;
    if (typeof n === 'number') return n;
    const g = this.t.intermediate.gap || 'normal';
    return g === 'tight' ? 2 : g === 'loose' ? 10 : 5;
  }
  setIntCardGap(v: string | number): void {
    const n = Math.min(20, Math.max(0, Number(v)));
    this.t.intermediate.gapNum = n;
    this.t.intermediate.gap = n <= 3 ? 'tight' : n >= 8 ? 'loose' : 'normal';
  }

  /** Fine-grained intermediate item size (slider). */
  get intItemSizeValue(): number {
    const n = this.t.intermediate.itemSizeScale;
    if (typeof n === 'number') return n;
    const s = this.t.intermediate.itemSize || 'medium';
    return s === 'small' ? 0.86 : s === 'large' ? 1.15 : 1;
  }
  setIntItemSize(v: string | number): void {
    const n = Math.min(1.3, Math.max(0.7, Number(v)));
    this.t.intermediate.itemSizeScale = n;
    this.t.intermediate.itemSize = n < 0.93 ? 'small' : n > 1.07 ? 'large' : 'medium';
  }

  /** Independent horizontal card-text alignment (C-3). */
  cardAligns: { id: 'left' | 'center' | 'right'; label: string }[] = [
    { id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }, { id: 'right', label: 'Right' },
  ];

  /** Map-Filter-List filter section position (G-2). */
  filterPositions: { id: 'top' | 'bottom' | 'left' | 'right'; label: string }[] = [
    { id: 'top', label: 'Top' }, { id: 'bottom', label: 'Bottom' }, { id: 'left', label: 'Left' }, { id: 'right', label: 'Right' },
  ];
  resetColumns(): void { this.t.columns = undefined; }

  // ----- Overflow scrolling -----
  scrollModes: { id: ScrollMode; label: string }[] = [
    { id: 'vertical', label: 'Vertical' }, { id: 'horizontal', label: 'Horizontal' },
  ];
  fonts = FONTS;
  textScales: TextScale[] = ['compact', 'normal', 'large'];
  /** Per-element text sizes: undefined = inherit the global text size (current behaviour). */
  elementScales: { id: TextScale | undefined; label: string }[] = [
    { id: undefined, label: 'Inherit' }, { id: 'compact', label: 'Compact' }, { id: 'normal', label: 'Normal' }, { id: 'large', label: 'Large' },
  ];
  textCases: { id: TextCase; label: string }[] = [
    { id: 'default', label: 'Default' }, { id: 'uppercase', label: 'UPPER' }, { id: 'lowercase', label: 'lower' }, { id: 'capitalize', label: 'Capitalize' },
  ];
  /** Nav button rendering mode / size / built-in icon options. */
  navModes: { id: NavButtonMode; label: string }[] = [
    { id: 'icon', label: 'Icon' }, { id: 'text', label: 'Text' }, { id: 'icon-text', label: 'Icon + Text' },
  ];
  navSizes: { id: NavButtonSize; label: string }[] = [
    { id: 'small', label: 'Small' }, { id: 'normal', label: 'Normal' }, { id: 'large', label: 'Large' },
  ];
  backNavIconIds = ['arrow'];
  homeNavIconIds = Object.keys(NAV_ICONS).filter(id => id !== 'arrow');
  iconSvg(id: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(NAV_ICONS[id] || ''); }
  isCustomNavIcon(v?: string): boolean { return navIconKind(v) === 'custom'; }
  async pickNavIcon(which: 'back' | 'home'): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (!dataUrl || !this.t.nav) return;
    if (which === 'back') this.t.nav.backIcon = dataUrl; else this.t.nav.homeIcon = dataUrl;
  }
  textFits: { id: TextFit; label: string }[] = [
    { id: 'shrink', label: 'Auto-shrink' }, { id: 'wrap', label: 'Wrap 2 lines' }, { id: 'clip', label: 'Clip …' },
  ];
  // 'hex-grid' and 'circular' removed from the picker — they're now achieved by
  // choosing a base style (e.g. Image grid) and selecting the Circle/Hexagon
  // Card shape, instead of being separate layout styles. Enums + CSS retained so
  // existing themes that use them still render.
  intStyles: IntermediateStyle[] = ['columns', 'card-strip', 'fullscreen', 'side-rail', 'brand-grid', 'brand-rail', 'drill-stair', 'finder-select'];
  intStyleLabels: Partial<Record<IntermediateStyle, string>> = {
    'columns': 'Columns', 'hex-grid': 'Hex grid', 'circular': 'Circular',
    'card-strip': 'Card strip',
    'side-rail': 'Side rail', 'brand-grid': 'Brand grid', 'brand-rail': 'Brand rail', 'drill-stair': 'Drill stair',
    'finder-select': 'Finder select',
  };
  intStyleLabel(s: IntermediateStyle): string { return this.intStyleLabels[s] || s; }
  /** Card shape only affects intermediate styles that show a per-item image. */
  get intShapeMatters(): boolean {
    return ['columns', 'card-strip', 'side-rail', 'brand-grid', 'brand-rail'].includes(this.t.intermediateStyle);
  }
  /** finder-select index-strip modes + step-label CSV binding. */
  indexModes = ['auto', 'alpha', 'values', 'off'];
  get intStepsCsv(): string { return (this.t.intermediate.stepLabels || []).join(','); }
  set intStepsCsv(v: string) { this.t.intermediate.stepLabels = v.split(',').map((s) => s.trim()).filter(Boolean); }
  /** Intermediate 'columns' style exposes a column-count slider (like Home). */
  get intColumnsMatters(): boolean { return this.t.intermediateStyle === 'columns'; }
  get intColumnsValue(): number { return this.t.intermediate.columns || 3; }
  setIntColumns(n: number): void { this.t.intermediate.columns = Math.max(2, Math.min(6, Math.round(n))); }
  /** Selectable templates — split-panel / esl-focus (map-width variants of
   *  map-list) and dual-list (2-col list-only) are hidden as near-duplicates;
   *  old themes using them still render (enum + CSS retained). */
  // Ordered by real-world usage: Map-List + Drill-Stair (+ Map-Filter-List) lead.
  // 'cards-map' dropped from the picker (near-duplicate of Map-List); enum + CSS
  // kept so existing themes using it still render. Lower-priority layouts remain
  // available rather than deleted — removal of specific ones is a product call.
  resultTemplates: ResultTemplate[] = ['map-list', 'drill-filter','map-filter-list', 'filter-list','card-grid', 'promo-list', 'product-focus', 'hero-product', 'shelf', 'promo-map-rank', 'finder-detail'];
  /** Friendly labels for the result-template tiles. */
  private tplLabels: Record<string, string> = {
    'map-list': 'Map List', 'drill-filter': 'Drill Filter', 'map-filter-list': 'Map + Filter',
    'filter-list': 'Filter List', 'card-grid': 'Card Grid', 'promo-list': 'Promo List',
    'product-focus': 'Product Focus', 'hero-product': 'Hero Product', 'shelf': 'Shelf',
    'promo-map-rank': 'Promo Map + Ranks', 'finder-detail': 'Finder + Detail',
  };
  tplLabel(o: string): string { return this.tplLabels[o] || o; }

  /** finder-detail sort-tab options + toggle helpers. */
  finderSortOpts = [
    { id: 'recommend', label: 'Recommend' }, { id: 'alpha', label: 'Alphabetical' },
    { id: 'low-price', label: 'Low Price' }, { id: 'on-sale', label: 'On Sale' },
  ] as const;
  hasSortTab(id: string): boolean {
    const cur = this.t.result.sortTabs;
    return cur ? cur.includes(id as any) : true; // undefined = all on
  }
  toggleSortTab(id: string): void {
    const all = ['recommend', 'alpha', 'low-price', 'on-sale'] as const;
    let cur = this.t.result.sortTabs ? [...this.t.result.sortTabs] : [...all];
    cur = cur.includes(id as any) ? cur.filter((x) => x !== id) : [...cur, id as any];
    // keep canonical order, never allow an empty set
    this.t.result.sortTabs = all.filter((x) => cur.includes(x)) as any;
    if (!this.t.result.sortTabs!.length) this.t.result.sortTabs = ['recommend'];
  }

  /** Floors / breadcrumb labels as comma-separated text for the inputs. */
  get floorsCsv(): string { return (this.t.result.floors || []).join(','); }
  set floorsCsv(v: string) { this.t.result.floors = v.split(',').map((s) => s.trim()).filter(Boolean); }
  get breadcrumbCsv(): string { return (this.t.result.breadcrumbLabels || []).join(','); }
  set breadcrumbCsv(v: string) { this.t.result.breadcrumbLabels = v.split(',').map((s) => s.trim()).filter(Boolean); }
  // resultTemplates: ResultTemplate[] = ['map-filter-list', 'list-only', 'filter-list', 'map-full', 'card-grid', 'catalog-grid', 'promo-list', 'product-focus', 'hero-product', 'drill-filter', 'shelf'];
  transitions: TransitionType[] = ['fade-slide', 'scale-up', 'slide-left', 'shimmer', 'none'];
  speeds: AnimSpeed[] = ['slow', 'normal', 'fast'];
  loaders: LoaderStyle[] = ['spinner', 'dot-pulse', 'progress', 'logo', 'skeleton'];
  logoPositions: LogoPosition[] = ['left', 'center', 'right'];
  headerStyles: { id: HeaderStyle; label: string }[] = [
    { id: 'logo-only', label: 'Logo only' },
    { id: 'title-only', label: 'Title only' },
    { id: 'logo+title', label: 'Logo + Title' },
    { id: 'title+caption', label: 'Title + Caption' },
    { id: 'logo+title+caption', label: 'Logo + Title + Caption' },
  ];
  cardSurfaces: { id: CardSurface; label: string }[] = [
    { id: 'flat', label: 'Flat' },
    { id: 'glass', label: 'Glass' },
    { id: 'raised', label: 'Raised' },
    { id: 'outlined', label: 'Outlined' },
    { id: 'glow', label: 'Glow' },
  ];
  // Nav Bar Style is intentionally reduced to Floating + Hidden — placement
  // (incl. Bottom Center, edges) is handled solely by Button Position below, to
  // remove the overlap/duplication between the two controls. Legacy 'edge' /
  // 'bottom-center' values stay valid in the enum + CSS so older saved themes
  // still render; they're just no longer offered for new selection.
  navStyles: { id: NavStyle; label: string }[] = [
    { id: 'floating', label: 'Floating' },
    { id: 'hidden', label: 'Hidden' },
  ];
  cardSizes: Array<'xs' | 'small' | 'normal' | 'large'> = ['xs', 'small', 'normal', 'large'];
  cardSizeLabels: Record<'xs' | 'small' | 'normal' | 'large', string> = { xs: 'XS', small: 'Small', normal: 'Normal', large: 'Large' };
  aligns: { id: 'left' | 'center' | 'right'; label: string }[] = [
    { id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }, { id: 'right', label: 'Right' },
  ];
  gaps: { id: 'tight' | 'normal' | 'loose'; label: string }[] = [
    { id: 'tight', label: 'Tight' }, { id: 'normal', label: 'Normal' }, { id: 'loose', label: 'Loose' },
  ];
  /** Alignment only changes layouts that don't already fill the row. */
  get alignMatters(): boolean {
    return ['h-scroll', 'promo-categories', 'col-2', 'col-3', 'col-4', 'hero-list'].includes(this.t.homeLayout) || this.shapeCard;
  }
  navButtonPositions: { id: NavButtonPosition; label: string }[] = [
    { id: 'bottom-left',   label: 'Bottom left' },
    { id: 'bottom-center', label: 'Bottom center' },
    { id: 'bottom-right',  label: 'Bottom right' },
    { id: 'side-left',     label: 'Side left' },
    { id: 'side-right',    label: 'Side right' },
    { id: 'header-left',   label: 'In header (left)' },
    { id: 'header-right',  label: 'In header (right)' },
    { id: 'hidden',        label: 'Hidden' },
  ];
  saverPositions: { id: SaverOverlayPosition; label: string }[] = [
    { id: 'center',       label: 'Center' },
    { id: 'bottom',       label: 'Bottom' },
    { id: 'top',          label: 'Top' },
    { id: 'bottom-left',  label: 'Bottom left' },
    { id: 'bottom-right', label: 'Bottom right' },
  ];
  sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  pathStyles: Array<'dashed' | 'solid' | 'dotted' | 'animated'> = ['dashed', 'solid', 'dotted', 'animated'];
  saverModes = ['slideshow', 'single-image', 'video'];

  /** Gradient presets offered for card-area and card backgrounds (A4/A5). The
   *  picker renders any CSS background string, and these flow through --nt-bg /
   *  --nt-card to both the preview and the LCD, so gradients work end-to-end. */
  gradientPresets = [
    'linear-gradient(135deg,#2F006D,#001973)', 'linear-gradient(160deg,#0F172A,#334155)',
    'linear-gradient(135deg,#FFCD00,#FF8A00)', 'linear-gradient(135deg,#10B981,#0EA5E9)',
    'linear-gradient(135deg,#EC4899,#8B5CF6)',
  ];
  bgPresets = ['linear-gradient(135deg,#2F006D,#001973)', '#0F172A', '#FFFFFF', '#1A0036', '#0A0A1A', ...this.gradientPresets.slice(1)];
  cardPresets = ['rgba(255,255,255,0.15)', '#FFFFFF', '#1E293B', '#F1F5F9', ...this.gradientPresets];
  textPresets = ['#FFFFFF', '#0F172A', '#FFCD00'];
  overlayPresets = ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', 'rgba(255,255,255,0.6)', 'rgba(47,0,109,0.7)'];

  constructor(private themes: ThemeService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router, private sanitizer: DomSanitizer) {}

  async ngOnInit(): Promise<void> { await this.init(); }

  /** Ionic re-enters cached page views without re-running ngOnInit. Re-initialise
   *  on every entry so "New Theme" always starts on the Home step with a clean
   *  slate instead of resuming the previous theme's Review/last step. */
  async ionViewWillEnter(): Promise<void> { await this.init(); }

  private async init(): Promise<void> {
    // Full reset so a reused (cached) wizard instance never carries stale state.
    this.stepIndex = 0;
    this.activeSlide = 0;
    this.interSynced = false;
    this.resultSynced = false;
    this.nameError = '';
    this.name = '';
    this.t = ThemeService.defaultTokens();
    this.id = this.route.snapshot.paramMap.get('id');
    this.openedFromPreview = this.route.snapshot.queryParamMap.get('from') === 'theme-preview';
    this.previewReturnId = this.route.snapshot.queryParamMap.get('returnTheme');
    if (this.id) {
      const existing = (await this.themes.list()).find((x) => x.id === this.id);
      if (existing) {
        this.name = existing.name;
        this.t = ThemeService.normalize(JSON.parse(JSON.stringify(existing.tokens)));
        // Edit-time only: a loaded theme may carry a textPos that is hidden for
        // its content/layout combo — coerce so the wizard never saves it back.
        this.coerceTextPos();
      }
    }
  }

  /** Steps actually shown (intermediate steps drop out when skipped). */
  get visibleSteps(): Step[] {
    return this.allSteps.filter((s) => this.t.includeIntermediate || (s.key !== 'intStyle' && s.key !== 'intColors'));
  }
  get step(): Step { return this.visibleSteps[this.stepIndex] ?? this.visibleSteps[0]; }
  get previewPage(): PreviewPage { return this.step.page; }
  stepLabel(key: string): string { return this.stepNames[key] || key; }

  get shapeCard(): boolean {
    if (this.t.cardShape !== 'circle' && this.t.cardShape !== 'hexagon') return false;
    return !['image-strip', 'fullscreen', 'hero-start', 'promo-categories', 'h-scroll', 'bento'].includes(this.t.homeLayout);
  }

  get scaleNum(): number { return this.t.typography.textScale === 'compact' ? 0.8 : this.t.typography.textScale === 'large' ? 1.25 : 1; }

  /** Header visibility per page (saver never shows a header). */
  headerVisibleFor(page: PreviewPage): boolean {
    return page === 'inter' ? this.t.intermediate.showHeader
      : page === 'result' ? this.t.result.showHeader
      : page === 'saver' ? false
      : this.t.showHeader;
  }
  headerColorForPage(page: PreviewPage): string {
    return page === 'inter' ? this.t.intermediate.headerColor
      : page === 'result' ? this.resultHeaderColor
      : this.t.headerColor;
  }
  get resultHeaderColor(): string {
    return this.t.result.headerColor === 'transparent'
      ? this.resultTransparentHeaderColor
      : this.t.result.headerColor;
  }
  /** Per-page transparent-header flag — mirrors the LCD's hdr-transparent handling. */
  transparentFor(page: PreviewPage): boolean {
    return page === 'inter' ? !!this.t.intermediate.transparentHeader
      : page === 'result' ? !!this.t.result.transparentHeader
      : page === 'saver' ? false
      : !!this.t.transparentHeader;
  }
  backgroundForPage(page: PreviewPage): string {
    const bg = page === 'inter' ? this.t.intermediate.background
      : page === 'result' ? this.t.result.background
      : this.t.background;
    const image = page === 'inter' ? this.t.intermediate.backgroundImage
      : page === 'result' ? this.t.result.backgroundImage
      : this.t.backgroundImage;
    return image ? `linear-gradient(rgba(0,0,0,.28), rgba(0,0,0,.28)), url("${image}") center/cover no-repeat, ${bg}` : bg;
  }
  pageCaption(page: PreviewPage): string {
    return page === 'inter' ? 'Intermediate' : page === 'result' ? 'Result' : page === 'saver' ? 'Screensaver' : 'Home';
  }
  get isCustomHeader(): boolean { return (this.t.headerLayout || 'preset') === 'custom'; }
  get showLogo(): boolean {
    if (this.isCustomHeader) return (this.t.logoPos || 'left') !== 'hidden';
    const h = this.t.headerStyle || 'logo-only'; return h === 'logo-only' || h === 'logo+title' || h === 'logo+title+caption';
  }
  get showHeaderTitle(): boolean {
    if (this.isCustomHeader) return (this.t.titlePos || 'center') !== 'hidden';
    return (this.t.headerStyle || 'logo-only') !== 'logo-only';
  }
  get showHeaderCaption(): boolean {
    if (this.isCustomHeader) return (this.t.captionPos || 'center') !== 'hidden';
    return this.t.headerStyle === 'title+caption' || this.t.headerStyle === 'logo+title+caption';
  }
  headerItemPositions: { id: 'left' | 'center' | 'right' | 'hidden'; label: string }[] = [
    { id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }, { id: 'right', label: 'Right' }, { id: 'hidden', label: 'Hidden' },
  ];

  /** Pages shown in the Review slider (skip Intermediate when disabled). */
  get reviewPages(): PreviewPage[] {
    return (['home', 'inter', 'result', 'saver'] as PreviewPage[]).filter((p) => p !== 'inter' || this.t.includeIntermediate);
  }
  activeSlide = 0;
  onSlideScroll(el: HTMLElement): void {
    const w = el.clientWidth || 1;
    this.activeSlide = Math.round(el.scrollLeft / w);
  }
  goSlide(el: HTMLElement, i: number): void { el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); }

  // ----- isolated demos (anim step): transition OR loader, never both -----
  playId = 0;
  demoMode: 'idle' | 'transition' | 'loader' = 'idle';
  private demoTimer: any = null;
  get demoMs(): number { return this.t.animation.speed === 'slow' ? 520 : this.t.animation.speed === 'fast' ? 180 : 320; }

  /** Play ONLY the page-entry transition (at the current speed). */
  replayTransition(): void {
    if (this.demoTimer) clearTimeout(this.demoTimer);
    this.demoMode = 'idle'; this.playId++;            // drop 'playing' to restart the CSS anim
    this.demoTimer = setTimeout(() => { this.demoMode = 'transition'; this.playId++; }, 30);
  }
  /** Play ONLY the chosen loader animation for a moment. */
  replayLoader(): void {
    if (this.demoTimer) clearTimeout(this.demoTimer);
    this.demoMode = 'loader'; this.playId++;
    this.demoTimer = setTimeout(() => { this.demoMode = 'idle'; this.playId++; }, 1800);
  }

  async pickBackground(page: PreviewPage): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (!dataUrl) return;
    if (page === 'inter') this.t.intermediate.backgroundImage = dataUrl;
    else if (page === 'result') this.t.result.backgroundImage = dataUrl;
    else this.t.backgroundImage = dataUrl;
  }

  /** Reset a nav-button colour to its built-in default (undefined = default). */
  resetNavColor(field: 'backColor' | 'backBg' | 'homeColor' | 'homeBg'): void {
    if (this.t.nav) this.t.nav[field] = undefined;
  }

  clearBackground(page: PreviewPage): void {
    if (page === 'inter') this.t.intermediate.backgroundImage = undefined;
    else if (page === 'result') this.t.result.backgroundImage = undefined;
    else this.t.backgroundImage = undefined;
  }

  /** Tracks whether inter/result colors have already been synced from home this session. */
  private interSynced = false;
  private resultSynced = false;

  /**
   * Copy Home colors into Intermediate defaults, but only if they are still at
   * factory defaults (i.e., the user hasn't customised them yet).
   */
  private syncInterFromHome(): void {
    if (this.interSynced) return;
    const d = ThemeService.defaultTokens().intermediate;
    const i = this.t.intermediate;
    const atDefault = (val: string, def: string) => val === def;
    if (atDefault(i.headerColor, d.headerColor)) this.t.intermediate.headerColor = this.t.headerColor;
    if (atDefault(i.background, d.background)) this.t.intermediate.background = this.t.background;
    if (atDefault(i.cardBackground, d.cardBackground)) this.t.intermediate.cardBackground = this.t.cardBackground;
    if (atDefault(i.cardText, d.cardText)) this.t.intermediate.cardText = this.t.cardText;
    if (atDefault(i.accent, d.accent)) this.t.intermediate.accent = this.t.accent;
    if (i.showHeader === d.showHeader) this.t.intermediate.showHeader = this.t.showHeader;
    this.interSynced = true;
  }

  /**
   * Copy Home colors into Result defaults, but only if they are still at
   * factory defaults.
   */
  private syncResultFromHome(): void {
    if (this.resultSynced) return;
    const d = ThemeService.defaultTokens().result;
    const r = this.t.result;
    const atDefault = (val: string, def: string) => val === def;
    if (atDefault(r.headerColor, d.headerColor)) this.t.result.headerColor = this.t.headerColor;
    if (atDefault(r.background, d.background)) this.t.result.background = this.t.background;
    if (atDefault(r.cardBackground, d.cardBackground)) this.t.result.cardBackground = this.t.cardBackground;
    if (atDefault(r.cardText, d.cardText)) this.t.result.cardText = this.t.cardText;
    if (atDefault(r.accent, d.accent)) this.t.result.accent = this.t.accent;
    if (r.showHeader === d.showHeader) this.t.result.showHeader = this.t.showHeader;
    this.resultSynced = true;
  }

  next(): void {
    if (this.stepIndex < this.visibleSteps.length - 1) this.stepIndex++;
    this.afterStepChange();
    if (this.step.key === 'anim') this.replayTransition();
    if (this.step.key === 'intColors') this.syncInterFromHome();
    if (this.step.key === 'resColors') this.syncResultFromHome();
  }
  prev(): void {
    if (this.stepIndex > 0) this.stepIndex--;
    this.afterStepChange();
    if (this.step.key === 'anim') this.replayTransition();
  }

  goStep(i: number): void {
    if (i < 0 || i >= this.visibleSteps.length) return;
    this.stepIndex = i;
    this.afterStepChange();
    if (this.step.key === 'anim') this.replayTransition();
    if (this.step.key === 'intColors') this.syncInterFromHome();
    if (this.step.key === 'resColors') this.syncResultFromHome();
  }

  private afterStepChange(): void {
    setTimeout(() => {
      void this.content?.scrollToTop(0);
      const host = this.wizardSteps?.nativeElement;
      const active = host?.querySelector<HTMLElement>('.wizard-step.active');
      active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }

  canSave(): boolean { return !!this.name.trim(); }
  get cancelLabel(): string { return this.openedFromPreview ? 'Back' : 'Cancel'; }

  async save(): Promise<void> {
    if (!this.canSave()) { this.stepIndex = this.visibleSteps.length - 1; return; }
    const name = this.name.trim();
    // Reject a name already used by another theme (incl. predefined) — case-insensitive.
    if (await this.themes.nameExists(name, this.id ?? undefined)) {
      this.nameError = `A theme named “${name}” already exists. Please choose a different name.`;
      this.stepIndex = this.visibleSteps.length - 1;
      return;
    }
    this.nameError = '';
    const theme: SavedTheme = { id: this.id ?? 'thm_' + Date.now(), name, tokens: this.t, updatedAt: Date.now() };
    await this.themes.save(theme);
    this.router.navigateByUrl('/tabs/themes');
  }
  /** Clear the duplicate-name warning as soon as the user edits the name. */
  onNameInput(): void { if (this.nameError) this.nameError = ''; }

  cancel(): void {
    if (this.openedFromPreview && this.id) {
      this.router.navigateByUrl('/theme-preview/' + (this.previewReturnId || this.id));
      return;
    }
    this.router.navigateByUrl('/tabs/themes');
  }
}
