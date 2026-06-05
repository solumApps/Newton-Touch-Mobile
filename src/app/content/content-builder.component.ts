import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { CategoryApiService, ApiProduct } from '../services/category-api.service';
import { WorkspaceService } from '../services/workspace.service';
import { ImagePickerService } from '../services/image-picker.service';
import { SelectFieldComponent, SelectOption } from '../shared/select-field.component';
import { CardTreeEditorComponent } from './card-tree-editor.component';
import { ContentPreviewStripComponent } from '../shared/content-preview-strip.component';
import type { ResultProduct, CardItem } from '@contract/layout';

type StepKey = 'home' | 'inter' | 'result' | 'saver' | 'review';
interface Step { key: StepKey; label: string; page: 'home' | 'inter' | 'result' | 'saver'; }

/**
 * Prototype / Prototype+ESL data entry + Category fetch/map. Add/remove home cards &
 * result products with per-item image upload; +ESL adds id mapping. Saves to the draft.
 */
@Component({
  selector: 'app-content-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, SelectFieldComponent, CardTreeEditorComponent, ContentPreviewStripComponent],
  templateUrl: './content-builder.component.html',
  styleUrls: ['./content-builder.component.scss'],
})
export class ContentBuilderComponent implements OnInit {
  @ViewChild('builderSteps') builderSteps?: ElementRef<HTMLElement>;
  draft?: ContentDraft;
  apiProducts: ApiProduct[] = [];
  selected = new Set<string>();
  fetchError = '';
  fetching = false;
  stepIndex = 0;

  private allSteps: Step[] = [
    { key: 'home',   label: 'Home',         page: 'home' },
    { key: 'inter',  label: 'Intermediate', page: 'inter' },
    { key: 'result', label: 'Result',       page: 'result' },
    { key: 'saver',  label: 'Screensaver',  page: 'saver' },
    { key: 'review', label: 'Review',       page: 'home' },
  ];

  /** Skip the Intermediate step when the theme has includeIntermediate=false. */
  get visibleSteps(): Step[] {
    return this.allSteps.filter(s => s.key !== 'inter' || this.draft?.themeTokens.includeIntermediate !== false);
  }
  get step(): Step { return this.visibleSteps[this.stepIndex] || this.visibleSteps[0]; }
  get isFirst(): boolean { return this.stepIndex <= 0; }
  get isLast(): boolean { return this.stepIndex >= this.visibleSteps.length - 1; }
  get progressPct(): number { return ((this.stepIndex + 1) / this.visibleSteps.length) * 100; }
  next(): void { if (!this.isLast) { this.stepIndex++; this.scrollActiveStep(); this.save(); } }
  prev(): void { if (!this.isFirst) { this.stepIndex--; this.scrollActiveStep(); } }
  goto(i: number): void { if (i >= 0 && i < this.visibleSteps.length) { this.stepIndex = i; this.scrollActiveStep(); } }

  /** Review slider — shows all pages (with real data) as a horizontal scroll
   *  so the user can swipe through Home / Intermediate / Result / Screensaver
   *  previews before deploying. */
  reviewSlideIdx = 0;
  get reviewPages(): { page: 'home' | 'inter' | 'result' | 'saver'; label: string }[] {
    const pages: { page: 'home' | 'inter' | 'result' | 'saver'; label: string }[] = [
      { page: 'home', label: 'Home' },
    ];
    if (this.draft?.themeTokens.includeIntermediate !== false) {
      pages.push({ page: 'inter', label: 'Intermediate' });
    }
    pages.push({ page: 'result', label: 'Result' });
    pages.push({ page: 'saver', label: 'Screensaver' });
    return pages;
  }
  onReviewScroll(el: HTMLElement): void {
    const slideW = el.scrollWidth / this.reviewPages.length;
    this.reviewSlideIdx = Math.round(el.scrollLeft / slideW);
  }
  scrollReviewTo(el: HTMLElement, idx: number): void {
    const slideW = el.scrollWidth / this.reviewPages.length;
    el.scrollTo({ left: slideW * idx, behavior: 'smooth' });
    this.reviewSlideIdx = idx;
  }

