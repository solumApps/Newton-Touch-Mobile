import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar, IonFooter, IonIcon, AlertController } from '@ionic/angular/standalone';
import { ColorPickerComponent } from '../shared/color-picker.component';
import { ContentPreviewStripComponent } from '../shared/content-preview-strip.component';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { ImagePickerService } from '../services/image-picker.service';
import { FONTS } from '../shared/fonts';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import type { ThemeTokens, HomeLayout, CardShape, CardContent, CardTextPos, CardOverlayStyle, OverlayShape, IntermediateStyle, ResultTemplate, TransitionType, AnimSpeed, LoaderStyle, LogoPosition, TextScale, TextFit, TextCase, HeaderStyle, CardSurface, NavStyle, NavButtonPosition, NavButtonMode, NavButtonSize, SaverOverlayPosition, ScrollMode, ScreensaverMode } from '@contract/layout';
import { MIN_COLUMNS, MAX_COLUMNS, columnsForLayout, coerceColumns, NAV_ICONS, navIconKind } from '@contract/layout';
import { ThemeCustomColorService } from '../services/theme-custom-color.service';
import {
  NtDeckChipsComponent, NtDeckChip,
  NtValuePillRowComponent, NtValuePill,
  NtEditorCardComponent,
  NtSettingsSheetComponent, NtSettingsGroup,
} from '../shared/ui';

type PreviewPage = 'home' | 'inter' | 'result' | 'saver';
interface Step { key: string; page: PreviewPage; }
/** One option inside an Editor Deck category (Colors / Type steps, phase 3a).
 *  `key` selects which existing control markup the editor-card level renders;
 *  `value`/`swatch` feed the value-pill and All-settings-sheet row faces. */
interface DeckOption { key: string; icon: string; label: string; value: string; swatch?: string; }

/** Visual theme wizard. Live preview re-renders the selected layout/card/intermediate/result
 *  + colours. Steps for intermediate are hidden when intermediate is skipped. */
