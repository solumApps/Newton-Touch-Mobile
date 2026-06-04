import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar } from '@ionic/angular/standalone';
import { ColorPickerComponent } from '../shared/color-picker.component';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { FONTS } from '../shared/fonts';
import type { ThemeTokens, HomeLayout, CardShape, CardContent, CardTextPos, IntermediateStyle, ResultTemplate, TransitionType, AnimSpeed, LoaderStyle, LogoPosition, TextScale, TextFit, HeaderStyle } from '@contract/layout';

type PreviewPage = 'home' | 'inter' | 'result' | 'saver';
interface Step { key: string; page: PreviewPage; }

/** Visual theme wizard. Live preview re-renders the selected layout/card/intermediate/result
 *  + colours. Steps for intermediate are hidden when intermediate is skipped. */
@Component({
  selector: 'app-theme-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerComponent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar],
  templateUrl: './theme-wizard.component.html',
  styleUrls: ['./theme-wizard.component.scss'],
})
export class ThemeWizardComponent implements OnInit {
  name = '';
  id: string | null = null;
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

  slots = [0, 1, 2, 3, 4, 5];
  labels = ['Bakery', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Drinks'];

  homeLayouts: HomeLayout[] = ['grid-2x3', 'grid-2x2', 'col-4', 'hero-list', 'list', 'fullscreen'];
  layoutLabels: Record<HomeLayout, string> = {
    'grid-2x3': 'Grid (3×2)', 'grid-2x2': 'Grid (2×2)', 'col-4': '4 columns',
    'hero-list': 'Hero + list', 'list': 'List rows', 'fullscreen': 'Fullscreen',
  };
  /** Independent card axes — any shape × any content × any text position. */
  cardShapes: { id: CardShape; label: string }[] = [
    { id: 'rect', label: 'Rectangle' }, { id: 'pill', label: 'Pill' }, { id: 'circle', label: 'Circle' }, { id: 'hexagon', label: 'Hexagon' },
  ];
  cardContents: { id: CardContent; label: string }[] = [
    { id: 'image-text', label: 'Image + Text' }, { id: 'image-only', label: 'Image only' }, { id: 'text-only', label: 'Text only' },
    { id: 'icon-text', label: 'Icon + Text' }, { id: 'color-block', label: 'Colour block' }, { id: 'gradient', label: 'Gradient' },
  ];
  cardTextPositions: { id: CardTextPos; label: string }[] = [
    { id: 'overlay-top', label: 'Overlay top' }, { id: 'overlay-bottom', label: 'Overlay bottom' }, { id: 'below', label: 'Below' }, { id: 'center', label: 'Centered' },
  ];
  /** Text-position control only matters when the card shows both an image/icon AND text. */
  get showTextPos(): boolean { return this.t.cardContent === 'image-text' || this.t.cardContent === 'icon-text'; }

  pickLayout(l: HomeLayout): void { this.t.homeLayout = l; }
  fonts = FONTS;
  textScales: TextScale[] = ['compact', 'normal', 'large'];
  textFits: { id: TextFit; label: string }[] = [
    { id: 'shrink', label: 'Auto-shrink' }, { id: 'wrap', label: 'Wrap 2 lines' }, { id: 'clip', label: 'Clip …' },
  ];
  intStyles: IntermediateStyle[] = ['accordion', 'pill-tabs', 'image-grid', 'hex-grid', 'circular', 'scroll-list', 'card-strip', 'fullscreen', 'drill-stair'];
  resultTemplates: ResultTemplate[] = ['map-list', 'cards-map', 'dual-list', 'split-panel', 'list-only', 'map-full', 'card-grid', 'minimal', 'esl-focus', 'drill-stair'];
  transitions: TransitionType[] = ['fade-slide', 'scale-up', 'slide-left', 'shimmer', 'none'];
  speeds: AnimSpeed[] = ['slow', 'normal', 'fast'];
  loaders: LoaderStyle[] = ['spinner', 'dot-pulse', 'progress', 'logo', 'skeleton'];
  logoPositions: LogoPosition[] = ['left', 'center', 'right'];
  headerStyles: { id: HeaderStyle; label: string }[] = [
    { id: 'logo-only', label: 'Logo only' },
    { id: 'title-only', label: 'Title only' },
    { id: 'title+caption', label: 'Title + Caption' },
    { id: 'logo+title+caption', label: 'Logo + Title + Caption' },
  ];
  sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
  pathStyles: Array<'dashed' | 'solid' | 'dotted' | 'animated'> = ['dashed', 'solid', 'dotted', 'animated'];
  saverModes = ['slideshow', 'single-image', 'video'];

  bgPresets = ['linear-gradient(135deg,#2F006D,#001973)', '#0F172A', '#FFFFFF', '#1A0036', '#0A0A1A'];
  cardPresets = ['rgba(255,255,255,0.15)', '#FFFFFF', '#1E293B', '#F1F5F9'];
  textPresets = ['#FFFFFF', '#0F172A', '#FFCD00'];

  constructor(private themes: ThemeService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.id = this.route.snapshot.paramMap.get('id');
    if (this.id) {
      const existing = (await this.themes.list()).find((x) => x.id === this.id);
      if (existing) { this.name = existing.name; this.t = ThemeService.normalize(JSON.parse(JSON.stringify(existing.tokens))); }
    }
  }

  /** Steps actually shown (intermediate steps drop out when skipped). */
  get visibleSteps(): Step[] {
    return this.allSteps.filter((s) => this.t.includeIntermediate || (s.key !== 'intStyle' && s.key !== 'intColors'));
  }
  get step(): Step { return this.visibleSteps[this.stepIndex] ?? this.visibleSteps[0]; }
  get previewPage(): PreviewPage { return this.step.page; }

  /** color-block / gradient content paints with the accent instead of card bg. */
  cardBg(): string {
    if (this.t.cardContent === 'color-block') return this.t.accent;
    if (this.t.cardContent === 'gradient') return `linear-gradient(135deg, ${this.t.accent}, ${this.t.cardBackground})`;
    return this.t.cardBackground;
  }
  get shapeCard(): boolean { return this.t.cardShape === 'circle' || this.t.cardShape === 'hexagon'; }

  get scaleNum(): number { return this.t.typography.textScale === 'compact' ? 0.9 : this.t.typography.textScale === 'large' ? 1.14 : 1; }

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
  pageCaption(page: PreviewPage): string {
    return page === 'inter' ? 'Intermediate' : page === 'result' ? 'Result' : page === 'saver' ? 'Screensaver' : 'Home';
  }

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

  next(): void {
    if (this.stepIndex < this.visibleSteps.length - 1) this.stepIndex++;
    if (this.step.key === 'anim') this.replayTransition();
  }
  prev(): void {
    if (this.stepIndex > 0) this.stepIndex--;
    if (this.step.key === 'anim') this.replayTransition();
  }

  canSave(): boolean { return !!this.name.trim(); }

  async save(): Promise<void> {
    if (!this.canSave()) { this.stepIndex = this.visibleSteps.length - 1; return; }
    const theme: SavedTheme = { id: this.id ?? 'thm_' + Date.now(), name: this.name.trim(), tokens: this.t, updatedAt: Date.now() };
    await this.themes.save(theme);
    this.router.navigateByUrl('/tabs/themes');
  }

  cancel(): void { this.router.navigateByUrl('/tabs/themes'); }
}