  private scrollActiveStep(): void {
    setTimeout(() => {
      const host = this.builderSteps?.nativeElement;
      const active = host?.querySelector<HTMLElement>('.step.active');
      active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }

  fieldSourceOpts: SelectOption[] = [
    { value: 'category', label: 'Category fields', sub: 'category1–4' },
    { value: 'etc', label: 'ETC fields', sub: 'etc0–3' },
  ];
  eslByOpts: SelectOption[] = [
    { value: 'article', label: 'Article ID' },
    { value: 'label', label: 'Label ID' },
  ];

  /** Card content that renders an image → image upload is required per item. */
  get needsImage(): boolean {
    const c = this.draft?.themeTokens.cardContent;
    return c === 'image-text' || c === 'image-only';
  }

  /** Intermediate styles that render an image per item — drives image upload UI. */
  get intermediateNeedsImage(): boolean {
    const s = this.draft?.themeTokens.intermediateStyle;
    return s === 'image-grid' || s === 'circular' || s === 'card-strip' || s === 'fullscreen';
  }

  /** Show the flat intermediate editor only when the theme includes an intermediate page
   *  AND the user hasn't built per-card children (free-form drill-down takes precedence). */
  get showIntermediateEditor(): boolean {
    if (!this.draft || this.draft.themeTokens.includeIntermediate === false) return false;
    return !this.draft.home.some(c => c.children && c.children.length > 0);
  }

  /** Max drill-down depth: Category mode is API-bound (4 levels: category1–4 or etc0–3);
   *  Prototype / Prototype-ESL are free-form, no cap. */
  get maxDepth(): number { return this.draft?.appMode === 'category' ? 4 : Infinity; }

  /** Result templates that render a map image — drives the map upload UI. */
  get resultNeedsMap(): boolean {
    const t = this.draft?.themeTokens.resultTemplate;
    return t === 'map-list' || t === 'cards-map' || t === 'split-panel' || t === 'map-full' || t === 'map-filter-list';
  }

  get resultNeedsPromo(): boolean {
    return this.draft?.themeTokens.resultTemplate === 'promo-list';
  }

  /** Header style derived from the theme — determines which header text inputs to show. */
  get headerStyle(): string { return this.draft?.themeTokens.headerStyle || 'logo-only'; }
  get needsHeaderTitle(): boolean { return this.headerStyle !== 'logo-only'; }
  get needsHeaderCaption(): boolean { return this.headerStyle === 'title+caption' || this.headerStyle === 'logo+title+caption'; }
  get showLogo(): boolean { return this.headerStyle === 'logo-only' || this.headerStyle === 'logo+title+caption'; }
  get headerStyleLabel(): string {
    const m: Record<string, string> = { 'logo-only': 'Logo only', 'title-only': 'Title only', 'title+caption': 'Title + Caption', 'logo+title+caption': 'Logo + Title + Caption' };
    return m[this.headerStyle] || this.headerStyle;
  }
  setHeader(field: 'title' | 'caption' | 'logo', value: string): void {
    if (!this.draft) return;
    this.draft.header = { ...(this.draft.header || {}), [field]: value };
  }
  async pickLogo(): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) this.setHeader('logo', dataUrl);
  }

  constructor(private content: ContentService, private categoryApi: CategoryApiService, private workspace: WorkspaceService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router) {}