@Component({
  selector: 'app-theme-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerComponent, ContentPreviewStripComponent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar, IonFooter, IonIcon,
    NtDeckChipsComponent, NtValuePillRowComponent, NtEditorCardComponent, NtSettingsSheetComponent],
  templateUrl: './theme-wizard.component.html',
  styleUrls: ['./theme-wizard.component.scss'],
})
export class ThemeWizardComponent implements OnInit, OnDestroy {
  readonly resultTransparentHeaderColor = 'transparent';
  @ViewChild('wizardSteps') wizardSteps?: ElementRef<HTMLElement>;
  @ViewChild(IonContent) content?: IonContent;
  name = '';
  id: string | null = null;
  openedFromPreview = false;
  previewReturnId: string | null = null;
  t: ThemeTokens = ThemeService.defaultTokens();
  saverMode: ScreensaverMode = 'slideshow';
  stepIndex = 0;
  /** Shown on the Review step when the chosen name collides with an existing theme. */
  nameError = '';
  private customColorSub?: Subscription;

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
    anim: 'Animations',
    saver: 'Screensaver',
    review: 'Review',
  };

  slots = [0, 1, 2, 3, 4, 5];
  labels = ['Bakery', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Drinks'];
  homeFinderSteps = ['Category 1', 'Category 2', 'Category 3', 'Category 4'];

  /** Grid/column variants collapse into ONE 'Columns' tile — the free column
   *  stepper picks the count (legacy layouts still map onto it when editing). */
  homeLayouts: HomeLayout[] = ['col-3', 'fullscreen', 'image-strip', 'promo-categories', 'bento', 'finder-select'];
  layoutLabels: Record<HomeLayout, string> = {
    'grid-2x3': 'Columns', 'grid-2x2': 'Columns', 'col-2': 'Columns', 'col-3': 'Columns', 'col-4': 'Columns',
    'hero-list': 'Hero + list', 'list': 'List rows', 'fullscreen': 'Fullscreen',
    'image-strip': 'Image strips', 'hero-start': 'Hero start', 'promo-categories': 'Promo categories',
    'h-scroll': 'Horizontal scroll', 'bento': 'Bento grid', 'finder-select': 'Finder select',
  };
  /** Independent card axes — any shape × any content × any text position. */
  cardShapes: { id: CardShape; label: string }[] = [
    { id: 'rect', label: 'Rectangle' }, { id: 'pill', label: 'Pill' }, { id: 'circle', label: 'Circle' }, { id: 'hexagon', label: 'Hexagon' },
  ];
  // 'color-block' and 'gradient' removed from the picker — both are now superseded.
  // Enum + CSS kept so older themes render.
  cardContents: { id: CardContent; label: string }[] = [
    { id: 'image-text', label: 'Image + Text' }, { id: 'image-only', label: 'Image only' }, { id: 'text-only', label: 'Text only' },
    { id: 'icon-text', label: 'Icon + Text' },
  ];
  /** Card-content options for the current layout. Image-based layouts (image-strip)
   *  only offer image content types so the configuration can't contradict itself. */
  get cardContentsFor(): { id: CardContent; label: string }[] {
    return this.t.homeLayout === 'image-strip'
      ? this.cardContents.filter((c) => c.id === 'image-text' || c.id === 'image-only')
      : this.cardContents;
  }
  cardTextPositions: { id: CardTextPos; label: string }[] = [
    { id: 'overlay-top', label: 'Inner Top' }, { id: 'overlay-bottom', label: 'Inner Bottom' }, { id: 'center', label: 'Center' }, { id: 'below', label: 'Below' },
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
  /** Intermediate text-overlay toggle is relevant only for image-text content
   *  positioned over the image (overlay-top / overlay-bottom / center). */
  get interOverlayRelevant(): boolean {
    return (this.t.intermediate.content || 'image-text') === 'image-text'
      && this.overlayPositions.includes(this.t.intermediate.textPos || 'overlay-bottom');
  }
  /** 'Below' only makes sense when there is an image to sit below — hidden for
   *  every text-style content, and for arrangements with no under-card area
   *  (image-strip, hero-start). Centralized so every QA scenario goes through
   *  one rule (B6, C2, C3, D3, E3). */
  private readonly noBelowContents: CardContent[] = ['text-only', 'icon-text', 'color-block', 'gradient'];
  private readonly noBelowLayouts: HomeLayout[] = ['image-strip', 'hero-start', 'bento'];
  private get homeBelowHidden(): boolean {
    return this.noBelowContents.includes(this.t.cardContent) || this.noBelowLayouts.includes(this.t.homeLayout);
  }
  get textPositionsFor(): { id: CardTextPos; label: string }[] {
    let list = this.homeBelowHidden ? this.cardTextPositions.filter((p) => p.id !== 'below' && p.id !== 'above') : this.cardTextPositions;
    if (this.t.cardShape === 'hexagon') {
      list = list.filter((p) => p.id !== 'above');
    }
    const isColumns = this.columnLayouts.includes(this.t.homeLayout);
    const isImageText = this.t.cardContent === 'image-text';
    const isPillOrCircle = this.t.cardShape === 'pill' || this.t.cardShape === 'circle';
    if (isColumns && isImageText && isPillOrCircle) {
      list = list.filter((p) => p.id !== 'above');
    }
    return list;
  }
  get interTextPositions(): { id: CardTextPos; label: string }[] {
    // Card-strip & fullscreen are full-bleed image cards — only the inner (overlay)
    // positions make sense; Top (above) / Below would push text off the card.
    const innerOnly = ['card-strip', 'fullscreen'].includes(this.t.intermediateStyle);
    const interContent = (this.t.intermediate.content || 'image-text');
    if (innerOnly || interContent === 'text-only' || interContent === 'icon-text') {
      return this.cardTextPositions.filter((p) => p.id !== 'below' && p.id !== 'above');
    }
    return this.cardTextPositions;
  }
  /** When the current selection is a now-hidden 'below', coerce it to 'center'
   *  (edit-time only — deployed themes keep rendering via CSS fallbacks). */
  private coerceTextPos(): void {
    if ((this.t.cardTextPos === 'below' || this.t.cardTextPos === 'above') && this.homeBelowHidden) this.t.cardTextPos = 'center';
    if (this.t.cardShape === 'hexagon' && this.t.cardTextPos === 'above') this.t.cardTextPos = 'center';
    
    const isColumns = this.columnLayouts.includes(this.t.homeLayout);
    const isImageText = this.t.cardContent === 'image-text';
    const isPillOrCircle = this.t.cardShape === 'pill' || this.t.cardShape === 'circle';
    if (isColumns && isImageText && isPillOrCircle && this.t.cardTextPos === 'above') {
      this.t.cardTextPos = 'center';
    }

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
    this.coerceTextPos();
    this.checkDefaultCardGap();
    this.clampCardGap();
  }
  pickContent(c: CardContent): void {
    this.t.cardContent = c;
    // image-only → no shape; leaving image-only restores a valid default shape.
    if (c === 'image-only') this.t.cardShape = 'none';
    else if (this.t.cardShape === 'none') this.t.cardShape = 'rect';
    this.coerceTextPos();
    // Auto-select a valid text vertical position when switching to text-only/icon-text
    if (c === 'text-only' || c === 'icon-text') {
      const opts = this.textPositionsFor;
      if (opts && opts.length) {
        const center = opts.find((p) => p.id === 'center');
        this.t.cardTextPos = center ? center.id : opts[0].id;
      }
    }
  }
  pickInterContent(c: CardContent): void {
    this.t.intermediate.content = c;
    // image-only → no shape; leaving image-only restores a valid shape.
    if (c === 'image-only') this.t.intermediate.cardShape = 'none';
    else if (this.t.intermediate.cardShape === 'none') this.t.intermediate.cardShape = 'rect';
    if (this.t.intermediateStyle === 'columns' && (c === 'text-only' || c === 'icon-text')) {
      this.t.intermediate.cardShape = 'rect';
    }
    // brand-rail text-only: default to centered vertical + horizontal text (#2).
    if (this.t.intermediateStyle === 'brand-rail' && c === 'text-only') {
      this.t.intermediate.textPos = 'center';
      this.t.intermediate.textAlign = 'center';
    }
    this.coerceTextPos();
    // Auto-select a valid intermediate text vertical position when switching to text-only/icon-text
    if (c === 'text-only' || c === 'icon-text') {
      const opts = this.interTextPositionsFor;
      if (opts && opts.length) {
        const center = opts.find((p) => p.id === 'center');
        this.t.intermediate.textPos = center ? center.id : opts[0].id;
      }
    }
  }
  pickInterStyle(s: IntermediateStyle): void {
    const wasFinderSelect = this.t.intermediateStyle === 'finder-select';
    this.t.intermediateStyle = s;
    if (s === 'columns') this.t.intermediate.align = 'center';
    if ((s as string) === 'side-rail') this.t.intermediate.align = 'left';
    if (s === 'columns' && (this.t.intermediate.content === 'text-only' || this.t.intermediate.content === 'icon-text')) {
      this.t.intermediate.cardShape = 'rect';
    }
    // Fullscreen is a one-card-at-a-time carousel; default to horizontal so the
    // Carousel-scrolling toggle reflects a real direction and switching to
    // vertical actually changes the scroll. Use the per-intermediate scroll field
    // (the renderers prefer it over the global one).
    if (s === 'fullscreen') this.setInterScroll('horizontal');
    // brand-rail is a horizontal single-row rail.
    if (s === 'brand-rail' || s === 'card-strip') this.setInterScroll('horizontal');
    // finder-select replaces the global header/nav with its own fs-top + fs-hero
    // bars, so the standard intermediate header is force-hidden (#5a).
    if (s === 'finder-select') {
      this.t.intermediate.showHeader = false;
    } else if (wasFinderSelect) {
      this.t.intermediate.showHeader = true;
    }
    // Default values inherit from home step respective values only if exists.
    if (this.t.intermediate.showHeader) {
      this.t.intermediate.headerStyle = this.t.intermediate.headerStyle || this.t.headerStyle;
      this.t.intermediate.headerLayout = this.t.intermediate.headerLayout || this.t.headerLayout;
      this.t.intermediate.logoPos = this.t.intermediate.logoPos || this.t.logoPos;
      this.t.intermediate.titlePos = this.t.intermediate.titlePos || this.t.titlePos;
      this.t.intermediate.captionPos = this.t.intermediate.captionPos || this.t.captionPos;
    }
    // #2/#5 full-bleed styles must use an inner text position; #4 ensure content set.
    if (s === 'fullscreen' || s === 'card-strip') {
      this.coerceInnerTextPos();
      // Card-strip / fullscreen only support image content — coerce anything
      // invalid (text-only / icon-text / undefined) to image-text so the UI is
      // never left on an unselectable option.
      if (!['image-text', 'image-only'].includes(this.t.intermediate.content || '')) {
        this.t.intermediate.content = 'image-text';
      }
    }
    this.clampIntItemSize();
  }

  /** Layouts where circle/hexagon shapes don't render well and are hidden.
   *  h-scroll DOES support all shapes (handled inside the rail), hero-list does NOT. */
  private readonly noShapeLayouts: HomeLayout[] = ['list', 'fullscreen', 'image-strip', 'hero-list', 'bento'];

  pickLayout(l: HomeLayout): void {
    const wasFinderSelect = this.t.homeLayout === 'finder-select';
    this.t.homeLayout = l;
    // #2 full-bleed fullscreen must use an inner text position.
    if (l === 'fullscreen') this.coerceHomeInnerTextPos();
    if (this.columnLayouts.includes(l)) {
      this.t.columns = columnsForLayout(l);
    } else {
      this.t.columns = undefined;
    }
    if (l === 'image-strip') this.t.columns = 4;
    if (l === 'bento') this.t.columns = 4;
    if (l === 'finder-select') this.t.showHeader = false;
    else if (wasFinderSelect) this.t.showHeader = true;
    // image-strip is image-based — coerce a non-image content to Image + Text.
    if (l === 'image-strip' && !['image-text', 'image-only'].includes(this.t.cardContent)) {
      this.pickContent('image-text');
    }
    // Reset layout-dependent settings so stale values from the previous layout
    // don't bleed into the new one (e.g. 'loose' gap on a tight layout).
    this.t.cardGap = 'normal';
    this.t.cardGapNum = undefined;
    this.t.cardAlign = l === 'promo-categories' ? 'left' : 'center';
    this.t.cardVAlign = 'middle';
    this.t.cardSize = 'normal';
    this.t.cardSizeScale = undefined;
    // Auto-reset circle/hexagon when switching to shape-incompatible layouts
    if (this.noShapeLayouts.includes(l) &&
        (this.t.cardShape === 'circle' || this.t.cardShape === 'hexagon')) {
      this.t.cardShape = 'rect';
    }
    if (l === 'image-strip') {
      this.t.scrollMode = 'horizontal';
    }
    // Auto-reset overflow scrolling if the new layout doesn't offer the current
    // mode (e.g. Column+Horizontal → Hero+List, which has no Horizontal option):
    // leaving a stale 'horizontal' applied the scroll-horizontal class to a
    // layout that can't lay out as a row and broke the preview/render.
    // Fall back to the *visible* modes so a hidden 'vertical' (hideVerticalScroll)
    // is never silently re-applied; default to 'horizontal' when none are visible.
    if (!this.scrollModesVisible.some((m) => m.id === this.t.scrollMode)) {
      this.t.scrollMode = this.scrollModesVisible.find((m) => m.id === 'horizontal')?.id
        || this.scrollModesVisible[0]?.id
        || 'horizontal';
    }
    this.coerceTextPos();
    this.checkDefaultCardGap();
    this.clampCardGap();
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
    if (this.columnLayouts.includes(this.t.homeLayout) && (shape === 'rect' || shape === 'pill')) return 5;
    if (shape === 'circle' || shape === 'hexagon') return 5;
    return MAX_COLUMNS;
  }
  /** Layouts whose column count can be freely overridden. */
  private readonly columnLayouts: HomeLayout[] = ['grid-2x3', 'grid-2x2', 'col-2', 'col-3', 'col-4'];
  get columnsMatter(): boolean { return this.columnLayouts.includes(this.t.homeLayout) || this.itemCountMatters; }
  get homeColumnsMin(): number { return this.itemCountMatters ? this.minColumns : 2; }
  /** The single 'Columns' tile is selected for every legacy grid/col id. */
  get isGridLike(): boolean { return this.columnLayouts.includes(this.t.homeLayout); }
  get isHeroStart(): boolean { return this.t.homeLayout === 'hero-start'; }
  /** Layouts with a free ITEM count (same stepper, different meaning). */
  get itemCountMatters(): boolean { return ['image-strip', 'bento', 'hero-list'].includes(this.t.homeLayout); }
  /** Overflow-scrolling control: hidden where it breaks the layout or is moot. */
  get scrollMatters(): boolean { return !['image-strip', 'hero-start', 'bento', 'fullscreen', 'promo-categories', 'finder-select'].includes(this.t.homeLayout); }
  /** Card gap: hidden where spacing is owned by a custom layout. */
  get gapMatters(): boolean { return !['image-strip', 'finder-select'].includes(this.t.homeLayout); }
  get scrollModesFor(): { id: ScrollMode; label: string }[] {
    if (this.t.homeLayout === 'hero-list') {
      return this.scrollModes.filter(m => m.id !== 'horizontal');
    }
    if (this.t.homeLayout === 'image-strip') {
      return this.scrollModes.filter(m => m.id !== 'vertical');
    }
    return this.scrollModes;
  }
  /** HIDDEN (not deleted): vertical overflow scrolling on Home + Intermediate caused
   *  layout issues, so the option is hidden for now. Flip to false to re-enable it. */
  readonly hideVerticalScroll = true;
  /** Home overflow options shown in the UI (vertical hidden while hideVerticalScroll). */
  get scrollModesVisible(): { id: ScrollMode; label: string }[] {
    return this.hideVerticalScroll ? this.scrollModesFor.filter((m) => m.id !== 'vertical') : this.scrollModesFor;
  }
  /** Intermediate content options (image layouts only). */
  interContents: { id: CardContent; label: string }[] = [
    { id: 'image-text', label: 'Image + Text' }, { id: 'image-only', label: 'Image only' }, { id: 'text-only', label: 'Text only' },
    { id: 'icon-text', label: 'Icon + Text' },
  ];
  /** Result page card content is limited to image/text (its own narrower type). */
  resultContents: { id: 'image-text' | 'text-only'; label: string }[] = [
    { id: 'image-text', label: 'Image + Text' }, { id: 'text-only', label: 'Text only' },
  ];
  /** Card-strip & fullscreen are full-bleed image cards → image content only. */
  get interContentsFor(): { id: CardContent; label: string }[] {
    return (this.t.intermediateStyle === 'card-strip' || this.t.intermediateStyle === 'fullscreen')
      ? this.interContents.filter((c) => c.id === 'image-text' || c.id === 'image-only')
      : this.interContents;
  }
  /** Shape options: prepend 'None' when content is image-only (mirrors Home). */
  get interShapesFor(): { id: CardShape; label: string }[] {
    return (this.t.intermediate.content === 'image-only') ? [{ id: 'none', label: 'None' }, ...this.cardShapes] : this.cardShapes;
  }
  /** Card / text alignment. Columns expose card alignment when vertical because
   *  the grid has usable free space; horizontal scroll keeps its safe start flow. */
  get intAlignMatters(): boolean {
    return (['brand-grid'] as string[]).includes(this.t.intermediateStyle)
      || (this.t.intermediateStyle === 'columns' && this.isInterVerticalScroll);
  }
  /** Text vertical position applies to image card styles. For brand-rail it's
   *  shown ONLY for text-only content (image/icon cards hide it — #2). */
  get intTextPosMatters(): boolean {
    if (this.t.intermediateStyle === 'brand-rail') return (this.t.intermediate.content || 'image-text') === 'text-only';
    return ['columns', 'card-strip', 'circular', 'hex-grid', 'fullscreen'].includes(this.t.intermediateStyle);
  }
  /** Vertical-position options: brand-rail text-only uses Top/Center/Bottom (#2). */
  get interTextPositionsFor(): { id: CardTextPos; label: string }[] {
    if (this.t.intermediateStyle === 'brand-rail' && (this.t.intermediate.content || 'image-text') === 'text-only') {
      return [{ id: 'overlay-top', label: 'Top' }, { id: 'center', label: 'Center' }, { id: 'overlay-bottom', label: 'Bottom' }];
    }
    return this.interTextPositions;
  }
  get isImageStrip(): boolean { return this.t.homeLayout === 'image-strip'; }
  /** Card size: hidden only for fixed strip layouts. Fullscreen uses the slider
   *  to scale the active slide within the page, matching intermediate controls. */
  get sizeMatters(): boolean { return this.t.homeLayout !== 'image-strip'; }
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
  /** Result: custom full-page templates own their product/detail presentation. */
  get resCardContentMatters(): boolean {
    return !['promo-map-rank', 'finder-detail'].includes(this.t.resultTemplate);
  }
  /** Result: custom templates have fixed internal panels, not global list scrolling. */
  get resOverflowMatters(): boolean {
    return !['drill-stair', 'promo-list', 'product-focus', 'hero-product', 'promo-map-rank', 'finder-detail'].includes(this.t.resultTemplate);
  }
  /** Result: card shape applies to templates with product cards/thumbnails. */
  get resShapeMatters(): boolean {
    return ['map-list', 'cards-map', 'list-only', 'map-full', 'card-grid', 'catalog-grid', 'drill-filter', 'filter-list', 'map-filter-list', 'promo-list', 'shelf'].includes(this.t.resultTemplate);
  }
  /** Row templates only change the small thumbnail — rect/pill are no-ops there. */
  get resShapesFor(): { id: CardShape; label: string }[] {
    const thumbOnly = ['map-list', 'list-only', 'drill-filter', 'filter-list', 'map-filter-list', 'promo-list'].includes(this.t.resultTemplate);
    if (thumbOnly) return this.cardShapes.filter((s) => s.id === 'circle' || s.id === 'hexagon');
    if (this.t.resultTemplate === 'card-grid') return this.cardShapes.filter((s) => s.id !== 'circle' && s.id !== 'hexagon');
    return this.cardShapes;
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
    const min = this.homeColumnsMin;
    const next = Math.min(this.maxColumns, Math.max(min, this.effectiveColumns + delta));
    this.t.columns = next;
    // Clamp card size if new column count reduces headroom.
    if (typeof this.t.cardSizeScale === 'number' && this.t.cardSizeScale > this.cardSizeMax) {
      this.setCardSize(this.cardSizeMax);
    }
    this.checkDefaultCardGap();
    this.clampCardGap();
  }
  setColumns(v: string): void {
    const next = coerceColumns(v);
    const min = this.homeColumnsMin;
    this.t.columns = next == null ? next : Math.min(this.maxColumns, Math.max(min, next));
    this.checkDefaultCardGap();
    this.clampCardGap();
  }

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
  private textZoneValue(key: 'cardTextScaleNum' | 'headerTextScaleNum' | 'promoCopyTextScaleNum' | 'promoCardTextScaleNum' | 'intermediateTextScaleNum' | 'resultTextScaleNum', fallback = 1): number {
    const n = this.t.typography[key];
    return typeof n === 'number' ? n : fallback;
  }
  private setTextZone(key: 'cardTextScaleNum' | 'headerTextScaleNum' | 'promoCopyTextScaleNum' | 'promoCardTextScaleNum' | 'intermediateTextScaleNum' | 'resultTextScaleNum', v: string | number): void {
    this.t.typography[key] = Math.min(2.0, Math.max(0.6, Number(v)));
  }
  get cardTextScaleValue(): number { return this.textZoneValue('cardTextScaleNum', this.t.typography.cardTextScale ? (this.t.typography.cardTextScale === 'compact' ? 0.8 : this.t.typography.cardTextScale === 'large' ? 1.25 : 1) : 1); }
  setCardTextScale(v: string | number): void { this.setTextZone('cardTextScaleNum', v); }
  get headerTextScaleValue(): number { return this.textZoneValue('headerTextScaleNum', this.t.typography.headerTextScale ? (this.t.typography.headerTextScale === 'compact' ? 0.8 : this.t.typography.headerTextScale === 'large' ? 1.25 : 1) : 1); }
  setHeaderTextScale(v: string | number): void { this.setTextZone('headerTextScaleNum', v); }
  get promoCopyTextScaleValue(): number { return this.textZoneValue('promoCopyTextScaleNum'); }
  setPromoCopyTextScale(v: string | number): void { this.setTextZone('promoCopyTextScaleNum', v); }
  get promoCardTextScaleValue(): number { return this.textZoneValue('promoCardTextScaleNum', this.cardTextScaleValue); }
  setPromoCardTextScale(v: string | number): void { this.setTextZone('promoCardTextScaleNum', v); }
  get intermediateTextScaleValue(): number { return this.textZoneValue('intermediateTextScaleNum', this.cardTextScaleValue); }
  setIntermediateTextScale(v: string | number): void { this.setTextZone('intermediateTextScaleNum', v); }
  get resultTextScaleValue(): number { return this.textZoneValue('resultTextScaleNum'); }
  setResultTextScale(v: string | number): void { this.setTextZone('resultTextScaleNum', v); }
  get showCardTextScaleControl(): boolean {
    if (this.previewPage !== 'home') return false;
    if (this.t.homeLayout === 'promo-categories') return false;
    if (this.t.cardContent === 'image-only') return false;
    return !['fullscreen', 'hero-start'].includes(this.t.homeLayout);
  }
  get showPromoTypographyControls(): boolean {
    return this.previewPage === 'home' && this.t.homeLayout === 'promo-categories';
  }
  get showIntermediateTextScaleControl(): boolean {
    return this.previewPage === 'inter' && this.t.includeIntermediate;
  }
  get showResultTextScaleControl(): boolean {
    return this.previewPage === 'result';
  }
  get showHeaderTextScaleControl(): boolean {
    return this.headerVisibleFor(this.previewPage);
  }
  get showCardTextCaseControl(): boolean {
    return this.showCardTextScaleControl || this.showPromoTypographyControls;
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
    const maxVal = Math.max(0.9, 1.25 - (cols - 3) * 0.06 - gap * 0.005);
    return Math.min(1.1, maxVal);
  }
  setCardSize(v: string | number): void {
    const n = Math.min(this.cardSizeMax, Math.max(0.8, Number(v)));
    this.t.cardSizeScale = n;
    this.t.cardSize = n <= 0.85 ? 'xs' : n < 0.97 ? 'small' : n > 1.1 ? 'large' : 'normal';
  }

  get cardGapMax(): number {
    const isColumns = this.columnLayouts.includes(this.t.homeLayout);
    const isHorizontal = this.effectiveScrollMode === 'horizontal';
    const isShape = this.t.cardShape === 'circle' || this.t.cardShape === 'hexagon';
    const isRectOrPill = this.t.cardShape === 'rect' || this.t.cardShape === 'pill';
    const isColsLess4 = this.effectiveColumns < 4;
    const isColsOne = this.effectiveColumns === 1;

    if (isColumns && isHorizontal) {
      if (isShape && isColsLess4) {
        return 165;
      }
      if (isRectOrPill && isColsOne) {
        return 150;
      }
    }
    return 20;
  }

  checkDefaultCardGap(): void {
    const isColumns = this.columnLayouts.includes(this.t.homeLayout);
    const isHorizontal = this.effectiveScrollMode === 'horizontal';
    const isRectOrPill = this.t.cardShape === 'rect' || this.t.cardShape === 'pill';
    const isColsOne = this.effectiveColumns === 1;

    if (isColumns && isHorizontal && isRectOrPill && isColsOne) {
      this.setCardGap(100);
    }
  }

  clampCardGap(): void {
    const maxGap = this.cardGapMax;
    if (typeof this.t.cardGapNum === 'number' && this.t.cardGapNum > maxGap) {
      this.setCardGap(maxGap);
    }
  }

  /** Fine-grained card gap (slider). Seeds from the legacy bucket. */
  get cardGapValue(): number {
    const n = this.t.cardGapNum;
    if (typeof n === 'number') return Math.min(this.cardGapMax, n);
    const g = this.t.cardGap || 'normal';
    return g === 'tight' ? 2 : g === 'loose' ? 10 : 5;
  }
  setCardGap(v: string | number): void {
    const n = Math.min(this.cardGapMax, Math.max(0, Number(v)));
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
  get intItemSizeMax(): number {
    const shape = this.t.intermediate.cardShape;
    return this.t.intermediateStyle === 'columns' && (shape === 'circle' || shape === 'hexagon') ? 1 : 1.3;
  }
  get intItemSizeValue(): number {
    const n = this.t.intermediate.itemSizeScale;
    if (typeof n === 'number') return Math.min(this.intItemSizeMax, n);
    const s = this.t.intermediate.itemSize || 'medium';
    return Math.min(this.intItemSizeMax, s === 'small' ? 0.86 : s === 'large' ? 1.15 : 1);
  }
  setIntItemSize(v: string | number): void {
    const n = Math.min(this.intItemSizeMax, Math.max(0.7, Number(v)));
    this.t.intermediate.itemSizeScale = n;
    this.t.intermediate.itemSize = n < 0.93 ? 'small' : n > 1.07 ? 'large' : 'medium';
  }
  private clampIntItemSize(): void {
    if (typeof this.t.intermediate.itemSizeScale === 'number' && this.t.intermediate.itemSizeScale > this.intItemSizeMax) {
      this.setIntItemSize(this.intItemSizeMax);
    }
  }

  /** Independent horizontal card-text alignment (C-3). */
  cardAligns: { id: 'left' | 'center' | 'right'; label: string }[] = [
    { id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }, { id: 'right', label: 'Right' },
  ];

  /** Map-Filter-List filter section position (G-2). */
  filterPositions: { id: 'center' | 'top' | 'bottom' | 'left' | 'right'; label: string }[] = [
    { id: 'center', label: 'Center' }, { id: 'top', label: 'Top' }, { id: 'bottom', label: 'Bottom' }, { id: 'left', label: 'Left' }, { id: 'right', label: 'Right' },
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
  intStyles: IntermediateStyle[] = ['columns', 'card-strip', 'fullscreen', 'brand-rail', 'finder-select'];
  intStyleLabels: Partial<Record<IntermediateStyle, string>> = {
    'columns': 'Columns', 'hex-grid': 'Hex grid', 'circular': 'Circular',
    'card-strip': 'Card strip',
    'brand-rail': 'Brand rail', 'drill-stair': 'Drill stair',
    'finder-select': 'Finder select',
  };
  intStyleLabel(s: IntermediateStyle): string { return this.intStyleLabels[s] || s; }
  /** finder-select: shared left/center/right position options for back + prompt. */
  fsPositions: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
  /** finder-select fs-card vertical text positions (#5). */
  fsTextVPositions: { id: CardTextPos; label: string }[] = [
    { id: 'overlay-top', label: 'Top' }, { id: 'center', label: 'Center' }, { id: 'overlay-bottom', label: 'Bottom' },
  ];
  get finderTextPositionMatters(): boolean {
    const shape = this.t.intermediate.fsCardShape || 'rect';
    return shape !== 'circle' && shape !== 'hexagon';
  }
  get finderTextAlignMatters(): boolean {
    const shape = this.t.intermediate.fsCardShape || 'rect';
    return shape !== 'circle' && shape !== 'hexagon';
  }
  get fsTextPosClass(): CardTextPos {
    return this.finderTextPositionMatters
      ? (this.t.intermediate.fsTextPos || 'center')
      : 'below';
  }
  get fsTextAlignClass(): 'left' | 'center' | 'right' {
    return this.finderTextAlignMatters ? (this.t.intermediate.fsTextAlign || 'center') : 'center';
  }
  /** finder-select fs-card content options (#5). */
  fsCardContents: { id: CardContent; label: string }[] = [
    { id: 'image-text', label: 'Image + text' }, { id: 'image-only', label: 'Image only' },
    { id: 'icon-text', label: 'Icon + text' }, { id: 'text-only', label: 'Text only' },
  ];
  /** Pick fs-card content; image-only clears shape, leaving it restores 'rect' (#5). */
  pickFsContent(c: CardContent): void {
    this.t.intermediate.fsCardContent = c;
    if (c === 'image-only') this.t.intermediate.fsCardShape = 'none';
    else if (this.t.intermediate.fsCardShape === 'none') this.t.intermediate.fsCardShape = 'rect';
    this.coerceFsTextAlign();
  }
  setFsCardShape(s: CardShape): void {
    this.t.intermediate.fsCardShape = s;
    this.coerceFsTextAlign();
  }
  private coerceFsTextAlign(): void {
    const shape = this.t.intermediate.fsCardShape || 'rect';
    if (shape === 'circle' || shape === 'hexagon') this.t.intermediate.fsTextAlign = 'center';
  }
  /** Card shape only affects intermediate styles that show a per-item image. */
  get intShapeMatters(): boolean {
    // card-strip is a full-bleed image strip — no per-card shape control.
    return ['columns', 'brand-rail'].includes(this.t.intermediateStyle);
  }
  /** finder-select index-strip modes + step-label CSV binding. */
  indexModes = ['auto', 'alpha', 'values', 'off'];
  get intStepsCsv(): string { return (this.t.intermediate.stepLabels || []).join(','); }
  set intStepsCsv(v: string) { this.t.intermediate.stepLabels = v.split(',').map((s) => s.trim()).filter(Boolean); }
  /** Column / item count input — for 'columns' (grid) AND 'card-strip' (visible count). */
  get intColumnsMatters(): boolean { return this.t.intermediateStyle === 'columns' || this.t.intermediateStyle === 'card-strip'; }
  get intColumnsMin(): number { return this.t.intermediateStyle === 'columns' ? 2 : 1; }
  get intColumnsValue(): number {
    return Math.max(this.intColumnsMin, Math.min(this.maxVisibleCards, this.t.intermediate.columns || 3));
  }
  /** #6 Dynamic max "visible cards": intermediate columns cap at 5 for every shape. */
  get maxVisibleCards(): number {
    const sh = this.t.intermediate.cardShape;
    if (this.t.intermediateStyle === 'columns') return 5;
    return (sh === 'circle' || sh === 'hexagon') ? 5 : 8;
  }
  /** Stepper used like Home: +/- buttons. */
  stepIntColumns(delta: number): void { this.setIntColumns(this.intColumnsValue + delta); }
  setIntColumns(n: number): void { this.t.intermediate.columns = Math.max(this.intColumnsMin, Math.min(this.maxVisibleCards, Math.round(n))); }
  private clampIntColumns(): void {
    const current = this.t.intermediate.columns || 3;
    if (current > this.maxVisibleCards || current < this.intColumnsMin) this.setIntColumns(current);
  }
  /** Cap visible cards if a shape change lowered the dynamic max. */
  setInterShape(s: CardShape): void {
    this.t.intermediate.cardShape = s;
    this.clampIntColumns();
    this.clampIntItemSize();
    if (!this.interTextAlignMatters) this.t.intermediate.textAlign = 'center'; // #7 pill forces center
  }
  /** Overflow scrolling matters for the columns grid + brand grid/rail. */
  get intScrollMatters(): boolean { return ['columns', 'brand-rail', 'card-strip'].includes(this.t.intermediateStyle); }
  /** #7 Text horizontal alignment is hidden for brand-rail pill (image/icon text)
   *  because left/right text distorts the pill — value forced to center. */
  get interTextAlignMatters(): boolean {
    const c = this.t.intermediate.content || 'image-text';
    // finder-select has its own fs-card horizontal-align control — the generic
    // one must NOT also appear (avoids the duplicate Text H-align section).
    if (this.t.intermediateStyle === 'finder-select') return false;
    // brand-rail: only text-only cards expose horizontal alignment.
    if (this.t.intermediateStyle === 'brand-rail') return c === 'text-only';
    return c !== 'image-only';
  }
  /** brand-rail is a single horizontal row — only horizontal scroll allowed. */
  get intScrollHorizontalOnly(): boolean { return this.t.intermediateStyle === 'brand-rail' || this.t.intermediateStyle === 'card-strip'; }
  /** #4 Card content applies to image-showing styles incl. card-strip + fullscreen. */
  get intContentMatters(): boolean { return this.intShapeMatters || this.t.intermediateStyle === 'card-strip' || this.t.intermediateStyle === 'fullscreen'; }

  /** Effective intermediate card content for color-step visibility rules.
   *  finder-select uses its own fs-card content selector. */
  get interColorContent(): CardContent {
    return this.t.intermediateStyle === 'finder-select'
      ? (this.t.intermediate.fsCardContent || 'text-only')
      : (this.t.intermediate.content || 'image-text');
  }
  /** Hide row/card background for image-based cards on Intermediate colors step. */
  get showInterCardBackgroundColor(): boolean {
    return this.interColorContent !== 'image-only' && this.interColorContent !== 'image-text';
  }
  /** Hide card text color only when cards are image-only. */
  get showInterCardTextColor(): boolean {
    return this.interColorContent !== 'image-only';
  }

  /** #1 Scroll-direction helpers (Home uses global scrollMode; Intermediate its own). */
  private readonly innerTextPositions: CardTextPos[] = ['overlay-top', 'overlay-bottom', 'center'];
  get effectiveScrollMode(): ScrollMode {
    const m = this.t.scrollMode || 'auto';
    if (m === 'auto') {
      return 'horizontal';
    }
    return m;
  }
  get isHomeVerticalScroll(): boolean { return this.effectiveScrollMode === 'vertical'; }
  get isHomeHorizontalScroll(): boolean { return this.effectiveScrollMode === 'horizontal' || this.t.homeLayout === 'h-scroll'; }
  get isInterVerticalScroll(): boolean { return (this.t.intermediate.scrollMode || this.t.scrollMode) === 'vertical'; }
  get isInterHorizontalScroll(): boolean { return (this.t.intermediate.scrollMode || this.t.scrollMode) === 'horizontal' || this.t.intermediateStyle === 'brand-rail' || this.t.intermediateStyle === 'card-strip'; }
  get effectiveInterScrollMode(): 'vertical' | 'horizontal' {
    if (this.t.intermediateStyle === 'brand-rail' || this.t.intermediateStyle === 'card-strip') return 'horizontal';
    return (this.t.intermediate.scrollMode || this.t.scrollMode) === 'horizontal' ? 'horizontal' : 'vertical';
  }
  get effectiveResultScrollMode(): 'vertical' | 'horizontal' {
    return this.t.result.scrollMode === 'horizontal' ? 'horizontal' : 'vertical';
  }
  /** Set Home scroll + coerce alignment to a safe, non-clipping default. */
  setHomeScroll(m: ScrollMode): void {
    this.t.scrollMode = m;
    if (m === 'vertical') { this.t.cardVAlign = 'top'; this.t.cardAlign = 'left'; }
    else if (m === 'horizontal') { this.t.cardAlign = 'left'; this.t.cardVAlign = 'middle'; }
    this.checkDefaultCardGap();
    this.clampCardGap();
  }
  /** Set Intermediate scroll + coerce alignment to a safe, non-clipping default. */
  setInterScroll(m: ScrollMode): void {
    this.t.intermediate.scrollMode = m;
    if (this.t.intermediateStyle === 'columns') {
      this.t.intermediate.align = 'center';
      this.t.intermediate.valign = m === 'vertical' ? 'top' : 'middle';
      this.clampIntColumns();
      this.clampIntItemSize();
      return;
    }
    if (m === 'vertical') { this.t.intermediate.valign = 'top'; this.t.intermediate.align = 'left'; }
    else if (m === 'horizontal') { this.t.intermediate.align = 'left'; this.t.intermediate.valign = 'middle'; }
  }
  /** #2/#5 Coerce text position to an inner position for full-bleed styles. */
  private coerceInnerTextPos(): void {
    if (!this.innerTextPositions.includes(this.t.intermediate.textPos || 'overlay-bottom')) this.t.intermediate.textPos = 'overlay-bottom';
  }
  private coerceHomeInnerTextPos(): void {
    if (!this.innerTextPositions.includes(this.t.cardTextPos)) this.t.cardTextPos = 'overlay-bottom';
  }
  /** Selectable templates — split-panel / esl-focus (map-width variants of
   *  map-list) and dual-list (2-col list-only) are hidden as near-duplicates;
   *  old themes using them still render (enum + CSS retained). */
  // Ordered by real-world usage: Map-List + Drill-Stair (+ Map-Filter-List) lead.
  // 'cards-map' dropped from the picker (near-duplicate of Map-List); enum + CSS
  // kept so existing themes using it still render. Lower-priority layouts remain
  // available rather than deleted — removal of specific ones is a product call.
  resultTemplates: ResultTemplate[] = ['map-list', 'filter-list', 'promo-list', 'product-focus', 'shelf', 'finder-detail'];
  /** Friendly labels for the result-template tiles. */
  private tplLabels: Record<string, string> = {
    'map-list': 'Map List', 'drill-filter': 'Drill Filter', 'map-filter-list': 'Map + Filter',
    'filter-list': 'Filter List', 'card-grid': 'Card Grid', 'promo-list': 'Promo List',
    'product-focus': 'Product Focus', 'hero-product': 'Hero Product', 'shelf': 'Shelf',
    'promo-map-rank': 'Promo Map + Ranks', 'finder-detail': 'Finder Select',
  };
  tplLabel(o: string): string { return this.tplLabels[o] || o; }
  pickResultTemplate(o: ResultTemplate): void {
    const changed = this.t.resultTemplate !== o;
    this.t.resultTemplate = o;
    if (!changed) return;
    if (o === 'card-grid' && (this.t.result.cardShape === 'circle' || this.t.result.cardShape === 'hexagon')) {
      this.t.result.cardShape = undefined;
    }
    if (o === 'promo-map-rank') this.applyPromoMapRankDefaults();
    else if (o === 'finder-detail') this.applyFinderDetailDefaults();
    else this.applyMapListDefaults();
    if (o === 'map-filter-list') this.t.result.filterPos = 'center';
  }
  private applyMapListDefaults(): void {
    Object.assign(this.t.result, {
      headerColor: 'transparent',
      background: '#1a0036',
      cardBackground: 'RGBA(255,255,255,0.15)',
      accent: '#ffcd00',
      popularText: '#ffffff',
      pathColor: '#ffcd00',
      cardText: '#ffffff',
    });
  }
  private applyPromoMapRankDefaults(): void {
    Object.assign(this.t.result, {
      cardBackground: '#ffffff',
      cardText: '#0f172a',
      panelColor: '#001973',
      railBg: 'transparent',
      subPanelColor: '#001973',
      secondaryTextColor: '#ffffff',
      mapBg: '#ffffff',
    });
  }
  private applyFinderDetailDefaults(): void {
    Object.assign(this.t.result, {
      background: '#1a0036',
      cardText: '#0F172A',
      accent: '#ffffff',
      findColor: '#2f006d',
      listBg: '#ffffff',
      cardBg: '#ffffff',
      cardTextColor: '#0F172A',
    });
  }

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
  valigns: { id: 'top' | 'middle' | 'bottom'; label: string }[] = [
    { id: 'top', label: 'Top' }, { id: 'middle', label: 'Middle' }, { id: 'bottom', label: 'Bottom' },
  ];
  brandRailValigns: { id: 'top' | 'center' | 'bottom'; label: string }[] = [
    { id: 'top', label: 'Top' }, { id: 'center', label: 'Center' }, { id: 'bottom', label: 'Bottom' },
  ];
  gaps: { id: 'tight' | 'normal' | 'loose'; label: string }[] = [
    { id: 'tight', label: 'Tight' }, { id: 'normal', label: 'Normal' }, { id: 'loose', label: 'Loose' },
  ];
  /** Alignment only changes layouts that don't already fill the row. */
  get alignMatters(): boolean {
    const isColumns = this.columnLayouts.includes(this.t.homeLayout);
    const isHorizontal = this.effectiveScrollMode === 'horizontal';
    if (isColumns && isHorizontal) {
      return false;
    }
    return ['h-scroll', 'promo-categories', 'col-2', 'col-3', 'col-4', 'hero-list'].includes(this.t.homeLayout) || this.shapeCard || (isColumns && this.effectiveColumns === 1);
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

  private navScope(page: 'intermediate' | 'result') {
    const nav = this.t.nav || {};
    const target = page === 'intermediate' ? this.t.intermediate : this.t.result;
    const split = target.navSplit ?? nav.split ?? false;
    const position = target.navPosition || nav.position || 'bottom-left';
    const backPosition = target.navBackPosition || nav.backPosition || 'bottom-left';
    const homePosition = target.navHomePosition || nav.homePosition || 'bottom-right';
    return { split, position, backPosition, homePosition };
  }

  navSplitFor(page: 'intermediate' | 'result'): boolean {
    return this.navScope(page).split;
  }

  navPositionFor(page: 'intermediate' | 'result'): NavButtonPosition {
    return this.navScope(page).position;
  }

  navBackPositionFor(page: 'intermediate' | 'result'): NavButtonPosition {
    return this.navScope(page).backPosition;
  }

  navHomePositionFor(page: 'intermediate' | 'result'): NavButtonPosition {
    return this.navScope(page).homePosition;
  }

  setNavSplit(page: 'intermediate' | 'result', split: boolean): void {
    if (page === 'intermediate') this.t.intermediate.navSplit = split;
    else this.t.result.navSplit = split;
  }

  setNavPosition(page: 'intermediate' | 'result', pos: NavButtonPosition): void {
    if (page === 'intermediate') this.t.intermediate.navPosition = pos;
    else this.t.result.navPosition = pos;
  }

  setNavBackPosition(page: 'intermediate' | 'result', pos: NavButtonPosition): void {
    if (page === 'intermediate') this.t.intermediate.navBackPosition = pos;
    else this.t.result.navBackPosition = pos;
  }

  setNavHomePosition(page: 'intermediate' | 'result', pos: NavButtonPosition): void {
    if (page === 'intermediate') this.t.intermediate.navHomePosition = pos;
    else this.t.result.navHomePosition = pos;
  }

  navPositionsFor(page: 'intermediate' | 'result', side: 'back' | 'home'): { id: NavButtonPosition; label: string }[] {
    const scope = this.navScope(page);
    if (!scope.split) return this.navButtonPositions;

    const blocked = side === 'back' ? scope.homePosition : scope.backPosition;
    const current = side === 'back' ? scope.backPosition : scope.homePosition;
    if (blocked === 'hidden') return this.navButtonPositions;

    return this.navButtonPositions.filter((p) => p.id === current || p.id !== blocked);
  }

  saverPositions: { id: SaverOverlayPosition; label: string }[] = [
    { id: 'center',       label: 'Center' },
    { id: 'bottom',       label: 'Bottom' },
    { id: 'top',          label: 'Top' },
    { id: 'bottom-left',  label: 'Bottom left' },
    { id: 'bottom-right', label: 'Bottom right' },
  ];
  sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  saverModes: ScreensaverMode[] = ['slideshow', 'single-image', 'video'];

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
  intCardPresets = ['rgba(255,255,255,0.12)', '#EEF3F8', '#E2E8F0', '#CBD5E1', '#1E293B', ...this.gradientPresets];
  heroPanelPresets = ['#172033', '#0F172A', '#1D3A66', '#123B3F', '#3B2F12', '#23262B'];
  textPresets = ['#FFFFFF', '#0F172A', '#FFCD00'];
  overlayPresets = ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', 'rgba(255,255,255,0.6)', 'rgba(47,0,109,0.7)'];
  /** Text-overlay scrim styles (Home + Intermediate). 'None' doubles as the
   *  overlay-off state — the old separate On/Off toggle folds into this. */
  overlayStyles: { id: CardOverlayStyle; label: string }[] = [
    { id: 'gradient', label: 'Gradient' }, { id: 'solid', label: 'Solid' }, { id: 'tint', label: 'Tint' }, { id: 'none', label: 'None' },
  ];

  /** True when the current Home combo actually renders a GRADIENT band (verified
   *  against the LCD renderer): image-text overlay-top/bottom on a RECT card with
   *  the footer-bar overlay geometry, in any arrangement except promo-categories.
   *  Everywhere else the scrim is flat — indistinguishable from Solid — so the
   *  Gradient tile is hidden and a saved 'gradient' highlights as Solid. */
  get homeGradientApplies(): boolean {
    return this.t.cardContent === 'image-text'
      && (this.t.cardTextPos === 'overlay-bottom' || this.t.cardTextPos === 'overlay-top')
      && this.t.homeLayout !== 'promo-categories'
      && this.t.cardShape === 'rect'
      && this.cardOverlayShapeEff === 'bar';
  }
  get homeOverlayStyles(): { id: CardOverlayStyle; label: string }[] {
    return this.homeGradientApplies ? this.overlayStyles : this.overlayStyles.filter((s) => s.id !== 'gradient');
  }

  /** Intermediate gradient band exists only in Columns · rect · overlay-top/bottom
   *  with the default bar geometry (verified on the LCD renderer). */
  get interGradientApplies(): boolean {
    const pos = this.t.intermediate.textPos || 'overlay-bottom';
    return this.t.intermediateStyle === 'columns'
      && (this.t.intermediate.cardShape || 'rect') === 'rect'
      && (pos === 'overlay-bottom' || pos === 'overlay-top')
      && this.interOverlayShapeEff !== 'pill';
  }
  get interOverlayStyles(): { id: CardOverlayStyle; label: string }[] {
    return this.interGradientApplies ? this.overlayStyles : this.overlayStyles.filter((s) => s.id !== 'gradient');
  }

  /** Effective Home overlay style: 'none' when the overlay is off, else the
   *  chosen scrim style (default 'gradient'; a gradient that cannot render in
   *  the current combo highlights as Solid — that IS what renders). */
  get cardOverlayEff(): CardOverlayStyle {
    if (this.t.cardTextOverlay === false) return 'none';
    const s = this.t.cardOverlayStyle || 'gradient';
    return s === 'gradient' && !this.homeGradientApplies ? 'solid' : s;
  }
  /** Pick a Home overlay style; 'none' turns the overlay off. Keeps
   *  cardTextOverlay + cardOverlayStyle in sync so both the .no-overlay and
   *  .ovl-none consumers render identically. */
  setCardOverlay(id: CardOverlayStyle): void {
    this.t.cardOverlayStyle = id;
    this.t.cardTextOverlay = id !== 'none';
  }
  /** Effective Intermediate overlay style (mirrors cardOverlayEff). */
  get interOverlayEff(): CardOverlayStyle {
    if (this.t.intermediate.textOverlay === false) return 'none';
    const s = this.t.intermediate.overlayStyle || 'gradient';
    return s === 'gradient' && !this.interGradientApplies ? 'solid' : s;
  }
  setInterOverlay(id: CardOverlayStyle): void {
    this.t.intermediate.overlayStyle = id;
    this.t.intermediate.textOverlay = id !== 'none';
  }

  /** Overlay label geometry (Home + Intermediate): footer bar vs floating pill. */
  overlayShapes: { id: OverlayShape; label: string }[] = [
    { id: 'pill', label: 'Floating pill' }, { id: 'bar', label: 'Footer bar' },
  ];
  /** Effective Home overlay geometry. Unset falls back to the legacy per-shape
   *  look so the picker highlights what actually renders (rect = bar, shapes = pill). */
  get cardOverlayShapeEff(): OverlayShape { return this.t.cardOverlayShape || (this.t.cardShape === 'rect' ? 'bar' : 'pill'); }
  setCardOverlayShape(id: OverlayShape): void { this.t.cardOverlayShape = id; }
  get interOverlayShapeEff(): OverlayShape { return this.t.intermediate.overlayShape || 'bar'; }
  setInterOverlayShape(id: OverlayShape): void { this.t.intermediate.overlayShape = id; }

  /** Overlay scrim strength (0–100%). Reads/writes the alpha channel of
   *  overlayColor so it flows through the existing --nt-overlay/--prev-overlay
   *  vars with no contract or CSS changes (works on-device unchanged). */
  get overlayOpacity(): number {
    return Math.round(this.parseRgba(this.t.overlayColor || 'rgba(0,0,0,0.6)').a * 100);
  }
  setOverlayOpacity(pct: number): void {
    const a = Math.max(0, Math.min(100, Math.round(pct))) / 100;
    const { r, g, b } = this.parseRgba(this.t.overlayColor || 'rgba(0,0,0,0.6)');
    this.t.overlayColor = `rgba(${r},${g},${b},${a})`;
  }
  /** Parse rgb()/rgba()/#hex into {r,g,b,a}; falls back to opaque black. */
  private parseRgba(c: string): { r: number; g: number; b: number; a: number } {
    const s = (c || '').trim();
    const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    const hex = s.replace('#', '');
    if (/^[0-9a-f]{6}$/i.test(hex)) return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 };
    if (/^[0-9a-f]{3}$/i.test(hex)) return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), a: 1 };
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  phImg(i: number): string {
    const fills = ['%2386EFAC', '%23FDE68A', '%23FCA5A5', '%23A5B4FC', '%2367E8F9', '%23F9A8D4'];
    const fill = fills[i % fills.length];
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 100'%3E%3Crect width='160' height='100' fill='${fill}'/%3E%3Cpolygon points='0,100 160,18 160,100' fill='rgba(255,255,255,0.22)'/%3E%3C/svg%3E")`;
  }

  constructor(private themes: ThemeService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router, private sanitizer: DomSanitizer, private customColors: ThemeCustomColorService, private alertController: AlertController) {}

  async ngOnInit(): Promise<void> { await this.init(); }
  ngOnDestroy(): void {
    this.customColorSub?.unsubscribe();
    this.customColors.reset();
  }

  /** Ionic re-enters cached page views without re-running ngOnInit. Re-initialise
   *  on every entry so "New Theme" always starts on the Home step with a clean
   *  slate instead of resuming the previous theme's Review/last step. */
  async ionViewWillEnter(): Promise<void> { await this.init(); }

  private async init(): Promise<void> {
    // Full reset so a reused (cached) wizard instance never carries stale state.
    this.stepIndex = 0;
    this.activeSlide = 0;
    this.resultSynced = false;
    this.nameError = '';
    this.name = '';
    this.t = ThemeService.defaultTokens();
    // New themes should start with horizontal overflow on Home (including Columns).
    if ((this.t.scrollMode || 'auto') === 'auto') this.t.scrollMode = 'horizontal';
    // New themes should start with horizontal overflow on Intermediate Columns.
    if (this.t.intermediateStyle === 'columns') this.t.intermediate.scrollMode = 'horizontal';
    this.saverMode = this.t.screensaver?.mode ?? 'slideshow';
    this.id = this.route.snapshot.paramMap.get('id');
    this.openedFromPreview = this.route.snapshot.queryParamMap.get('from') === 'theme-preview';
    this.previewReturnId = this.route.snapshot.queryParamMap.get('returnTheme');
    if (this.id) {
      const existing = (await this.themes.list()).find((x) => x.id === this.id);
      if (existing) {
        this.name = existing.name;
        this.t = ThemeService.normalize(JSON.parse(JSON.stringify(existing.tokens)));
        this.saverMode = this.t.screensaver?.mode ?? 'slideshow';
        // Edit-time only: a loaded theme may carry a textPos that is hidden for
        // its content/layout combo — coerce so the wizard never saves it back.
        this.coerceTextPos();
      }
    }
    this.bindCustomColors();
    // Baseline for the unsaved-changes guard: anything the user edits after this
    // point makes the wizard "dirty" and cancelling asks for confirmation.
    this.baseline = this.snapshot();
    // Baseline for the per-step Reset button: the configuration the wizard opened
    // with (factory defaults for a new theme, the saved values when editing).
    this.baseTokens = JSON.parse(JSON.stringify(this.t));
    this.baseSaverMode = this.saverMode;
  }

  /** Serialized wizard state — compared against the baseline to detect edits. */
  private snapshot(): string {
    return JSON.stringify({ name: this.name, tokens: this.t, saver: this.saverMode });
  }

  private bindCustomColors(): void {
    this.customColorSub?.unsubscribe();
    this.customColors.reset(this.t.customColors || []);
    this.customColorSub = this.customColors.colors$.subscribe((colors) => {
      this.t.customColors = colors.length ? colors : undefined;
    });
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

  get scaleNum(): number { return this.textScaleValue; }

  /** Header visibility per page (saver never shows a header). */
  headerVisibleFor(page: PreviewPage): boolean {
    return page === 'inter' ? this.t.intermediate.showHeader
      : page === 'result' ? this.t.result.showHeader
      : page === 'saver' ? false
      : this.t.showHeader;
  }
  get isCustomHeader(): boolean { return (this.t.headerLayout || 'preset') === 'custom'; }
  headerColorForPage(page: PreviewPage): string {
    return page === 'inter' ? this.t.intermediate.headerColor
      : page === 'result' ? this.resultHeaderColor
      : this.t.headerColor;
  }
  headerTextColorFor(page: PreviewPage): string {
    return page === 'inter' ? (this.t.intermediate.headerTextColor || '#FFFFFF')
      : page === 'result' ? '#FFFFFF'
      : (this.t.headerTextColor || '#FFFFFF');
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
  get homeCardAreaBackground(): string {
    return this.t.backgroundImage ? 'transparent' : this.t.background;
  }
  get intermediateCardAreaBackground(): string {
    return this.t.intermediate.backgroundImage ? 'transparent' : this.t.intermediate.background;
  }
  pageCaption(page: PreviewPage): string {
    return page === 'inter' ? 'Intermediate' : page === 'result' ? 'Result' : page === 'saver' ? 'Screensaver' : 'Home';
  }

  headerCustomFor(page: PreviewPage): boolean {
    if (page === 'inter') return (this.t.intermediate.headerLayout || 'preset') === 'custom';
    return (this.t.headerLayout || 'preset') === 'custom';
  }
  headerStyleFor(page: PreviewPage): string {
    if (page === 'inter') return this.t.intermediate.headerStyle || 'logo-only';
    return this.t.headerStyle || 'logo-only';
  }
  logoPosFor(page: PreviewPage): string {
    if (page === 'inter') return this.t.intermediate.logoPos || 'left';
    return this.t.logoPos || this.t.logoPosition || 'left';
  }
  titlePosFor(page: PreviewPage): string {
    if (page === 'inter') return this.t.intermediate.titlePos || 'center';
    return this.t.titlePos || 'center';
  }
  captionPosFor(page: PreviewPage): string {
    if (page === 'inter') return this.t.intermediate.captionPos || 'center';
    return this.t.captionPos || 'center';
  }
  logoVisibleFor(page: PreviewPage): boolean {
    if (this.headerCustomFor(page)) return this.logoPosFor(page) !== 'hidden';
    const s = this.headerStyleFor(page);
    return s === 'logo-only' || s === 'logo+title' || s === 'logo+title+caption';
  }
  titleVisibleFor(page: PreviewPage): boolean {
    if (this.headerCustomFor(page)) return this.titlePosFor(page) !== 'hidden';
    return this.headerStyleFor(page) !== 'logo-only';
  }
  captionVisibleFor(page: PreviewPage): boolean {
    if (this.headerCustomFor(page)) return this.captionPosFor(page) !== 'hidden';
    const s = this.headerStyleFor(page);
    return s === 'title+caption' || s === 'logo+title+caption';
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
    if (page === 'inter') {
      this.t.intermediate.backgroundImage = dataUrl;
    } else if (page === 'result') {
      this.t.result.backgroundImage = dataUrl;
    } else {
      this.t.backgroundImage = dataUrl;
    }
    this.applyFinderTransparentPageBackground(page);
  }

  private applyFinderTransparentPageBackground(page: PreviewPage): void {
    if (page === 'home' && this.t.homeLayout === 'finder-select' && this.t.backgroundImage) {
      this.t.background = 'transparent';
    }
    if (page === 'inter' && this.t.intermediateStyle === 'finder-select' && this.t.intermediate.backgroundImage) {
      this.t.intermediate.background = 'transparent';
    }
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

  /** Tracks whether result colors have already been synced from home this session. */
  private resultSynced = false;
  private prevHomeHeaderColor?: string;
  private prevHomeHeaderTextColor?: string;
  private prevHomeBackground?: string;

  /** Keep Intermediate header/background-related values synced with Home. */
  private syncInterFromHome(): void {
    const d = ThemeService.defaultTokens().intermediate;
    const homeHeaderColor = this.t.headerColor;
    const homeHeaderTextColor = this.t.headerTextColor || '#FFFFFF';
    const homeBackground = this.t.background;
    const interHeaderTextColor = this.t.intermediate.headerTextColor || '#FFFFFF';

    this.t.intermediate.headerLayout = this.t.headerLayout || 'preset';
    this.t.intermediate.headerStyle = this.t.headerStyle || 'logo-only';
    this.t.intermediate.logoPos = this.t.logoPos || this.t.logoPosition || 'left';
    this.t.intermediate.titlePos = this.t.titlePos || 'center';
    this.t.intermediate.captionPos = this.t.captionPos || 'center';

    if (this.t.intermediate.headerColor === d.headerColor || this.t.intermediate.headerColor === this.prevHomeHeaderColor) {
      this.t.intermediate.headerColor = homeHeaderColor;
    }
    if (interHeaderTextColor === (d.headerTextColor || '#FFFFFF') || interHeaderTextColor === (this.prevHomeHeaderTextColor || '#FFFFFF')) {
      this.t.intermediate.headerTextColor = homeHeaderTextColor;
    }

    this.prevHomeHeaderColor = homeHeaderColor;
    this.prevHomeHeaderTextColor = homeHeaderTextColor;
    this.t.intermediate.transparentHeader = this.t.transparentHeader;
    if (this.t.intermediate.background === d.background || this.t.intermediate.background === this.prevHomeBackground) {
      this.t.intermediate.background = homeBackground;
    }
    this.prevHomeBackground = homeBackground;
    this.t.intermediate.backgroundImage = this.t.backgroundImage;
    this.t.intermediate.bgImageX = this.t.bgImageX;
    this.t.intermediate.bgImageY = this.t.bgImageY;
    this.t.intermediate.bgImageZoom = this.t.bgImageZoom;
    this.applyFinderTransparentPageBackground('home');
    this.applyFinderTransparentPageBackground('inter');
  }

  /**
   * Copy Home colors into Result defaults, but only if they are still at
   * factory defaults.
   */
  private syncResultFromHome(): void {
    if (this.resultSynced) return;
    if (this.t.resultTemplate === 'map-list') {
      this.applyMapListDefaults();
      this.resultSynced = true;
      return;
    }
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

  /**
   * Inherit header layout and style from Home to Intermediate when first
   * entering the intermediate design step. Only applies if intermediate header
   * is shown and values aren't already set.
   */
  private syncHeaderToIntermediate(): void {
    if (!this.t.intermediate.showHeader) return;
    // Only inherit if not already customized (use || to check for undefined/null)
    if (!this.t.intermediate.headerStyle) {
      this.t.intermediate.headerStyle = this.t.headerStyle || 'logo-only';
    }
    if (!this.t.intermediate.headerLayout) {
      this.t.intermediate.headerLayout = this.t.headerLayout || 'preset';
    }
    if (!this.t.intermediate.logoPos) {
      this.t.intermediate.logoPos = this.t.logoPos || 'left';
    }
    if (!this.t.intermediate.titlePos) {
      this.t.intermediate.titlePos = this.t.titlePos || 'center';
    }
    if (!this.t.intermediate.captionPos) {
      this.t.intermediate.captionPos = this.t.captionPos || 'center';
    }
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
    // Removed layout styles (pills / image-grid / center-tiles) are no longer
    // selectable — when arriving at the intermediate-design step with one of them
    // (or anything not in the current list), default to 'columns' so a tile is
    // selected and its preview shows.
    if (this.visibleSteps[this.stepIndex]?.key === 'intStyle' && !this.intStyles.includes(this.t.intermediateStyle)) {
      this.t.intermediateStyle = 'columns';
      this.t.intermediate.align = 'center';
    }
    // Intermediate header/background-related settings are inherited from Home.
    if (this.visibleSteps[this.stepIndex]?.key === 'intStyle' || this.visibleSteps[this.stepIndex]?.key === 'intColors') {
      this.syncInterFromHome();
    }
    if (this.visibleSteps[this.stepIndex]?.page === 'inter') this.clampIntColumns();
    if (this.visibleSteps[this.stepIndex]?.page === 'result' && this.t.resultTemplate === 'map-list') {
      this.applyMapListDefaults();
      this.resultSynced = true;
    }
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
    this.clampIntColumns();
    this.clampIntItemSize();
    this.syncInterFromHome();
    const saverTitle = (this.t.saverOverlay?.title || '').trim();
    const saverSubtitle = (this.t.saverOverlay?.subtitle || '').trim();
    if (this.t.saverOverlay) {
      this.t.saverOverlay.title = saverTitle ? saverTitle : undefined;
      this.t.saverOverlay.subtitle = saverSubtitle ? saverSubtitle : undefined;
    }
    this.t = { ...this.t, screensaver: { mode: this.saverMode } };
    const theme: SavedTheme = { id: this.id ?? 'thm_' + Date.now(), name, tokens: this.t, updatedAt: Date.now() };
    await this.themes.save(theme);
    this.router.navigateByUrl('/tabs/themes');
  }
  /** Clear the duplicate-name warning as soon as the user edits the name. */
  onNameInput(): void { if (this.nameError) this.nameError = ''; }

  /** Set after init(); non-empty means the guard is armed. */
  private baseline = '';

  // ---- Per-step Reset (back to the configuration the wizard opened with) ----

  /** Deep-cloned tokens captured at the end of init(): factory defaults for a
   *  new theme, the saved values when editing. Per-step Reset restores from here. */
  private baseTokens: ThemeTokens = ThemeService.defaultTokens();
  private baseSaverMode: ScreensaverMode = 'slideshow';

  /** Token paths each wizard step's controls write. Tokens surfaced on more than
   *  one step (cardSurface, overlayColor, scrollMode, nav, navStyle) are listed
   *  under every step that shows them — resetting either page restores the same
   *  baseline value, so there is no conflict. Review has no entry (nothing to reset). */
  private static readonly STEP_RESET_FIELDS: Record<string, string[]> = {
    home: [
      'homeLayout', 'columns', 'scrollMode', 'cardSize', 'cardSizeScale', 'cardGap', 'cardGapNum',
      'cardAlign', 'cardVAlign', 'cardContent', 'cardShape', 'cardSurface', 'cardTextPos',
      'cardTextAlign', 'cardTextShadow', 'cardTextOverlay', 'cardOverlayStyle', 'cardOverlayShape',
      'overlayColor', 'showHeader', 'headerLayout', 'headerStyle', 'logoPos', 'titlePos', 'captionPos',
      'includeIntermediate',
      // finder-select home options live on the intermediate sub-object
      'intermediate.fsShowPrompt', 'intermediate.fsPromptPos', 'intermediate.fsCardContent',
      'intermediate.fsCardShape', 'intermediate.fsTextPos', 'intermediate.fsTextAlign',
      'intermediate.itemSize', 'intermediate.itemSizeScale',
    ],
    colors: [
      'headerColor', 'headerTextColor', 'background', 'backgroundImage', 'bgImageX', 'bgImageY',
      'bgImageZoom', 'cardBackground', 'cardText', 'overlayColor', 'accent', 'logoPosition',
      'intermediate.promptTextColor', 'intermediate.heroColor',
    ],
    type: ['typography'],
    intStyle: [
      'intermediateStyle', 'cardSurface', 'overlayColor',
      'intermediate.columns', 'intermediate.scrollMode', 'intermediate.content', 'intermediate.cardShape',
      'intermediate.textPos', 'intermediate.textAlign', 'intermediate.textShadow', 'intermediate.textOverlay',
      'intermediate.overlayStyle', 'intermediate.overlayShape', 'intermediate.align', 'intermediate.valign',
      'intermediate.gap', 'intermediate.gapNum', 'intermediate.itemSize', 'intermediate.itemSizeScale',
      'intermediate.showHeader', 'intermediate.showTracklist',
      'intermediate.headerStyle', 'intermediate.headerLayout', 'intermediate.logoPos', 'intermediate.titlePos', 'intermediate.captionPos',
      'intermediate.brandRailMessagePos', 'intermediate.brandRailMessageAlign',
      'intermediate.fsShowPrompt', 'intermediate.fsPromptPos', 'intermediate.fsShowBack',
      'intermediate.fsCardContent', 'intermediate.fsCardShape', 'intermediate.fsTextPos', 'intermediate.fsTextAlign',
    ],
    intColors: [
      'intermediate.headerColor', 'intermediate.headerTextColor', 'intermediate.background',
      'intermediate.backgroundImage', 'intermediate.bgImageX', 'intermediate.bgImageY', 'intermediate.bgImageZoom',
      'intermediate.cardBackground', 'intermediate.cardText', 'intermediate.heroColor', 'intermediate.accent',
      'intermediate.brandRailMessageBgColor', 'intermediate.brandRailMessageTextColor', 'overlayColor',
      'nav', 'navStyle', 'intermediate.navSplit', 'intermediate.navPosition',
      'intermediate.navBackPosition', 'intermediate.navHomePosition',
    ],
    resTemplate: [
      'resultTemplate', 'result.scrollMode', 'result.showTimer', 'result.showBell', 'result.showRanks',
      'result.showSortTabs', 'result.showZone', 'result.sortTabs', 'result.showSaleBadge',
      'result.filterPos', 'result.content', 'result.cardShape', 'result.textPos',
    ],
    resColors: [
      'result.headerColor', 'result.background', 'result.backgroundImage', 'result.cardBackground',
      'result.cardText', 'result.popularText', 'result.accent', 'result.findColor', 'result.listBg',
      'result.cardBg', 'result.cardTextColor', 'result.panelColor', 'result.railBg', 'result.subPanelColor',
      'result.secondaryTextColor', 'result.pinColor', 'result.dotColor', 'result.mapBg',
      'result.showHeader', 'result.showTracklist',
      'nav', 'navStyle', 'result.navSplit', 'result.navPosition', 'result.navBackPosition', 'result.navHomePosition',
    ],
    anim: ['animation', 'loader'],
    saver: ['saverOverlay'],
  };

  /** Whether the current step has a Reset button (all except Review). */
  get stepResettable(): boolean { return !!ThemeWizardComponent.STEP_RESET_FIELDS[this.step.key]; }

  /** Restore one dot-path in `t` from the baseline. Values the baseline doesn't
   *  have are deleted so `?? / ||` display fallbacks apply again. */
  private restoreTokenPath(path: string): void {
    const segs = path.split('.');
    let src: any = this.baseTokens;
    let dst: any = this.t;
    for (let i = 0; i < segs.length - 1; i++) {
      src = src?.[segs[i]];
      if (typeof dst[segs[i]] !== 'object' || dst[segs[i]] == null) dst[segs[i]] = {};
      dst = dst[segs[i]];
    }
    const last = segs[segs.length - 1];
    const v = src?.[last];
    if (v === undefined) delete dst[last];
    else dst[last] = JSON.parse(JSON.stringify(v));
  }

  /** Reset every field the current page edits back to its opening value
   *  (defaults for a new theme, the saved values when editing) — confirmed first. */
  async resetStep(): Promise<void> {
    const key = this.step.key;
    const paths = ThemeWizardComponent.STEP_RESET_FIELDS[key];
    if (!paths) return;
    const alert = await this.alertController.create({
      header: 'Reset this page?',
      message: 'All settings on this page go back to their starting values. Other pages are not affected.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Reset', role: 'destructive', handler: () => this.applyStepReset(key, paths) },
      ],
    });
    await alert.present();
  }

  private applyStepReset(key: string, paths: string[]): void {
    if (key === 'saver') this.saverMode = this.baseSaverMode;
    for (const p of paths) this.restoreTokenPath(p);
    // Re-run the coercions/inherits that fire when the step is entered, so the
    // page shows exactly what it did the first time it was opened.
    this.coerceTextPos();
    if (key === 'intStyle' || key === 'intColors') { this.syncInterFromHome(); this.clampIntColumns(); }
    if (key === 'resColors') { this.resultSynced = false; this.syncResultFromHome(); }
  }

  // ===== Editor Deck (phase 3a/3b) — Home, Colors & Type steps =====
  // View-only UI state (active category chip / value pill, sheet open flags).
  // Every option below reads/writes the exact same `t.*` properties and calls
  // the exact same methods as the original vertical form — only the presentation
  // (chips → value pills → single editor card, plus an "All settings" sheet) is
  // restructured. See UI-REDESIGN-INVENTORY.md Step 1 / Step 2 / Step 3 for the full list.

  private capitalize(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  private pct(v: number): string { return Math.round(v * 100) + '%'; }

  // ----- Home step (phase 3b) -----
  // Same mutually-exclusive branches as the original template: the Finder-select
  // arrangement replaces Card size/gap/alignment + Card content/shape + Text
  // position with its own fs*-prefixed controls, while Card surface and the
  // "Card gap" slider are literally the same bound property (t.cardSurface /
  // t.cardGapNum via setCardGap) in both branches — represented as ONE option
  // here since only one branch is ever visible at a time.
  homeActiveChip = 0;
  homeActivePill = 0;
  homeSettingsOpen = false;

  private get homeArrangementOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    out.push({ key: 'homeLayout', icon: 'grid-outline', label: 'Arrangement', value: this.layoutLabels[this.t.homeLayout] || this.t.homeLayout });

    if (this.scrollMatters && !this.isHeroStart && this.scrollModesVisible.length > 1) {
      const lbl = this.scrollModesVisible.find((m) => m.id === this.effectiveScrollMode)?.label || this.effectiveScrollMode;
      out.push({ key: 'scrollMode', icon: 'swap-horizontal-outline', label: 'Overflow scrolling', value: lbl });
    }

    if (this.columnsMatter) {
      out.push({ key: 'columns', icon: 'apps-outline', label: this.itemCountMatters ? 'Items' : 'Columns', value: `${this.effectiveColumns}` });
    }

    if (this.t.homeLayout === 'finder-select') {
      const showPrompt = this.t.intermediate.fsShowPrompt !== false;
      out.push({ key: 'fsShowPrompt', icon: 'eye-outline', label: 'Title visibility', value: showPrompt ? 'Show title' : 'Hide title' });
      if (showPrompt) {
        out.push({ key: 'fsPromptPos', icon: 'reorder-three-outline', label: 'Title alignment', value: this.capitalize(this.t.intermediate.fsPromptPos || 'center') });
      }
      out.push({ key: 'intItemSize', icon: 'resize-outline', label: 'Item size', value: this.pct(this.intItemSizeValue) });
      out.push({ key: 'cardGap', icon: 'contract-outline', label: 'Card gap', value: `${this.cardGapValue}px` });
    } else if (!this.isHeroStart) {
      if (this.sizeMatters) {
        out.push({ key: 'cardSize', icon: 'expand-outline', label: 'Card size', value: this.pct(this.cardSizeValue) });
      }
      if (this.gapMatters) {
        out.push({ key: 'cardGap', icon: 'contract-outline', label: 'Card gap', value: `${this.cardGapValue}px` });
      }
      if (this.alignMatters) {
        out.push({ key: 'cardAlign', icon: 'reorder-four-outline', label: 'Card alignment', value: this.capitalize(this.t.cardAlign || 'center') });
      }
    }
    return out;
  }

  private get homeCardStyleOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.homeLayout === 'finder-select') {
      const fsContent = this.t.intermediate.fsCardContent || 'text-only';
      out.push({ key: 'fsCardContent', icon: 'albums-outline', label: 'Card content', value: this.fsCardContents.find((c) => c.id === fsContent)?.label || fsContent });
      if (fsContent !== 'text-only' && fsContent !== 'image-only') {
        const shape = this.t.intermediate.fsCardShape || 'rect';
        out.push({ key: 'fsCardShape', icon: 'square-outline', label: 'Card shape', value: this.cardShapes.find((s) => s.id === shape)?.label || shape });
      }
      out.push({ key: 'cardSurface', icon: 'layers-outline', label: 'Card surface', value: this.cardSurfaces.find((s) => s.id === (this.t.cardSurface || 'flat'))?.label || 'Flat' });
    } else if (!this.isHeroStart) {
      out.push({ key: 'cardContent', icon: 'albums-outline', label: 'Card content', value: this.cardContentsFor.find((c) => c.id === this.t.cardContent)?.label || this.t.cardContent });
      if (!this.isImageStrip && this.t.cardContent !== 'image-only') {
        out.push({ key: 'cardShape', icon: 'square-outline', label: 'Card shape', value: this.availableCardShapes.find((s) => s.id === this.t.cardShape)?.label || this.t.cardShape });
      }
      out.push({ key: 'cardSurface', icon: 'layers-outline', label: 'Card surface', value: this.cardSurfaces.find((s) => s.id === (this.t.cardSurface || 'flat'))?.label || 'Flat' });
    }
    return out;
  }

  private get homeCardTextOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.homeLayout === 'finder-select') {
      if (this.finderTextPositionMatters) {
        const v = this.t.intermediate.fsTextPos || 'center';
        out.push({ key: 'fsTextPos', icon: 'text-outline', label: 'Text vertical position', value: this.fsTextVPositions.find((p) => p.id === v)?.label || v });
      }
      const fsContent = this.t.intermediate.fsCardContent || 'text-only';
      if (fsContent !== 'image-only' && this.finderTextAlignMatters) {
        const v = this.t.intermediate.fsTextAlign || 'center';
        out.push({ key: 'fsTextAlign', icon: 'reorder-three-outline', label: 'Text horizontal alignment', value: this.cardAligns.find((a) => a.id === v)?.label || v });
      }
    } else if (this.showTextPos) {
      out.push({ key: 'cardTextPos', icon: 'text-outline', label: 'Text vertical position', value: this.textPositionsFor.find((p) => p.id === this.t.cardTextPos)?.label || this.t.cardTextPos });
      if (this.t.cardContent !== 'icon-text') {
        const v = this.t.cardTextAlign || 'center';
        out.push({ key: 'cardTextAlign', icon: 'reorder-three-outline', label: 'Text horizontal alignment', value: this.cardAligns.find((a) => a.id === v)?.label || v });
      }
      if (this.overlayRelevant) {
        out.push({ key: 'cardOverlay', icon: 'contrast-outline', label: 'Text Overlay', value: this.homeOverlayStyles.find((s) => s.id === this.cardOverlayEff)?.label || this.cardOverlayEff });
        if (this.cardOverlayEff !== 'none' && (this.t.cardTextPos || 'overlay-bottom') === 'overlay-bottom') {
          out.push({ key: 'cardOverlayShape', icon: 'square-outline', label: 'Overlay shape', value: this.overlayShapes.find((s) => s.id === this.cardOverlayShapeEff)?.label || this.cardOverlayShapeEff });
        }
        if (this.cardOverlayEff !== 'none') {
          out.push({ key: 'overlayOpacity', icon: 'contrast-outline', label: 'Overlay opacity', value: `${this.overlayOpacity}%` });
        }
      }
      out.push({ key: 'cardTextShadow', icon: 'moon-outline', label: 'Text shadow', value: this.t.cardTextShadow === true ? 'On' : 'Off' });
    }
    return out;
  }

  private get homeHeaderOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.homeLayout !== 'finder-select') {
      out.push({ key: 'headerBar', icon: 'menu-outline', label: 'Header bar', value: this.t.showHeader ? 'Show' : 'Hide' });
      if (this.t.showHeader) {
        out.push({ key: 'headerLayout', icon: 'options-outline', label: 'Header layout', value: this.isCustomHeader ? 'Custom (independent)' : 'Preset combos' });
        if (!this.isCustomHeader) {
          const v = this.t.headerStyle || 'logo-only';
          out.push({ key: 'headerStyle', icon: 'albums-outline', label: 'Header style', value: this.headerStyles.find((h) => h.id === v)?.label || v });
        } else {
          out.push({ key: 'logoPos', icon: 'flag-outline', label: 'Logo position', value: this.headerItemPositions.find((p) => p.id === (this.t.logoPos || 'left'))?.label || 'Left' });
          out.push({ key: 'titlePos', icon: 'text-outline', label: 'Title position', value: this.headerItemPositions.find((p) => p.id === (this.t.titlePos || 'center'))?.label || 'Center' });
          out.push({ key: 'captionPos', icon: 'chatbubble-outline', label: 'Caption position', value: this.headerItemPositions.find((p) => p.id === (this.t.captionPos || 'center'))?.label || 'Center' });
        }
      }
    }
    out.push({ key: 'includeIntermediate', icon: 'layers-outline', label: 'Intermediate page', value: this.t.includeIntermediate ? 'Include' : 'Skip → Result' });
    return out;
  }

  get homeCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'arrangement', icon: 'grid-outline', label: 'Arrangement', options: this.homeArrangementOptions },
      { key: 'cardStyle', icon: 'square-outline', label: 'Card style', options: this.homeCardStyleOptions },
      { key: 'cardText', icon: 'text-outline', label: 'Card content & text', options: this.homeCardTextOptions },
      { key: 'header', icon: 'menu-outline', label: 'Header', options: this.homeHeaderOptions },
    ].filter((c) => c.options.length > 0);
  }
  get homeActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.homeCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.homeActiveChip, cats.length - 1)];
  }
  get homeChipsInput(): NtDeckChip[] { return this.homeCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get homePillsInput(): NtValuePill[] {
    return (this.homeActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get homeActiveOption(): DeckOption | undefined {
    const opts = this.homeActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.homeActivePill, opts.length - 1)];
  }
  get homeActivePillKey(): string { return this.homeActiveOption?.key || ''; }
  get homeActivePillLabel(): string { return (this.homeActiveOption?.label || '').toUpperCase(); }
  get homeSettingsGroups(): NtSettingsGroup[] {
    return this.homeCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onHomeChipChange(i: number): void { this.homeActiveChip = i; this.homeActivePill = 0; }
  onHomeRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.homeActiveChip = sel.groupIndex;
    this.homeActivePill = sel.rowIndex;
  }

  // ----- Colors step -----
  colorsActiveChip = 0;
  colorsActivePill = 0;
  colorsSettingsOpen = false;

  private get colorsHeaderOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.showHeader) {
      out.push({ key: 'headerColor', icon: 'color-palette-outline', label: 'Header', value: this.t.headerColor, swatch: this.t.headerColor });
      const htc = this.t.headerTextColor || '#FFFFFF';
      out.push({ key: 'headerTextColor', icon: 'text-outline', label: 'Header text', value: htc, swatch: htc });
    }
    if (this.t.homeLayout === 'finder-select' || this.t.intermediateStyle === 'finder-select') {
      const v = this.t.intermediate?.promptTextColor || this.t.intermediate?.headerTextColor || this.t.headerTextColor || '#FFFFFF';
      out.push({ key: 'promptTextColor', icon: 'chatbubble-outline', label: 'Prompt text', value: v, swatch: v });
    }
    return out;
  }

  private get colorsBackgroundOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.t.backgroundImage || this.t.homeLayout === 'finder-select') {
      const v = this.t.backgroundImage && this.t.homeLayout === 'finder-select' ? 'transparent' : this.t.background;
      out.push({ key: 'background', icon: 'image-outline', label: 'Page background', value: v, swatch: v !== 'transparent' ? v : undefined });
    }
    out.push({ key: 'backgroundImage', icon: 'cloud-upload-outline', label: 'Background image', value: this.t.backgroundImage ? 'Image set' : 'None' });
    if (this.t.backgroundImage) {
      out.push({ key: 'bgImageX', icon: 'resize-outline', label: 'Pan X', value: `${this.t.bgImageX ?? 50}%` });
      out.push({ key: 'bgImageY', icon: 'resize-outline', label: 'Pan Y', value: `${this.t.bgImageY ?? 50}%` });
      out.push({ key: 'bgImageZoom', icon: 'expand-outline', label: 'Zoom', value: `${this.t.bgImageZoom ?? 100}%` });
    }
    return out;
  }

  private get colorsCardOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const fsContent = this.t.intermediate.fsCardContent || 'text-only';
    const showCardBg = (this.t.homeLayout !== 'finder-select' && this.t.cardContent !== 'image-only' && this.t.cardContent !== 'image-text')
      || (this.t.homeLayout === 'finder-select' && (fsContent === 'text-only' || fsContent === 'icon-text'));
    if (showCardBg) out.push({ key: 'cardBackground', icon: 'square-outline', label: 'Card background', value: this.t.cardBackground, swatch: this.t.cardBackground });
    const showCardText = (this.t.homeLayout !== 'finder-select' && this.t.cardContent !== 'image-only')
      || (this.t.homeLayout === 'finder-select' && fsContent !== 'image-only');
    if (showCardText) out.push({ key: 'cardText', icon: 'text-outline', label: 'Card text', value: this.t.cardText, swatch: this.t.cardText });
    if (this.t.homeLayout === 'finder-select') {
      const hero = this.t.intermediate.heroColor || '#172033';
      out.push({ key: 'heroColor', icon: 'albums-outline', label: 'Hero panel', value: hero, swatch: hero });
    }
    if (this.overlayRelevant || this.t.homeLayout === 'finder-select') {
      const ov = this.t.overlayColor || 'rgba(0,0,0,0.6)';
      out.push({ key: 'overlayColor', icon: 'contrast-outline', label: 'Text overlay', value: ov, swatch: ov });
    }
    return out;
  }

  private get colorsAccentOptions(): DeckOption[] {
    const out: DeckOption[] = [{ key: 'accent', icon: 'color-palette-outline', label: 'Accent / highlight', value: this.t.accent, swatch: this.t.accent }];
    if (this.t.showHeader && !this.isCustomHeader) {
      out.push({ key: 'logoPosition', icon: 'flag-outline', label: 'Logo position', value: this.capitalize(this.t.logoPosition || 'left') });
    }
    return out;
  }

  get colorsCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'header', icon: 'menu-outline', label: 'Header', options: this.colorsHeaderOptions },
      { key: 'background', icon: 'image-outline', label: 'Background', options: this.colorsBackgroundOptions },
      { key: 'cards', icon: 'albums-outline', label: 'Cards', options: this.colorsCardOptions },
      { key: 'accent', icon: 'color-palette-outline', label: 'Accent & logo', options: this.colorsAccentOptions },
    ].filter((c) => c.options.length > 0);
  }
  get colorsActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.colorsCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.colorsActiveChip, cats.length - 1)];
  }
  get colorsChipsInput(): NtDeckChip[] { return this.colorsCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get colorsPillsInput(): NtValuePill[] {
    return (this.colorsActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get colorsActiveOption(): DeckOption | undefined {
    const opts = this.colorsActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.colorsActivePill, opts.length - 1)];
  }
  get colorsActivePillKey(): string { return this.colorsActiveOption?.key || ''; }
  get colorsActivePillLabel(): string { return (this.colorsActiveOption?.label || '').toUpperCase(); }
  get colorsSettingsGroups(): NtSettingsGroup[] {
    return this.colorsCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onColorsChipChange(i: number): void { this.colorsActiveChip = i; this.colorsActivePill = 0; }
  onColorsRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.colorsActiveChip = sel.groupIndex;
    this.colorsActivePill = sel.rowIndex;
  }

  // ----- Type step -----
  typeActiveChip = 0;
  typeActivePill = 0;
  typeSettingsOpen = false;

  private get typeFontFitOptions(): DeckOption[] {
    const fontLabel = this.fonts.find((f) => f.stack === this.t.typography.fontFamily)?.label || 'Custom';
    const fitLabel = this.textFits.find((f) => f.id === this.t.typography.textFit)?.label || this.t.typography.textFit;
    return [
      { key: 'font', icon: 'text-outline', label: 'Font', value: fontLabel },
      { key: 'textFit', icon: 'contract-outline', label: 'Text fit', value: fitLabel },
    ];
  }
  private get typeSizeOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.showCardTextScaleControl) out.push({ key: 'cardTextScale', icon: 'resize-outline', label: 'Card label size', value: this.pct(this.cardTextScaleValue) });
    if (this.showPromoTypographyControls) {
      out.push({ key: 'promoCopyTextScale', icon: 'resize-outline', label: 'Promo message text size', value: this.pct(this.promoCopyTextScaleValue) });
      out.push({ key: 'promoCardTextScale', icon: 'resize-outline', label: 'Promo card label size', value: this.pct(this.promoCardTextScaleValue) });
    }
    if (this.showIntermediateTextScaleControl) out.push({ key: 'intermediateTextScale', icon: 'resize-outline', label: 'Intermediate item text size', value: this.pct(this.intermediateTextScaleValue) });
    if (this.showResultTextScaleControl) out.push({ key: 'resultTextScale', icon: 'resize-outline', label: 'Result text size', value: this.pct(this.resultTextScaleValue) });
    if (this.showHeaderTextScaleControl) out.push({ key: 'headerTextScale', icon: 'resize-outline', label: 'Header text size', value: this.pct(this.headerTextScaleValue) });
    return out;
  }
  private get typeCaseOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.showCardTextCaseControl) {
      const lbl = this.textCases.find((c) => c.id === (this.t.typography.cardTextCase || 'default'))?.label || 'Default';
      out.push({ key: 'cardTextCase', icon: 'swap-vertical-outline', label: 'Card text case', value: lbl });
    }
    if (this.showHeaderTextScaleControl) {
      const lbl = this.textCases.find((c) => c.id === (this.t.typography.headerTextCase || 'default'))?.label || 'Default';
      out.push({ key: 'headerTextCase', icon: 'swap-vertical-outline', label: 'Header text case', value: lbl });
    }
    return out;
  }
  get typeCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'font', icon: 'text-outline', label: 'Font & fit', options: this.typeFontFitOptions },
      { key: 'sizes', icon: 'resize-outline', label: 'Text sizes', options: this.typeSizeOptions },
      { key: 'case', icon: 'swap-vertical-outline', label: 'Text case', options: this.typeCaseOptions },
    ].filter((c) => c.options.length > 0);
  }
  get typeActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.typeCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.typeActiveChip, cats.length - 1)];
  }
  get typeChipsInput(): NtDeckChip[] { return this.typeCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get typePillsInput(): NtValuePill[] {
    return (this.typeActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get typeActiveOption(): DeckOption | undefined {
    const opts = this.typeActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.typeActivePill, opts.length - 1)];
  }
  get typeActivePillKey(): string { return this.typeActiveOption?.key || ''; }
  get typeActivePillLabel(): string { return (this.typeActiveOption?.label || '').toUpperCase(); }
  get typeSettingsGroups(): NtSettingsGroup[] {
    return this.typeCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onTypeChipChange(i: number): void { this.typeActiveChip = i; this.typeActivePill = 0; }
  onTypeRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.typeActiveChip = sel.groupIndex;
    this.typeActivePill = sel.rowIndex;
  }

  // ----- Intermediate design step (phase 3c) -----
  // Same pattern as Home (phase 3b): chips Arrangement / Card style / Card content & text /
  // Header. "Card gap" merges the Finder-select and generic branches into ONE pill — both bind
  // to the same t.intermediate.gapNum / setIntCardGap() control and are mutually exclusive by
  // t.intermediateStyle, exactly like Home's Card gap/Card surface merge. "Overflow scrolling"
  // and "Carousel scrolling" merge into one 'interScroll' key (both call setInterScroll(),
  // mutually exclusive by style) but stay permanently unreachable while hideVerticalScroll ===
  // true (see inventory note 2) — the option is never pushed into the array below, so it never
  // becomes a chip/pill or a settings-sheet row, exactly mirroring the original template's
  // `*ngIf="... && !hideVerticalScroll"` guards.
  intActiveChip = 0;
  intActivePill = 0;
  intSettingsOpen = false;

  private get intArrangementOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    out.push({ key: 'intermediateStyle', icon: 'grid-outline', label: 'Layout style', value: this.intStyleLabel(this.t.intermediateStyle) });

    if (this.intColumnsMatters) {
      out.push({ key: 'intColumns', icon: 'apps-outline', label: this.t.intermediateStyle === 'card-strip' ? 'Visible cards' : 'Columns', value: `${this.intColumnsValue}` });
    }

    // [HIDDEN — hideVerticalScroll, see inventory note 2] — never surfaced while the flag is true.
    if (!this.hideVerticalScroll && (this.intScrollMatters || this.t.intermediateStyle === 'fullscreen')) {
      const isCarousel = this.t.intermediateStyle === 'fullscreen';
      out.push({ key: 'interScroll', icon: 'swap-horizontal-outline', label: isCarousel ? 'Carousel scrolling' : 'Overflow scrolling', value: this.capitalize(this.effectiveInterScrollMode) });
    }

    if (this.t.intermediateStyle === 'brand-rail') {
      out.push({ key: 'brandRailMessagePos', icon: 'reorder-three-outline', label: 'Message position', value: this.capitalize(this.t.intermediate.brandRailMessagePos || 'right') });
      const va = this.t.intermediate.brandRailMessageAlign || 'center';
      out.push({ key: 'brandRailMessageAlign', icon: 'reorder-four-outline', label: 'Message alignment', value: this.brandRailValigns.find((v) => v.id === va)?.label || va });
    }

    if (this.t.intermediateStyle === 'finder-select') {
      const showPrompt = this.t.intermediate.fsShowPrompt !== false;
      out.push({ key: 'fsShowPrompt', icon: 'eye-outline', label: 'Title visibility', value: showPrompt ? 'Show title' : 'Hide title' });
      if (showPrompt) {
        out.push({ key: 'fsPromptPos', icon: 'reorder-three-outline', label: 'Title alignment', value: this.capitalize(this.t.intermediate.fsPromptPos || 'center') });
      }
      const showBack = this.t.intermediate.fsShowBack !== false;
      out.push({ key: 'fsShowBack', icon: 'arrow-back-outline', label: 'Back visibility', value: showBack ? 'Show back' : 'Hide back' });
    }

    if (this.t.intermediateStyle !== 'drill-stair' && this.t.intermediateStyle !== 'card-strip') {
      out.push({ key: 'intItemSize', icon: 'resize-outline', label: 'Item size', value: this.pct(this.intItemSizeValue) });
    }

    // Card gap: same t.intermediate.gapNum / setIntCardGap() control in both the
    // finder-select and generic branches (mutually exclusive) — ONE pill, mirrors Home.
    if (this.t.intermediateStyle !== 'drill-stair' && this.t.intermediateStyle !== 'card-strip') {
      out.push({ key: 'intCardGap', icon: 'contract-outline', label: 'Card gap', value: `${this.intCardGapValue}px` });
    }

    if (this.intAlignMatters) {
      const align = this.capitalize(this.t.intermediate.align || 'center');
      const value = this.t.intermediateStyle !== 'columns' ? `${align} · ${this.capitalize(this.t.intermediate.valign || 'middle')}` : align;
      out.push({ key: 'intAlign', icon: 'reorder-four-outline', label: 'Card alignment', value });
    }

    return out;
  }

  private get intCardStyleOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.intermediateStyle === 'finder-select') {
      const fsContent = this.t.intermediate.fsCardContent || 'text-only';
      out.push({ key: 'fsCardContent', icon: 'albums-outline', label: 'Card content', value: this.fsCardContents.find((c) => c.id === fsContent)?.label || fsContent });
      if (fsContent !== 'text-only' && fsContent !== 'image-only') {
        const shape = this.t.intermediate.fsCardShape || 'rect';
        out.push({ key: 'fsCardShape', icon: 'square-outline', label: 'Card shape', value: this.cardShapes.find((s) => s.id === shape)?.label || shape });
      }
    } else {
      if (this.intContentMatters) {
        const v = this.t.intermediate.content || 'image-text';
        out.push({ key: 'interContent', icon: 'albums-outline', label: 'Card content', value: this.interContentsFor.find((c) => c.id === v)?.label || v });
      }
      if (this.intShapeMatters && this.t.intermediate.content !== 'image-only') {
        const v = this.t.intermediate.cardShape || 'rect';
        out.push({ key: 'interShape', icon: 'square-outline', label: 'Card shape', value: this.interShapesFor.find((s) => s.id === v)?.label || v });
      }
    }
    if (this.t.intermediateStyle !== 'drill-stair') {
      out.push({ key: 'cardSurface', icon: 'layers-outline', label: 'Card surface', value: this.cardSurfaces.find((s) => s.id === (this.t.cardSurface || 'flat'))?.label || 'Flat' });
    }
    return out;
  }

  private get intCardTextOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.intermediateStyle === 'finder-select') {
      if (this.finderTextPositionMatters) {
        const v = this.t.intermediate.fsTextPos || 'center';
        out.push({ key: 'fsTextPos', icon: 'text-outline', label: 'Text vertical position', value: this.fsTextVPositions.find((p) => p.id === v)?.label || v });
      }
      const fsContent = this.t.intermediate.fsCardContent || 'text-only';
      if (fsContent !== 'image-only' && this.finderTextAlignMatters) {
        const v = this.t.intermediate.fsTextAlign || 'center';
        out.push({ key: 'fsTextAlign', icon: 'reorder-three-outline', label: 'Text horizontal alignment', value: this.cardAligns.find((a) => a.id === v)?.label || v });
      }
    } else {
      if (this.intTextPosMatters && (this.t.intermediate.content || 'image-text') !== 'image-only') {
        const v = this.t.intermediate.textPos || 'overlay-bottom';
        out.push({ key: 'interTextPos', icon: 'text-outline', label: 'Text vertical position', value: this.interTextPositionsFor.find((p) => p.id === v)?.label || v });
      }
      if (this.interTextAlignMatters) {
        const v = this.t.intermediate.textAlign || 'center';
        out.push({ key: 'interTextAlign', icon: 'reorder-three-outline', label: 'Text horizontal alignment', value: this.cardAligns.find((a) => a.id === v)?.label || v });
      }
      if (this.interOverlayRelevant) {
        out.push({ key: 'interOverlay', icon: 'contrast-outline', label: 'Text Overlay', value: this.interOverlayStyles.find((s) => s.id === this.interOverlayEff)?.label || this.interOverlayEff });
        if (this.interOverlayEff !== 'none' && (this.t.intermediate.textPos || 'overlay-bottom') === 'overlay-bottom') {
          out.push({ key: 'interOverlayShape', icon: 'square-outline', label: 'Overlay shape', value: this.overlayShapes.find((s) => s.id === this.interOverlayShapeEff)?.label || this.interOverlayShapeEff });
        }
        if (this.interOverlayEff !== 'none') {
          out.push({ key: 'overlayOpacity', icon: 'contrast-outline', label: 'Overlay opacity', value: `${this.overlayOpacity}%` });
        }
      }
    }
    if ((this.t.intermediate.content || 'image-text') !== 'image-only') {
      out.push({ key: 'interTextShadow', icon: 'moon-outline', label: 'Text shadow', value: this.t.intermediate.textShadow === true ? 'On' : 'Off' });
    }
    return out;
  }

  private get intHeaderOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.intermediateStyle !== 'finder-select') {
      out.push({ key: 'interHeaderBar', icon: 'menu-outline', label: 'Header bar', value: this.t.intermediate.showHeader ? 'Show' : 'Hide' });
      if (this.t.intermediate.showHeader) {
        out.push({ key: 'interHeaderTracklist', icon: 'list-outline', label: 'Header tracklist', value: this.t.intermediate.showTracklist !== false ? 'Show' : 'Hide' });
      }
    }
    return out;
  }

  get intCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'arrangement', icon: 'grid-outline', label: 'Arrangement', options: this.intArrangementOptions },
      { key: 'cardStyle', icon: 'square-outline', label: 'Card style', options: this.intCardStyleOptions },
      { key: 'cardText', icon: 'text-outline', label: 'Card content & text', options: this.intCardTextOptions },
      { key: 'header', icon: 'menu-outline', label: 'Header', options: this.intHeaderOptions },
    ].filter((c) => c.options.length > 0);
  }
  get intActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.intCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.intActiveChip, cats.length - 1)];
  }
  get intChipsInput(): NtDeckChip[] { return this.intCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get intPillsInput(): NtValuePill[] {
    return (this.intActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get intActiveOption(): DeckOption | undefined {
    const opts = this.intActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.intActivePill, opts.length - 1)];
  }
  get intActivePillKey(): string { return this.intActiveOption?.key || ''; }
  get intActivePillLabel(): string { return (this.intActiveOption?.label || '').toUpperCase(); }
  get intSettingsGroups(): NtSettingsGroup[] {
    return this.intCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onIntChipChange(i: number): void { this.intActiveChip = i; this.intActivePill = 0; }
  onIntRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.intActiveChip = sel.groupIndex;
    this.intActivePill = sel.rowIndex;
  }

  // ----- Navigation buttons — SHARED `t.nav` state used by BOTH Intermediate-colors and
  // Result-colors steps (phase 3d). Per UI-REDESIGN-INVENTORY.md note 1: 11 of the 15 controls
  // bind to the same t.nav / t.navStyle fields regardless of which step they're edited from —
  // editing "Back icon color" on Intermediate-colors changes the exact same value shown on
  // Result-colors, and that must keep being true. Only 4 controls (layout/split, position, back
  // position, home position) are genuinely per-page via navSplitFor()/navPositionFor()/
  // navBackPositionFor()/navHomePositionFor() (already page-scoped helpers, unchanged above).
  // ONE options-builder (navOptions) + ONE template (#navEditorTpl in the .html) are used
  // identically by both steps so there is only ever one code path writing to t.nav. -----
  private get navSharedOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const backColor = this.t.nav?.backColor || '#FFFFFF';
    out.push({ key: 'navBackColor', icon: 'color-palette-outline', label: 'Back · Icon color', value: backColor, swatch: backColor });
    const backBg = this.t.nav?.backBg || '#0f172a';
    out.push({ key: 'navBackBg', icon: 'square-outline', label: 'Back · Background', value: backBg, swatch: backBg });
    const homeColor = this.t.nav?.homeColor || '#FFFFFF';
    out.push({ key: 'navHomeColor', icon: 'color-palette-outline', label: 'Home · Icon color', value: homeColor, swatch: homeColor });
    const homeBg = this.t.nav?.homeBg || '#0f172a';
    out.push({ key: 'navHomeBg', icon: 'square-outline', label: 'Home · Background', value: homeBg, swatch: homeBg });

    const mode = this.t.nav?.mode || 'icon';
    out.push({ key: 'navMode', icon: 'options-outline', label: 'Button style', value: this.navModes.find((m) => m.id === mode)?.label || mode });
    if (mode !== 'icon') {
      out.push({ key: 'navBackLabel', icon: 'text-outline', label: 'Back label', value: this.t.nav?.backLabel || 'Back' });
      out.push({ key: 'navHomeLabel', icon: 'text-outline', label: 'Home label', value: this.t.nav?.homeLabel || 'Home' });
    }
    const size = this.t.nav?.size || 'normal';
    out.push({ key: 'navSize', icon: 'resize-outline', label: 'Button size', value: this.navSizes.find((s) => s.id === size)?.label || size });
    if (mode !== 'text') {
      out.push({ key: 'navBackIcon', icon: 'arrow-back-outline', label: 'Back icon', value: this.t.nav?.backIcon ? (this.isCustomNavIcon(this.t.nav.backIcon) ? 'Custom upload' : this.t.nav.backIcon) : 'Default' });
      out.push({ key: 'navHomeIcon', icon: 'home-outline', label: 'Home icon', value: this.t.nav?.homeIcon ? (this.isCustomNavIcon(this.t.nav.homeIcon) ? 'Custom upload' : this.t.nav.homeIcon) : 'Default' });
    }
    const barStyle = this.t.navStyle || 'floating';
    out.push({ key: 'navBarStyle', icon: 'layers-outline', label: 'Nav bar style', value: this.navStyles.find((s) => s.id === barStyle)?.label || barStyle });
    return out;
  }

  /** The 4 genuinely per-page controls — independent state via t.intermediate.nav* / t.result.nav*. */
  private navPageOptions(page: 'intermediate' | 'result'): DeckOption[] {
    const out: DeckOption[] = [];
    const split = this.navSplitFor(page);
    out.push({ key: 'navSplit', icon: 'swap-horizontal-outline', label: 'Button layout', value: split ? 'Separate (independent)' : 'Grouped together' });
    if (!split) {
      const pos = this.navPositionFor(page);
      out.push({ key: 'navPosition', icon: 'locate-outline', label: 'Button position', value: this.navButtonPositions.find((p) => p.id === pos)?.label || pos });
    } else {
      const backPos = this.navBackPositionFor(page);
      out.push({ key: 'navBackPosition', icon: 'locate-outline', label: 'Back position', value: this.navPositionsFor(page, 'back').find((p) => p.id === backPos)?.label || backPos });
      const homePos = this.navHomePositionFor(page);
      out.push({ key: 'navHomePosition', icon: 'locate-outline', label: 'Home position', value: this.navPositionsFor(page, 'home').find((p) => p.id === homePos)?.label || homePos });
    }
    return out;
  }

  /** Full 15-row Navigation buttons category for a given step's page — the 11 t.nav-backed
   *  options are byte-for-byte identical whichever page calls this (same getter, same object). */
  navOptions(page: 'intermediate' | 'result'): DeckOption[] {
    return [...this.navSharedOptions, ...this.navPageOptions(page)];
  }

  // ----- Intermediate colors step -----
  intColorsActiveChip = 0;
  intColorsActivePill = 0;
  intColorsSettingsOpen = false;

  private get intColorsHeaderOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.intermediate.showHeader) {
      out.push({ key: 'interHeaderColor', icon: 'color-palette-outline', label: 'Header background', value: this.t.intermediate.headerColor, swatch: this.t.intermediate.headerColor });
      const htc = this.t.intermediate.headerTextColor || '#FFFFFF';
      out.push({ key: 'interHeaderTextColor', icon: 'text-outline', label: 'Header text color', value: htc, swatch: htc });
    }
    return out;
  }

  private get intColorsBackgroundOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const v = this.t.intermediate.backgroundImage && this.t.intermediateStyle === 'finder-select' ? 'transparent' : this.t.intermediate.background;
    out.push({ key: 'interBackground', icon: 'image-outline', label: 'Page background', value: v, swatch: v !== 'transparent' ? v : undefined });
    out.push({ key: 'interBackgroundImage', icon: 'cloud-upload-outline', label: 'Background image', value: this.t.intermediate.backgroundImage ? 'Image set' : 'None' });
    if (this.t.intermediate.backgroundImage) {
      out.push({ key: 'interBgImageX', icon: 'resize-outline', label: 'Pan X', value: `${this.t.intermediate.bgImageX ?? 50}%` });
      out.push({ key: 'interBgImageY', icon: 'resize-outline', label: 'Pan Y', value: `${this.t.intermediate.bgImageY ?? 50}%` });
      out.push({ key: 'interBgImageZoom', icon: 'expand-outline', label: 'Zoom', value: `${this.t.intermediate.bgImageZoom ?? 100}%` });
    }
    return out;
  }

  private get intColorsCardOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.showInterCardBackgroundColor) out.push({ key: 'interCardBackground', icon: 'square-outline', label: 'Row / card background', value: this.t.intermediate.cardBackground, swatch: this.t.intermediate.cardBackground });
    if (this.showInterCardTextColor) out.push({ key: 'interCardText', icon: 'text-outline', label: 'Card text', value: this.t.intermediate.cardText, swatch: this.t.intermediate.cardText });
    if (this.t.intermediateStyle === 'finder-select') {
      const hero = this.t.intermediate.heroColor || '#172033';
      out.push({ key: 'interHeroColor', icon: 'albums-outline', label: 'Hero panel', value: hero, swatch: hero });
      const ov = this.t.overlayColor || 'rgba(0,0,0,0.6)';
      out.push({ key: 'interOverlayColor', icon: 'contrast-outline', label: 'Text overlay', value: ov, swatch: ov });
    }
    if (this.t.intermediateStyle === 'brand-rail') {
      const bg = this.t.intermediate.brandRailMessageBgColor || 'rgba(0,0,0,0.35)';
      out.push({ key: 'brandRailMessageBgColor', icon: 'chatbox-outline', label: 'Message background', value: bg, swatch: bg });
      const txt = this.t.intermediate.brandRailMessageTextColor || '#ffffff';
      out.push({ key: 'brandRailMessageTextColor', icon: 'text-outline', label: 'Message text color', value: txt, swatch: txt });
    }
    return out;
  }

  private get intColorsAccentOptions(): DeckOption[] {
    return [{ key: 'interAccent', icon: 'color-palette-outline', label: 'Accent / active', value: this.t.intermediate.accent, swatch: this.t.intermediate.accent }];
  }

  get intColorsCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'header', icon: 'menu-outline', label: 'Header', options: this.intColorsHeaderOptions },
      { key: 'background', icon: 'image-outline', label: 'Background', options: this.intColorsBackgroundOptions },
      { key: 'cards', icon: 'albums-outline', label: 'Cards', options: this.intColorsCardOptions },
      { key: 'accent', icon: 'color-palette-outline', label: 'Accent', options: this.intColorsAccentOptions },
      // Whole nav block is conditional on `t.intermediateStyle !== 'finder-select'` — identical to the original template's guard.
      { key: 'nav', icon: 'navigate-outline', label: 'Navigation', options: this.t.intermediateStyle !== 'finder-select' ? this.navOptions('intermediate') : [] },
    ].filter((c) => c.options.length > 0);
  }
  get intColorsActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.intColorsCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.intColorsActiveChip, cats.length - 1)];
  }
  get intColorsChipsInput(): NtDeckChip[] { return this.intColorsCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get intColorsPillsInput(): NtValuePill[] {
    return (this.intColorsActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get intColorsActiveOption(): DeckOption | undefined {
    const opts = this.intColorsActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.intColorsActivePill, opts.length - 1)];
  }
  get intColorsActivePillKey(): string { return this.intColorsActiveOption?.key || ''; }
  get intColorsActivePillLabel(): string { return (this.intColorsActiveOption?.label || '').toUpperCase(); }
  get intColorsSettingsGroups(): NtSettingsGroup[] {
    return this.intColorsCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onIntColorsChipChange(i: number): void { this.intColorsActiveChip = i; this.intColorsActivePill = 0; }
  onIntColorsRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.intColorsActiveChip = sel.groupIndex;
    this.intColorsActivePill = sel.rowIndex;
  }

  // ----- Result colors step -----
  resColorsActiveChip = 0;
  resColorsActivePill = 0;
  resColorsSettingsOpen = false;

  private get resColorsHeaderOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.resultTemplate !== 'promo-map-rank' && this.t.resultTemplate !== 'finder-detail') {
      out.push({ key: 'resHeaderColor', icon: 'color-palette-outline', label: 'Header', value: this.t.result.headerColor, swatch: this.t.result.headerColor !== this.resultTransparentHeaderColor ? this.t.result.headerColor : undefined });
    }
    if (this.t.resultTemplate !== 'finder-detail') {
      out.push({ key: 'resHeaderBar', icon: 'menu-outline', label: 'Header bar', value: this.t.result.showHeader ? 'Show' : 'Hide' });
      if (this.t.result.showHeader) {
        out.push({ key: 'resHeaderTracklist', icon: 'list-outline', label: 'Header tracklist', value: this.t.result.showTracklist !== false ? 'Show' : 'Hide' });
      }
    }
    return out;
  }

  private get resColorsBackgroundOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.resultTemplate !== 'promo-map-rank') {
      if (!this.t.result.backgroundImage) {
        out.push({ key: 'resBackground', icon: 'image-outline', label: 'Page background', value: this.t.result.background, swatch: this.t.result.background });
      }
      out.push({ key: 'resBackgroundImage', icon: 'cloud-upload-outline', label: 'Background image', value: this.t.result.backgroundImage ? 'Image set' : 'None' });
    }
    return out;
  }

  private get resColorsCardOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.resultTemplate !== 'finder-detail' && this.t.resultTemplate !== 'hero-product') {
      out.push({ key: 'resCardBackground', icon: 'square-outline', label: 'Product card background', value: this.t.result.cardBackground, swatch: this.t.result.cardBackground });
    }
    if (this.t.resultTemplate !== 'hero-product' && this.t.resultTemplate !== 'finder-detail') {
      out.push({ key: 'resCardText', icon: 'text-outline', label: 'Card text', value: this.t.result.cardText, swatch: this.t.result.cardText });
    }
    if (this.t.resultTemplate === 'map-list') {
      const v = this.t.result.popularText || this.t.result.cardText;
      out.push({ key: 'resPopularText', icon: 'star-outline', label: 'Popular button text', value: v, swatch: v });
    }
    return out;
  }

  private get resColorsTemplateOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.resultTemplate === 'finder-detail') {
      const find = this.t.result.findColor || '#2f006d';
      out.push({ key: 'resFindColor', icon: 'search-outline', label: 'Find button', value: find, swatch: find });
      const listBg = this.t.result.listBg || '#ffffff';
      out.push({ key: 'resListBg', icon: 'list-outline', label: 'List background', value: listBg, swatch: listBg });
      const cardBg = this.t.result.cardBg || '#ffffff';
      out.push({ key: 'resCardBg', icon: 'square-outline', label: 'Product / detail card', value: cardBg, swatch: cardBg });
      const cardTextColor = this.t.result.cardTextColor || '#0F172A';
      out.push({ key: 'resCardTextColor', icon: 'text-outline', label: 'Card text', value: cardTextColor, swatch: cardTextColor });
    }
    // promo-map-rank is a legacy value with no selectable tile in the picker (see inventory note 3)
    // — still fully editable here for any theme that already has it saved.
    if (this.t.resultTemplate === 'promo-map-rank') {
      const panel = this.t.result.panelColor || '#001973';
      out.push({ key: 'resPanelColor', icon: 'albums-outline', label: 'Promo panel', value: panel, swatch: panel });
      const rail = this.t.result.railBg || 'transparent';
      out.push({ key: 'resRailBg', icon: 'reorder-three-outline', label: 'Category rail', value: rail, swatch: rail !== 'transparent' ? rail : undefined });
      const subPanel = this.t.result.subPanelColor || '#0f172a';
      out.push({ key: 'resSubPanelColor', icon: 'square-outline', label: 'Sub-category panel', value: subPanel, swatch: subPanel });
      const secText = this.t.result.secondaryTextColor || '#ffffff';
      out.push({ key: 'resSecondaryTextColor', icon: 'text-outline', label: 'Sub-category text', value: secText, swatch: secText });
      const pin = this.t.result.pinColor || '#7f77dd';
      out.push({ key: 'resPinColor', icon: 'location-outline', label: 'Map pin', value: pin, swatch: pin });
      const dot = this.t.result.dotColor || '#e24b4a';
      out.push({ key: 'resDotColor', icon: 'ellipse-outline', label: 'Location dots', value: dot, swatch: dot });
      const mapBg = this.t.result.mapBg || '#ffffff';
      out.push({ key: 'resMapBg', icon: 'map-outline', label: 'Map area', value: mapBg, swatch: mapBg });
    }
    return out;
  }

  private get resColorsAccentOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.resultTemplate !== 'promo-map-rank' && this.t.resultTemplate !== 'hero-product') {
      out.push({ key: 'resAccent', icon: 'color-palette-outline', label: 'Accent / highlight', value: this.t.result.accent, swatch: this.t.result.accent });
    }
    return out;
  }

  get resColorsCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'header', icon: 'menu-outline', label: 'Header', options: this.resColorsHeaderOptions },
      { key: 'background', icon: 'image-outline', label: 'Background', options: this.resColorsBackgroundOptions },
      { key: 'cards', icon: 'albums-outline', label: 'Cards', options: this.resColorsCardOptions },
      { key: 'template', icon: 'options-outline', label: 'Template', options: this.resColorsTemplateOptions },
      { key: 'accent', icon: 'color-palette-outline', label: 'Accent', options: this.resColorsAccentOptions },
      // Navigation block is unconditional on this step (unlike Intermediate colors) — same as the original template.
      { key: 'nav', icon: 'navigate-outline', label: 'Navigation', options: this.navOptions('result') },
    ].filter((c) => c.options.length > 0);
  }
  get resColorsActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.resColorsCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.resColorsActiveChip, cats.length - 1)];
  }
  get resColorsChipsInput(): NtDeckChip[] { return this.resColorsCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get resColorsPillsInput(): NtValuePill[] {
    return (this.resColorsActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get resColorsActiveOption(): DeckOption | undefined {
    const opts = this.resColorsActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.resColorsActivePill, opts.length - 1)];
  }
  get resColorsActivePillKey(): string { return this.resColorsActiveOption?.key || ''; }
  get resColorsActivePillLabel(): string { return (this.resColorsActiveOption?.label || '').toUpperCase(); }
  get resColorsSettingsGroups(): NtSettingsGroup[] {
    return this.resColorsCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onResColorsChipChange(i: number): void { this.resColorsActiveChip = i; this.resColorsActivePill = 0; }
  onResColorsRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.resColorsActiveChip = sel.groupIndex;
    this.resColorsActivePill = sel.rowIndex;
  }

  // ----- Result template step (phase 3e) -----
  // Chips: Template / Promotion (promo-map-rank only) / Sorting & filters (finder-detail's Sort
  // tabs + SALE badge, map-filter-list's Filter position) / Card layout (Card content / shape /
  // text position / Overflow scrolling). Category names taken from the step's `.step-title.sm`
  // labels per the redesign prompt. The two multi-toggle rows (Promotion panel's 5 toggles,
  // finder-detail's Sort tabs multi-select) each stay ONE pill/settings-sheet row — same as the
  // original inventory's "counted as 1 row" guidance — with a value summarizing which sub-options
  // are currently on; the editor-card still renders all sub-toggles for that one pill.
  resTemplateActiveChip = 0;
  resTemplateActivePill = 0;
  resTemplateSettingsOpen = false;

  /** Summarizes the 5 promo-map-rank panel toggles for the pill/sheet-row face. */
  get resPromoToggleSummary(): string {
    const items: { label: string; on: boolean }[] = [
      { label: 'Timer', on: !!this.t.result.showTimer },
      { label: 'Bell', on: !!this.t.result.showBell },
      { label: 'Ranks', on: this.t.result.showRanks !== false },
      { label: 'Sort tabs', on: this.t.result.showSortTabs !== false },
      { label: 'Zone', on: this.t.result.showZone !== false },
    ];
    const on = items.filter((i) => i.on).map((i) => i.label);
    return on.length ? on.join(', ') : 'All hidden';
  }

  /** Summarizes the finder-detail sort-tab multi-select for the pill/sheet-row face. */
  get resSortTabsSummary(): string {
    const on = this.finderSortOpts.filter((s) => this.hasSortTab(s.id)).map((s) => s.label);
    return on.length ? on.join(', ') : 'None';
  }

  private get resTemplatePickOptions(): DeckOption[] {
    return [{ key: 'resTemplatePick', icon: 'grid-outline', label: 'Template', value: this.tplLabel(this.t.resultTemplate) }];
  }

  private get resPromotionOptions(): DeckOption[] {
    if (this.t.resultTemplate !== 'promo-map-rank') return [];
    return [{ key: 'resPromoToggles', icon: 'megaphone-outline', label: 'Promotion panel', value: this.resPromoToggleSummary }];
  }

  private get resSortingFilterOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.t.resultTemplate === 'finder-detail') {
      out.push({ key: 'resSortTabs', icon: 'swap-vertical-outline', label: 'Sort tabs', value: this.resSortTabsSummary });
      out.push({ key: 'resSaleBadge', icon: 'pricetag-outline', label: 'SALE badge', value: this.t.result.showSaleBadge !== false ? 'On' : 'Off' });
    }
    if (this.t.resultTemplate === 'map-filter-list') {
      const pos = this.t.result.filterPos || 'center';
      out.push({ key: 'resFilterPos', icon: 'funnel-outline', label: 'Filter position', value: this.filterPositions.find((p) => p.id === pos)?.label || this.capitalize(pos) });
    }
    return out;
  }

  private get resCardLayoutOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (this.resCardContentMatters) {
      const v = this.t.result.content || 'image-text';
      out.push({ key: 'resContent', icon: 'albums-outline', label: 'Card content', value: this.resultContents.find((c) => c.id === v)?.label || v });
    }
    if (this.resShapeMatters && (this.t.result.content || 'image-text') === 'image-text') {
      const v = this.t.result.cardShape;
      out.push({ key: 'resCardShape', icon: 'square-outline', label: 'Card shape', value: v ? (this.resShapesFor.find((s) => s.id === v)?.label || v) : 'Default' });
    }
    if (this.resTextPosMatters && (this.t.result.content || 'image-text') === 'image-text') {
      const v = this.t.result.textPos || 'below';
      out.push({ key: 'resTextPos', icon: 'text-outline', label: 'Text position', value: this.cardTextPositions.find((p) => p.id === v)?.label || v });
    }
    if (this.resOverflowMatters) {
      out.push({ key: 'resScrollMode', icon: 'swap-horizontal-outline', label: 'Overflow scrolling', value: this.capitalize(this.effectiveResultScrollMode) });
    }
    return out;
  }

  get resTemplateCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'template', icon: 'grid-outline', label: 'Template', options: this.resTemplatePickOptions },
      { key: 'promotion', icon: 'megaphone-outline', label: 'Promotion', options: this.resPromotionOptions },
      { key: 'sortingFilters', icon: 'funnel-outline', label: 'Sorting & filters', options: this.resSortingFilterOptions },
      { key: 'cardLayout', icon: 'square-outline', label: 'Card layout', options: this.resCardLayoutOptions },
    ].filter((c) => c.options.length > 0);
  }
  get resTemplateActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.resTemplateCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.resTemplateActiveChip, cats.length - 1)];
  }
  get resTemplateChipsInput(): NtDeckChip[] { return this.resTemplateCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get resTemplatePillsInput(): NtValuePill[] {
    return (this.resTemplateActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get resTemplateActiveOption(): DeckOption | undefined {
    const opts = this.resTemplateActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.resTemplateActivePill, opts.length - 1)];
  }
  get resTemplateActivePillKey(): string { return this.resTemplateActiveOption?.key || ''; }
  get resTemplateActivePillLabel(): string { return (this.resTemplateActiveOption?.label || '').toUpperCase(); }
  get resTemplateSettingsGroups(): NtSettingsGroup[] {
    return this.resTemplateCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onResTemplateChipChange(i: number): void { this.resTemplateActiveChip = i; this.resTemplateActivePill = 0; }
  onResTemplateRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.resTemplateActiveChip = sel.groupIndex;
    this.resTemplateActivePill = sel.rowIndex;
  }

  // ----- Animations & loader step (phase 3f) -----
  // Chips: Transition (Page transition + Speed) / Loader (Loader style + Loader color) — the
  // step's two `.step-title.sm` groupings. The "▶ Preview" replay buttons are action buttons
  // rendered inside the relevant editor-card (Page transition / Loader style) alongside their
  // tile-group, not pills of their own — they replay the same demo the original inline buttons
  // triggered (`replayTransition()` / `replayLoader()`), unchanged.
  animActiveChip = 0;
  animActivePill = 0;
  animSettingsOpen = false;

  transitionLabels: Partial<Record<TransitionType, string>> = {
    'fade-slide': 'Fade + slide', 'scale-up': 'Scale up', 'slide-left': 'Slide left', 'shimmer': 'Shimmer', 'none': 'None',
  };
  transitionLabel(s: TransitionType): string { return this.transitionLabels[s] || s; }
  loaderLabels: Partial<Record<LoaderStyle, string>> = {
    'spinner': 'Spinner', 'dot-pulse': 'Dot pulse', 'progress': 'Progress bar', 'logo': 'Logo', 'skeleton': 'Skeleton',
  };
  loaderLabel(s: LoaderStyle): string { return this.loaderLabels[s] || s; }

  private get animTransitionOptions(): DeckOption[] {
    return [
      { key: 'transitionPick', icon: 'swap-horizontal-outline', label: 'Page transition', value: this.transitionLabel(this.t.animation.transition) },
      { key: 'speed', icon: 'speedometer-outline', label: 'Speed', value: this.capitalize(this.t.animation.speed) },
    ];
  }
  private get animLoaderOptions(): DeckOption[] {
    return [
      { key: 'loaderStyle', icon: 'sync-outline', label: 'Loader style', value: this.loaderLabel(this.t.loader.style) },
      { key: 'loaderColor', icon: 'color-palette-outline', label: 'Loader color', value: this.t.loader.color, swatch: this.t.loader.color },
    ];
  }
  get animCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'transition', icon: 'swap-horizontal-outline', label: 'Transition', options: this.animTransitionOptions },
      { key: 'loader', icon: 'sync-outline', label: 'Loader', options: this.animLoaderOptions },
    ].filter((c) => c.options.length > 0);
  }
  get animActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.animCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.animActiveChip, cats.length - 1)];
  }
  get animChipsInput(): NtDeckChip[] { return this.animCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get animPillsInput(): NtValuePill[] {
    return (this.animActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get animActiveOption(): DeckOption | undefined {
    const opts = this.animActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.animActivePill, opts.length - 1)];
  }
  get animActivePillKey(): string { return this.animActiveOption?.key || ''; }
  get animActivePillLabel(): string { return (this.animActiveOption?.label || '').toUpperCase(); }
  get animSettingsGroups(): NtSettingsGroup[] {
    return this.animCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onAnimChipChange(i: number): void { this.animActiveChip = i; this.animActivePill = 0; }
  onAnimRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.animActiveChip = sel.groupIndex;
    this.animActivePill = sel.rowIndex;
  }

  // ----- Screensaver step (phase 3f) -----
  // Chips: Mode (Screensaver mode — no step-title.sm of its own, kept as its own chip since it's
  // semantically distinct from the overlay-styling controls) / Overlay content (Show/Hide toggle)
  // / Overlay text (Title, Subtitle, Text color, Box background — all fall under the step's
  // "Overlay text" sm heading, nothing new before "Overlay position") / Position (Overlay
  // position). The three overlay-related chips return no options (and so disappear, matching the
  // original *ngIf on the whole block) whenever `t.saverOverlay.showContent === false`.
  saverActiveChip = 0;
  saverActivePill = 0;
  saverSettingsOpen = false;

  saverModeLabels: Partial<Record<ScreensaverMode, string>> = {
    'slideshow': 'Slideshow', 'single-image': 'Single image', 'video': 'Video',
  };
  saverModeLabel(s: ScreensaverMode): string { return this.saverModeLabels[s] || s; }

  private get saverModeOptions(): DeckOption[] {
    return [{ key: 'saverMode', icon: 'images-outline', label: 'Screensaver mode', value: this.saverModeLabel(this.saverMode) }];
  }
  private get saverOverlayContentOptions(): DeckOption[] {
    return [{ key: 'saverOverlayContent', icon: 'eye-outline', label: 'Overlay content', value: this.t.saverOverlay?.showContent !== false ? 'Show' : 'Hide' }];
  }
  private get saverTextOptions(): DeckOption[] {
    if (this.t.saverOverlay?.showContent === false) return [];
    const textColor = this.t.saverOverlay?.textColor || '#FFFFFF';
    const bg = this.t.saverOverlay?.bgColor || 'transparent';
    return [
      { key: 'saverTitle', icon: 'text-outline', label: 'Title', value: this.t.saverOverlay?.title || 'Newton Touch' },
      { key: 'saverSubtitle', icon: 'chatbubble-outline', label: 'Subtitle / CTA', value: this.t.saverOverlay?.subtitle || 'Touch screen to begin' },
      { key: 'saverTextColor', icon: 'color-palette-outline', label: 'Text color', value: textColor, swatch: textColor },
      { key: 'saverBoxBg', icon: 'square-outline', label: 'Box background', value: bg, swatch: bg !== 'transparent' ? bg : undefined },
    ];
  }
  private get saverPositionOptions(): DeckOption[] {
    if (this.t.saverOverlay?.showContent === false) return [];
    const pos = this.t.saverOverlay?.position || 'center';
    return [{ key: 'saverPosition', icon: 'move-outline', label: 'Overlay position', value: this.saverPositions.find((p) => p.id === pos)?.label || this.capitalize(pos) }];
  }
  get saverCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'mode', icon: 'images-outline', label: 'Mode', options: this.saverModeOptions },
      { key: 'overlayContent', icon: 'eye-outline', label: 'Overlay content', options: this.saverOverlayContentOptions },
      { key: 'overlayText', icon: 'text-outline', label: 'Overlay text', options: this.saverTextOptions },
      { key: 'position', icon: 'move-outline', label: 'Position', options: this.saverPositionOptions },
    ].filter((c) => c.options.length > 0);
  }
  get saverActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.saverCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.saverActiveChip, cats.length - 1)];
  }
  get saverChipsInput(): NtDeckChip[] { return this.saverCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get saverPillsInput(): NtValuePill[] {
    return (this.saverActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get saverActiveOption(): DeckOption | undefined {
    const opts = this.saverActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.saverActivePill, opts.length - 1)];
  }
  get saverActivePillKey(): string { return this.saverActiveOption?.key || ''; }
  get saverActivePillLabel(): string { return (this.saverActiveOption?.label || '').toUpperCase(); }
  get saverSettingsGroups(): NtSettingsGroup[] {
    return this.saverCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onSaverChipChange(i: number): void { this.saverActiveChip = i; this.saverActivePill = 0; }
  onSaverRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.saverActiveChip = sel.groupIndex;
    this.saverActivePill = sel.rowIndex;
  }

  async cancel(): Promise<void> {
    // Unsaved edits → confirm before throwing them away.
    if (this.baseline && this.snapshot() !== this.baseline) {
      const alert = await this.alertController.create({
        header: 'Discard changes?',
        message: 'You have unsaved changes. If you leave now, your work on this theme will be lost.',
        buttons: [
          { text: 'Keep editing', role: 'cancel' },
          { text: 'Discard', role: 'destructive', handler: () => this.leave() },
        ],
      });
      await alert.present();
      return;
    }
    this.leave();
  }

  private leave(): void {
    if (this.openedFromPreview && this.id) {
      this.router.navigateByUrl('/theme-preview/' + (this.previewReturnId || this.id));
      return;
    }
    this.router.navigateByUrl('/tabs/themes');
  }
}
