import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter } from '@ionic/angular/standalone';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { ContentService, ContentDraft } from '../services/content.service';
import { SelectFieldComponent, SelectOption } from '../shared/select-field.component';
import type { AppMode } from '@contract/layout';

/** CC-1 (theme) + CC-2 (mode) + name → create draft → builder. Name auto-defaults so
 *  Continue is never silently blocked once theme + mode are chosen. */
@Component({
  selector: 'app-content-create',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, SelectFieldComponent],
  templateUrl: './content-create.component.html',
  styleUrls: ['./content-create.component.scss'],
})
export class ContentCreateComponent implements OnInit {
  /** Sentinel theme id for the media-only flow (single image/video, no app type). */
  static readonly MEDIA_THEME_ID = '__media__';
  static readonly CANVAS_THEME_ID = '__custom_canvas__';
  static readonly PRODUCT_PROMO_THEME_ID = '__product_promo__';
  name = '';
  nameError = '';
  themeId = '';
  themeLockedFromPreview = false;
  mode: AppMode = 'category';
  themes: SavedTheme[] = [];

  modes: { id: AppMode; nm: string; ds: string }[] = [
    { id: 'category', nm: 'Category', ds: 'Live API products + uploaded images.' },
    { id: 'prototype', nm: 'Prototype', ds: 'Fully static — build every card by hand.' },
    { id: 'prototype-esl', nm: 'Prototype + ESL', ds: 'Static content plus an ESL tag blink at the Result page.' },
  ];

  constructor(private themeSvc: ThemeService, private content: ContentService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.refreshThemes();
    const pre = this.route.snapshot.queryParamMap.get('theme');
    if (pre && this.themes.some((t) => t.id === pre)) {
      this.themeId = pre;
      this.themeLockedFromPreview = this.route.snapshot.queryParamMap.get('from') === 'theme-preview';
    }
  }
  /** Ionic page reuse: re-read user themes whenever this page becomes active so
   *  freshly-saved themes show up without an app refresh. */
  async ionViewWillEnter(): Promise<void> { await this.refreshThemes(); }

  private async refreshThemes(): Promise<void> {
    this.themes = [...ThemeService.predefined(), ...(await this.themeSvc.list())];
  }

  /** True when a special no-theme editor is selected — hides the app-type step. */
  get isMedia(): boolean { return this.themeId === ContentCreateComponent.MEDIA_THEME_ID; }
  get isCustomCanvas(): boolean { return this.themeId === ContentCreateComponent.CANVAS_THEME_ID; }
  get isProductPromo(): boolean { return this.themeId === ContentCreateComponent.PRODUCT_PROMO_THEME_ID; }
  get isSpecialLayout(): boolean { return this.isMedia || this.isCustomCanvas || this.isProductPromo; }

  get themeOpts(): SelectOption[] {
    const media: SelectOption = { value: ContentCreateComponent.MEDIA_THEME_ID, label: 'Upload Media (Image/Video)', sub: 'Play a single image or video full-screen — no app type needed' };
    const canvas: SelectOption = { value: ContentCreateComponent.CANVAS_THEME_ID, label: 'Custom Layout Canvas', sub: 'Design a freeform 1920 × 540 LCD screen with images, video, text and shapes' };
    const promo: SelectOption = { value: ContentCreateComponent.PRODUCT_PROMO_THEME_ID, label: 'Product Promo', sub: 'Guided product hero screen with product media and promotional text' };
    return [media, canvas, promo, ...this.themes.map((t) => {
      const badge = t.predefined ? '★ Predefined' : '✎ My theme';
      return { value: t.id, label: t.name, sub: `${badge} · ${t.tokens.homeLayout} · ${t.tokens.cardShape} ${t.tokens.cardContent}` };
    })];
  }
  get modeOpts(): SelectOption[] { return this.modes.map((m) => ({ value: m.id, label: m.nm, sub: m.ds })); }
  get selectedTheme(): SavedTheme | undefined { return this.themes.find((t) => t.id === this.themeId); }
  get selectedMode() { return this.modes.find((m) => m.id === this.mode); }
  get pageTitle(): string { return this.themeLockedFromPreview ? 'Content' : 'New Content'; }
  get themeSelectLabel(): string { return this.themeLockedFromPreview ? 'Selected theme' : 'Step 1 · Select theme'; }
  get backLabel(): string { return this.themeLockedFromPreview ? 'Back' : 'Cancel'; }

  async next(): Promise<void> {
    // Special no-theme flows skip app-type selection and go straight to their editor.
    if (this.isSpecialLayout) {
      const name = this.name.trim() || (this.isMedia ? 'Media content' : this.isProductPromo ? 'Product promo' : 'Custom canvas');
      if (await this.content.nameExists(name)) {
        this.nameError = `Content named “${name}” already exists. Please choose a different name.`;
        return;
      }
      const appMode: AppMode = this.isMedia ? 'media' : this.isProductPromo ? 'product-promo' : 'custom-canvas';
      this.nameError = '';
      const draft: ContentDraft = {
        id: 'cnt_' + Date.now(),
        name,
        themeId: this.themeId,
        themeName: this.isMedia ? 'Upload Media' : this.isProductPromo ? 'Product Promo' : 'Custom Layout Canvas',
        themeTokens: ThemeService.defaultTokens(),
        appMode,
        home: [],
        intermediate: [],
        result: { products: [] },
        screensaver: { mode: 'slideshow', media: [], secondsPerSlide: 5, loop: true, idleTimeoutSec: 60, ctaText: 'Touch screen to begin' },
        status: 'draft',
        updatedAt: Date.now(),
      };
      if (appMode === 'custom-canvas') draft.customCanvas = { background: '#0A0A1A', elements: [] };
      if (appMode === 'product-promo') draft.productPromo = { preset: 'product-only', background: 'linear-gradient(135deg,#2F006D,#001973)', elements: [] };
      await this.content.save(draft);
      this.router.navigateByUrl(appMode === 'media' ? '/content-media/' + draft.id : '/content-canvas/' + draft.id);
      return;
    }
    const theme = this.selectedTheme;
    if (!theme || !this.mode) return;
    const name = this.name.trim() || `${theme.name} content`;
    // Reject a name already used by another content draft (case-insensitive).
    if (await this.content.nameExists(name)) {
      this.nameError = `Content named “${name}” already exists. Please choose a different name.`;
      return;
    }
    this.nameError = '';
    const screensaverMode = theme.tokens.screensaver?.mode ?? 'slideshow';
    const draft: ContentDraft = {
      id: 'cnt_' + Date.now(),
      name,
      themeId: theme.id,
      themeName: theme.name,
      themeTokens: theme.tokens,
      appMode: this.mode,
      drillMode: theme.tokens.resultTemplate === 'drill-filter' ? 'individual' : undefined,
      home: [],
      intermediate: [],
      result: { products: [] },
      screensaver: { mode: screensaverMode, media: [], secondsPerSlide: 5, loop: true, idleTimeoutSec: 60, ctaText: 'Touch screen to begin' },
      status: 'draft',
      updatedAt: Date.now(),
    };
    await this.content.save(draft);
    this.router.navigateByUrl('/content-builder/' + draft.id);
  }

  cancel(): void {
    if (this.themeLockedFromPreview && this.themeId) {
      this.router.navigateByUrl('/theme-preview/' + this.themeId);
      return;
    }
    this.router.navigateByUrl('/tabs/content');
  }
}
