import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar, IonFooter } from '@ionic/angular/standalone';
import { ColorPickerComponent } from '../shared/color-picker.component';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { ImagePickerService } from '../services/image-picker.service';
import { FONTS } from '../shared/fonts';
import type { ThemeTokens, HomeLayout, CardShape, CardContent, CardTextPos, IntermediateStyle, ResultTemplate, TransitionType, AnimSpeed, LoaderStyle, LogoPosition, TextScale, TextFit, HeaderStyle, CardSurface, NavStyle, NavButtonPosition, SaverOverlayPosition } from '@contract/layout';

type PreviewPage = 'home' | 'inter' | 'result' | 'saver';
interface Step { key: string; page: PreviewPage; }

/** Visual theme wizard. Live preview re-renders the selected layout/card/intermediate/result
 *  + colours. Steps for intermediate are hidden when intermediate is skipped. */
@Component({
  selector: 'app-theme-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerComponent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar, IonFooter],
  templateUrl: './theme-wizard.component.html',
  styleUrls: ['./theme-wizard.component.scss'],
})
export class ThemeWizardComponent implements OnInit {
  @ViewChild('wizardSteps') wizardSteps?: ElementRef<HTMLElement>;
  @ViewChild(IonContent) content?: IonContent;
  name = '';
  id: string | null = null;
  openedFromPreview = false;
  previewReturnId: string | null = null;
  t: ThemeTokens = ThemeService.defaultTokens();
  saverMode = 'slideshow';
  stepIndex = 0;

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
    anim: 'Motion',
    saver: 'Screensaver',
    review: 'Review',
  };

  slots = [0, 1, 2, 3, 4, 5];
  labels = ['Bakery', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Drinks'];

  homeLayouts: HomeLayout[] = ['grid-2x3', 'grid-2x2', 'col-2', 'col-3', 'col-4', 'hero-list', 'fullscreen', 'image-strip', 'hero-start', 'promo-categories', 'h-scroll', 'bento'];
  layoutLabels: Record<HomeLayout, string> = {
    'grid-2x3': 'Grid (3×2)', 'grid-2x2': 'Grid (2×2)', 'col-2': '2 columns', 'col-3': '3 columns', 'col-4': '4 columns',
    'hero-list': 'Hero + list', 'list': 'List rows', 'fullscreen': 'Fullscreen',
    'image-strip': 'Image strips', 'hero-start': 'Hero start', 'promo-categories': 'Promo categories',
    'h-scroll': 'Horizontal scroll', 'bento': 'Bento grid',
  };
  /** Independent card axes — any shape × any content × any text position. */
  cardShapes: { id: CardShape; label: string }[] = [
    { id: 'rect', label: 'Rectangle' }, { id: 'pill', label: 'Pill' }, { id: 'circle', label: 'Circle' }, { id: 'hexagon', label: 'Hexagon' },
  ];
  cardContents: { id: CardContent; label: string }[] = [
    { id: 'image-text', label: 'Image + Text' }, { id: 'image-only', label: 'Image only' }, { id: 'text-only', label: 'Text only' },
    { id: 'icon-text', label: 'Icon + Text' }, { id: 'color-block', label: 'Colour block + Text' }, { id: 'gradient', label: 'Gradient' },
  ];
  cardTextPositions: { id: CardTextPos; label: string }[] = [
    { id: 'overlay-top', label: 'Overlay top' }, { id: 'overlay-bottom', label: 'Overlay bottom' }, { id: 'below', label: 'Below' }, { id: 'center', label: 'Centered' },
  ];
  /** Text-position control only matters when the card shows both an image/icon AND text. */
  get showTextPos(): boolean { return this.t.cardContent === 'image-text' || this.t.cardContent === 'icon-text'; }

  /** Layouts where circle/hexagon shapes don't render well and are hidden.
   *  h-scroll DOES support all shapes (handled inside the rail), hero-list does NOT. */
  private readonly noShapeLayouts: HomeLayout[] = ['list', 'fullscreen', 'image-strip', 'hero-list', 'bento'];

  pickLayout(l: HomeLayout): void {
    this.t.homeLayout = l;
    // Auto-reset circle/hexagon when switching to shape-incompatible layouts
    if (this.noShapeLayouts.includes(l) &&
        (this.t.cardShape === 'circle' || this.t.cardShape === 'hexagon')) {
      this.t.cardShape = 'rect';
    }
  }

  /** Only show circle/hexagon shapes for layouts where they make visual sense. */
  get availableCardShapes(): { id: CardShape; label: string }[] {
    if (this.noShapeLayouts.includes(this.t.homeLayout)) {
      return this.cardShapes.filter(s => s.id !== 'circle' && s.id !== 'hexagon');
    }
    return this.cardShapes;
  }
  fonts = FONTS;
  textScales: TextScale[] = ['compact', 'normal', 'large'];
  textFits: { id: TextFit; label: string }[] = [
    { id: 'shrink', label: 'Auto-shrink' }, { id: 'wrap', label: 'Wrap 2 lines' }, { id: 'clip', label: 'Clip …' },
  ];
  intStyles: IntermediateStyle[] = ['pill-tabs', 'image-grid', 'hex-grid', 'circular', 'card-strip', 'fullscreen', 'center-tiles', 'side-rail', 'brand-grid', 'brand-rail', 'drill-stair'];
  intStyleLabels: Partial<Record<IntermediateStyle, string>> = {
    'pill-tabs': 'Pills', 'image-grid': 'Image grid', 'hex-grid': 'Hex grid', 'circular': 'Circular',
    'card-strip': 'Card strip', 'center-tiles': 'Center tiles',
    'side-rail': 'Side rail', 'brand-grid': 'Brand grid', 'brand-rail': 'Brand rail', 'drill-stair': 'Drill stair',
  };
  intStyleLabel(s: IntermediateStyle): string { return this.intStyleLabels[s] || s; }
  /** Card shape only affects intermediate styles that show a per-item image. */
  get intShapeMatters(): boolean {
    return ['image-grid', 'card-strip', 'side-rail', 'brand-grid', 'brand-rail'].includes(this.t.intermediateStyle);
  }
  resultTemplates: ResultTemplate[] = ['map-list', 'cards-map', 'dual-list', 'split-panel', 'list-only', 'map-full', 'card-grid', 'minimal', 'esl-focus', 'drill-stair', 'filter-list', 'map-filter-list', 'promo-list', 'catalog-grid', 'product-focus', 'hero-product', 'drill-filter'];
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
  navStyles: { id: NavStyle; label: string }[] = [
    { id: 'floating', label: 'Floating' },
    { id: 'edge', label: 'Edge buttons' },
    { id: 'bottom-center', label: 'Bottom center' },
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
    return ['h-scroll', 'promo-categories', 'col-2', 'col-3', 'col-4'].includes(this.t.homeLayout) || this.shapeCard;
  }
  navButtonPositions: { id: NavButtonPosition; label: string }[] = [
    { id: 'bottom-left',   label: 'Bottom left' },
    { id: 'bottom-center', label: 'Bottom center' },
    { id: 'bottom-right',  label: 'Bottom right' },
    { id: 'side-left',     label: 'Side left' },
    { id: 'side-right',    label: 'Side right' },
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

  bgPresets = ['linear-gradient(135deg,#2F006D,#001973)', '#0F172A', '#FFFFFF', '#1A0036', '#0A0A1A'];
  cardPresets = ['rgba(255,255,255,0.15)', '#FFFFFF', '#1E293B', '#F1F5F9'];
  textPresets = ['#FFFFFF', '#0F172A', '#FFCD00'];
  overlayPresets = ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)', 'rgba(255,255,255,0.6)', 'rgba(47,0,109,0.7)'];

  constructor(private themes: ThemeService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.id = this.route.snapshot.paramMap.get('id');
    this.openedFromPreview = this.route.snapshot.queryParamMap.get('from') === 'theme-preview';
    this.previewReturnId = this.route.snapshot.queryParamMap.get('returnTheme');
    if (this.id) {
      const existing = (await this.themes.list()).find((x) => x.id === this.id);
      if (existing) {
        this.name = existing.name;
        this.t = ThemeService.normalize(JSON.parse(JSON.stringify(existing.tokens)));
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
      : page === 'result' ? this.t.result.headerColor
      : this.t.headerColor;
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
    const theme: SavedTheme = { id: this.id ?? 'thm_' + Date.now(), name: this.name.trim(), tokens: this.t, updatedAt: Date.now() };
    await this.themes.save(theme);
    this.router.navigateByUrl('/tabs/themes');
  }

  cancel(): void {
    if (this.openedFromPreview && this.id) {
      this.router.navigateByUrl('/theme-preview/' + (this.previewReturnId || this.id));
      return;
    }
    this.router.navigateByUrl('/tabs/themes');
  }
}
