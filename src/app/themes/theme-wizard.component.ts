import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonProgressBar } from '@ionic/angular/standalone';
import { ColorPickerComponent } from '../shared/color-picker.component';
import { ThemeService, SavedTheme } from '../services/theme.service';
import type { ThemeTokens, HomeLayout, CardStyle, IntermediateStyle, ResultTemplate, TransitionType, AnimSpeed, LoaderStyle, LogoPosition } from '@contract/layout';

type PreviewPage = 'home' | 'inter' | 'result';
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
    { key: 'card', page: 'home' },
    { key: 'colors', page: 'home' },
    { key: 'intStyle', page: 'inter' },
    { key: 'intColors', page: 'inter' },
    { key: 'resTemplate', page: 'result' },
    { key: 'resColors', page: 'result' },
    { key: 'anim', page: 'home' },
    { key: 'saver', page: 'home' },
    { key: 'review', page: 'home' },
  ];

  slots = [0, 1, 2, 3, 4, 5];
  labels = ['Bakery', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Drinks'];

  homeLayouts: HomeLayout[] = ['grid-2x3', 'hero-list', 'grid-2x2', 'col-4', 'hexagonal', 'circular', 'pill-row', 'fullscreen'];
  cardStyles: CardStyle[] = ['image-text', 'text-rect', 'pill', 'hexagon', 'image-only', 'circle', 'icon-text', 'color-block', 'gradient', 'list-row'];
  intStyles: IntermediateStyle[] = ['accordion', 'pill-tabs', 'image-grid', 'hex-grid', 'circular', 'scroll-list', 'card-strip', 'fullscreen'];
  resultTemplates: ResultTemplate[] = ['map-list', 'cards-map', 'dual-list', 'split-panel', 'list-only', 'map-full', 'card-grid', 'minimal', 'esl-focus'];
  transitions: TransitionType[] = ['fade-slide', 'scale-up', 'slide-left', 'shimmer', 'none'];
  speeds: AnimSpeed[] = ['slow', 'normal', 'fast'];
  loaders: LoaderStyle[] = ['spinner', 'dot-pulse', 'progress', 'logo', 'skeleton'];
  logoPositions: LogoPosition[] = ['left', 'center', 'right'];
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
      if (existing) { this.name = existing.name; this.t = JSON.parse(JSON.stringify(existing.tokens)); }
    }
  }

  /** Steps actually shown (intermediate steps drop out when skipped). */
  get visibleSteps(): Step[] {
    return this.allSteps.filter((s) => this.t.includeIntermediate || (s.key !== 'intStyle' && s.key !== 'intColors'));
  }
  get step(): Step { return this.visibleSteps[this.stepIndex] ?? this.visibleSteps[0]; }
  get previewPage(): PreviewPage { return this.step.page; }

  /** color-block / gradient cards paint with the accent instead of card bg. */
  cardBg(): string {
    if (this.t.cardStyle === 'color-block') return this.t.accent;
    if (this.t.cardStyle === 'gradient') return `linear-gradient(135deg, ${this.t.accent}, ${this.t.cardBackground})`;
    return this.t.cardBackground;
  }

  headerColorFor(): string {
    return this.previewPage === 'inter' ? this.t.intermediate.headerColor
      : this.previewPage === 'result' ? this.t.result.headerColor
      : this.t.headerColor;
  }

  next(): void { if (this.stepIndex < this.visibleSteps.length - 1) this.stepIndex++; }
  prev(): void { if (this.stepIndex > 0) this.stepIndex--; }

  canSave(): boolean { return !!this.name.trim(); }

  async save(): Promise<void> {
    if (!this.canSave()) { this.stepIndex = this.visibleSteps.length - 1; return; }
    const theme: SavedTheme = { id: this.id ?? 'thm_' + Date.now(), name: this.name.trim(), tokens: this.t, updatedAt: Date.now() };
    await this.themes.save(theme);
    this.router.navigateByUrl('/tabs/themes');
  }

  cancel(): void { this.router.navigateByUrl('/tabs/themes'); }
}