  async pickImage(item: CardItem | ResultProduct): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) item.image = dataUrl;
  }

  async fetch(): Promise<void> {
    this.fetchError = '';
    this.fetching = true;
    try {
      const creds = await this.workspace.creds();
      this.apiProducts = await this.categoryApi.fetchProducts(creds);
      if (!this.apiProducts.length) this.fetchError = 'No products returned for this store.';
    } catch (e: any) {
      this.apiProducts = [];
      this.fetchError = e?.message || 'Fetch failed';
    } finally {
      this.fetching = false;
    }
  }

  toggle(id: string): void {
    if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
  }

  /** Map selected API products → Home cards + Result products (text from API, images uploaded later). */
  applySelection(): void {
    const picks = this.apiProducts.filter((p) => this.selected.has(p.productId));
    if (!this.draft!.fieldSource) this.draft!.fieldSource = 'etc';
    this.draft!.home = picks.map((p) => ({ id: p.productId, name: p.name, price: p.price, articleId: p.articleId }));
    this.draft!.result.products = picks.map((p) => ({ id: p.productId, name: p.name, price: p.price, articleId: p.articleId, labelId: p.labelId, shelf: p.shelf, aisle: p.zone }));
  }

  get modeLabel(): string {
    const m = this.draft?.appMode;
    return m === 'category' ? 'Category' : m === 'prototype' ? 'Prototype' : 'Prototype + ESL';
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.draft = (await this.content.list()).find((d) => d.id === id);
    if (!this.draft) { this.router.navigateByUrl('/tabs/content'); return; }
    if (this.draft.appMode === 'prototype-esl' && !this.draft.eslBlinkBy) this.draft.eslBlinkBy = 'article';
  }

  /** All add methods create a NEW array reference so the preview component detects
   *  the input change immediately (not on the next unrelated CD cycle). */
  addCard(): void { this.draft!.home = [...this.draft!.home, { id: 'c' + Date.now(), name: '' }]; }
  addProduct(): void {
    this.draft!.result = { ...this.draft!.result, products: [...this.draft!.result.products, { id: 'p' + Date.now(), name: '' }] };
  }
  addIntermediate(): void { this.draft!.intermediate = [...this.draft!.intermediate, { id: 'i' + Date.now(), name: '' }]; }

  /** Remove by index — creates new array reference for change detection. */
  removeCard(i: number): void { this.draft!.home = this.draft!.home.filter((_, idx) => idx !== i); }
  removeProduct(i: number): void {
    this.draft!.result = { ...this.draft!.result, products: this.draft!.result.products.filter((_, idx) => idx !== i) };
  }
  removeIntermediate(i: number): void { this.draft!.intermediate = this.draft!.intermediate.filter((_, idx) => idx !== i); }

  /** Pick the result map background image. */
  async pickMap(): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) this.draft!.result.mapImage = dataUrl;
  }

  async pickPromo(): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) this.draft!.result.promoImage = dataUrl;
  }

  /** Append a screensaver media item (image or video frame). */
  async addSaverMedia(): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (!dataUrl) return;
    this.draft!.screensaver.media = [...(this.draft!.screensaver.media || []), dataUrl];
  }
  removeSaverMedia(i: number): void {
    const arr = this.draft!.screensaver.media || [];
    arr.splice(i, 1);
    this.draft!.screensaver.media = arr;
  }

  eslId(productId: string): string {
    const link = this.draft!.eslLinks?.find((l) => l.productId === productId);
    return (this.draft!.eslBlinkBy === 'label' ? link?.labelId : link?.articleId) ?? '';
  }
  setEslId(productId: string, val: string): void {
    this.draft!.eslLinks = this.draft!.eslLinks ?? [];
    let link = this.draft!.eslLinks.find((l) => l.productId === productId);
    if (!link) { link = { productId }; this.draft!.eslLinks.push(link); }
    if (this.draft!.eslBlinkBy === 'label') link.labelId = val; else link.articleId = val;
  }
  setEslBy(v: 'article' | 'label'): void { this.draft!.eslBlinkBy = v; this.save(); }

  async save(): Promise<void> {
    if (!this.draft) return;
    this.draft.status = this.draft.home.length && this.draft.result.products.length ? 'complete' : 'draft';
    await this.content.save(this.draft);
  }

  async saveAndDeploy(): Promise<void> {
    await this.save();
    this.router.navigateByUrl('/deploy/' + this.draft!.id);
  }

  back(): void { this.router.navigateByUrl('/tabs/content'); }
}
