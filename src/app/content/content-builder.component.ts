import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonModal } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { ThemeService } from '../services/theme.service';
import { CategoryApiService, ApiProduct } from '../services/category-api.service';
import { WorkspaceService } from '../services/workspace.service';
import { ImagePickerService } from '../services/image-picker.service';
import { SelectFieldComponent, SelectOption } from '../shared/select-field.component';
import { ColorPickerComponent } from '../shared/color-picker.component';
import { CardTreeEditorComponent } from './card-tree-editor.component';
import { ContentPreviewStripComponent } from '../shared/content-preview-strip.component';
import type { ResultProduct, CardItem, ImageFit, ResultContent } from '@contract/layout';

type StepKey = 'home' | 'inter' | 'result' | 'saver' | 'review';
interface Step { key: StepKey; label: string; page: 'home' | 'inter' | 'result' | 'saver'; }

/**
 * Prototype / Prototype+ESL data entry + Category fetch/map. Add/remove home cards &
 * result products with per-item image upload; +ESL adds id mapping. Saves to the draft.
 */
@Component({
  selector: 'app-content-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonModal, SelectFieldComponent, ColorPickerComponent, CardTreeEditorComponent, ContentPreviewStripComponent],
  templateUrl: './content-builder.component.html',
  styleUrls: ['./content-builder.component.scss'],
})
export class ContentBuilderComponent implements OnInit {
  @ViewChild('builderSteps') builderSteps?: ElementRef<HTMLElement>;
  @ViewChild(IonContent) contentViewport?: IonContent;
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
  /** Per-step gating: Next blocks on missing REQUIRED data (errors listed above
   *  the footer); warnings inform but never block. */
  stepErrors: string[] = [];
  stepWarnings: string[] = [];
  private validateStep(key: string): { errors: string[]; warnings: string[] } {
    const e: string[] = [], w: string[] = [];
    const d = this.draft;
    if (!d) return { errors: e, warnings: w };
    if (key === 'home') {
      if (!d.home.length) e.push('Add at least one home card.');
      d.home.forEach((c, i) => { if (!c.name?.trim()) e.push(`Home card ${i + 1} needs a name.`); });
      if (this.needsImage) {
        const n = d.home.filter((c) => !c.image).length;
        if (n) w.push(`${n} home card(s) have no image — this theme's cards show images.`);
      }
    }
    if (key === 'inter') {
      if (this.showIntermediateEditor) {
        if (!d.intermediate.length) e.push('Add at least one intermediate item.');
        d.intermediate.forEach((it, i) => { if (!it.name?.trim()) e.push(`Intermediate item ${i + 1} needs a name.`); });
      } else {
        const empty = d.home.filter((c) => !(c.children && c.children.length)).length;
        if (empty === d.home.length && d.home.length) e.push('Individual mode: add sub-items under at least one home card.');
        else if (empty) w.push(`${empty} home card(s) have no sub-items yet.`);
        let unnamed = 0;
        const walk = (c: CardItem): void => (c.children || []).forEach((ch) => { if (!ch.name?.trim()) unnamed++; walk(ch); });
        d.home.forEach(walk);
        if (unnamed) e.push(`${unnamed} sub-item(s) need a name.`);
      }
    }
    if (key === 'result') {
      if (this.perItemActive) {
        // Per-item result pages (skip-intermediate themes): each home card owns a page.
        const missing = d.home.filter((c) => !(d.itemResults?.[c.id]?.products?.length)).length;
        if (missing && !d.result.products.length) e.push(`${missing} home card(s) have no result products and there are no shared fallback products.`);
        else if (missing) w.push(`${missing} home card(s) will fall back to the common result page.`);
        let unnamedPer = 0;
        d.home.forEach((c) => (d.itemResults?.[c.id]?.products || []).forEach((p) => { if (!p.name?.trim()) unnamedPer++; }));
        if (unnamedPer) e.push(`${unnamedPer} per-item product(s) need a name.`);
      } else if (this.resultMode === 'individual' && !this.skipsIntermediate) {
        const missing = this.resultLeaves.filter((l) => !(l.node.products && l.node.products.length)).length;
        if (missing && !d.result.products.length) e.push(`${missing} item(s) have no products and there are no shared fallback products.`);
        else if (missing) w.push(`${missing} item(s) will use the shared fallback products.`);
        let unnamed = 0;
        this.resultLeaves.forEach((l) => (l.node.products || []).forEach((p) => { if (!p.name?.trim()) unnamed++; }));
        if (unnamed) e.push(`${unnamed} per-item product(s) need a name.`);
      } else if (!d.result.products.length) {
        e.push('Add at least one result product.');
      }
      d.result.products.forEach((p, i) => { if (!p.name?.trim()) e.push(`Shared product ${i + 1} needs a name.`); });
      // Map/promo checks run against the ACTIVE result page (per-item: the selected card's).
      if (this.resultNeedsMap && !this.curResult.mapImage) w.push('This template shows a store map — no map image uploaded yet.');
      if (this.resultNeedsPromo && !this.curResult.promoImage) w.push('This template shows a side/promo panel — no panel image uploaded yet.');
    }
    if (key === 'saver' && (d.screensaver.media?.length || 0) === 0) w.push('No screensaver media added — the screensaver will show plain colors.');
    return { errors: e, warnings: w };
  }
  private warnedStep = -1;
  next(): void {
    if (this.isLast) return;
    const { errors, warnings } = this.validateStep(this.step.key);
    this.stepErrors = errors;
    this.stepWarnings = warnings;
    if (errors.length) return; // stay on this step until required data is filled
    if (warnings.length && this.warnedStep !== this.stepIndex) { this.warnedStep = this.stepIndex; return; } // show once; next tap proceeds
    this.stepIndex++; this.afterStepChange(); this.stepErrors = []; this.stepWarnings = []; this.save();
  }
  prev(): void { if (!this.isFirst) { this.stepIndex--; this.afterStepChange(); this.stepErrors = []; this.stepWarnings = []; } }
  goto(i: number): void { if (i >= 0 && i < this.visibleSteps.length) { this.stepIndex = i; this.afterStepChange(); this.stepErrors = []; this.stepWarnings = []; } }

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

  private afterStepChange(): void {
    setTimeout(() => {
      void this.contentViewport?.scrollToTop(0);
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

  /** Card content that renders an image/icon → per-item upload is required. */
  get needsImage(): boolean {
    const c = this.draft?.themeTokens.cardContent;
    return c === 'image-text' || c === 'image-only' || c === 'icon-text';
  }
  /** True when the per-item upload is an ICON (icon+text) rather than a full image. */
  get uploadIsIcon(): boolean {
    return this.draft?.themeTokens.cardContent === 'icon-text';
  }

  /** Intermediate styles that render an image/logo per item — drives image upload UI. */
  get intermediateNeedsImage(): boolean {
    const s = this.draft?.themeTokens.intermediateStyle;
    return s === 'image-grid' || s === 'circular' || s === 'card-strip' || s === 'fullscreen'
      || s === 'side-rail' || s === 'brand-grid' || s === 'brand-rail';
  }

  /** Show the flat intermediate editor only when the theme includes an intermediate page
   *  AND the user hasn't built per-card children (free-form drill-down takes precedence). */
  get showIntermediateEditor(): boolean {
    if (!this.draft || this.draft.themeTokens.includeIntermediate === false) return false;
    return this.drillMode !== 'individual';
  }

  /** Common = one shared intermediate page; Individual = per-card sub-tree.
   *  Legacy drafts without the flag infer 'individual' from existing children. */
  get drillMode(): 'common' | 'individual' {
    if (this.draft?.drillMode) return this.draft.drillMode;
    return this.draft?.home.some(c => c.children && c.children.length > 0) ? 'individual' : 'common';
  }
  setDrillMode(m: 'common' | 'individual'): void { if (this.draft) this.draft.drillMode = m; }
  /** Common = one shared result product list; Individual = per end-item products
   *  (tree leaves in individual drill mode, intermediate items in common mode). */
  get resultMode(): 'common' | 'individual' { return this.draft?.resultMode || 'common'; }
  setResultMode(m: 'common' | 'individual'): void { if (this.draft) this.draft.resultMode = m; }

  // ---- Per-item result pages (skip-intermediate themes: Home → Result directly) ----
  /** True when the theme goes Home → Result with no intermediate page. */
  get skipsIntermediate(): boolean { return this.draft?.themeTokens.includeIntermediate === false; }
  /** Common = ONE shared result page (legacy default); Per item = each home card
   *  owns a FULL result page (own map/promo/products) in draft.itemResults. */
  get itemResultMode(): 'common' | 'per-item' { return this.draft?.itemResultMode || 'common'; }
  setItemResultMode(m: 'common' | 'per-item'): void {
    if (!this.draft) return;
    // Both structures stay on the draft — switching modes never destroys data;
    // build() deploys only the active one.
    this.draft.itemResultMode = m;
    this.markerIdx = 0;
  }
  /** True when the Result step is editing per-card pages instead of the shared one. */
  get perItemActive(): boolean {
    return this.skipsIntermediate && this.itemResultMode === 'per-item' && (this.draft?.home.length ?? 0) > 0;
  }
  /** Card selector state (per-item mode) — which home card's result page is open. */
  private activeItemId = '';
  get activeCardId(): string {
    const d = this.draft;
    if (!d || !d.home.length) return '';
    if (this.activeItemId && d.home.some((c) => c.id === this.activeItemId)) return this.activeItemId;
    return d.home[0].id;
  }
  get activeCardLabel(): string {
    const c = this.draft?.home.find((h) => h.id === this.activeCardId);
    return c?.name?.trim() || 'this card';
  }
  selectItemCard(id: string): void { this.activeItemId = id; this.markerIdx = 0; }
  /** The ResultContent the Result step edits right now: itemResults[activeCard]
   *  in per-item mode (created lazily, empty), else the shared draft.result. */
  get curResult(): ResultContent {
    const d = this.draft!;
    if (!this.perItemActive) return d.result;
    const id = this.activeCardId;
    if (!d.itemResults) d.itemResults = {};
    if (!d.itemResults[id]) d.itemResults[id] = { products: [] };
    return d.itemResults[id];
  }
  /** Replace the ACTIVE ResultContent with a new reference (change detection +
   *  preview-strip input change), routing to draft.result or itemResults[card]. */
  private setCurResult(r: ResultContent): void {
    const d = this.draft!;
    if (this.perItemActive) d.itemResults = { ...(d.itemResults || {}), [this.activeCardId]: r };
    else d.result = r;
  }
  clearMap(): void { this.setCurResult({ ...this.curResult, mapImage: undefined }); }
  clearPromo(): void { this.setCurResult({ ...this.curResult, promoImage: undefined }); }

  /** End items that own an individual result page: tree leaves (individual drill),
   *  shared intermediate items (common drill), or home cards (no intermediate). */
  /** Cached: this getter runs on EVERY change-detection pass — returning a fresh
   *  array each time made Angular re-create the per-leaf editors continuously
   *  (frozen page after "+ Add"). The cache is keyed on STRUCTURE (ids), so the
   *  same array instance is returned until items are added/removed. */
  private leafCache: { sig: string; out: { label: string; node: CardItem }[] } | null = null;
  get resultLeaves(): { label: string; node: CardItem }[] {
    const d = this.draft;
    if (!d) return [];
    let sig = this.drillMode + '|' + (d.themeTokens.includeIntermediate !== false) + '|';
    const sigWalk = (c: CardItem): void => { sig += c.id + ','; (c.children || []).forEach(sigWalk); };
    d.home.forEach(sigWalk);
    d.intermediate.forEach((i) => { sig += i.id + ','; });
    if (this.leafCache && this.leafCache.sig === sig) return this.leafCache.out;
    const out: { label: string; node: CardItem }[] = [];
    if (d.themeTokens.includeIntermediate !== false && this.drillMode === 'individual') {
      const walk = (c: CardItem, path: string) => {
        const label = path ? path + ' › ' + (c.name || '—') : (c.name || '—');
        if (c.children && c.children.length) c.children.forEach((ch) => walk(ch, label));
        else out.push({ label, node: c });
      };
      d.home.forEach((c) => walk(c, ''));
    } else if (d.themeTokens.includeIntermediate !== false) {
      d.intermediate.forEach((it) => out.push({ label: it.name || '—', node: it }));
    } else {
      d.home.forEach((c) => out.push({ label: c.name || '—', node: c }));
    }
    this.leafCache = { sig, out };
    return out;
  }
  addLeafProduct(n: CardItem): void {
    n.products = [...(n.products || []), { id: 'p' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: '' } as any];
  }
  removeLeafProduct(n: CardItem, i: number): void {
    const arr = n.products || [];
    arr.splice(i, 1);
    n.products = [...arr];
  }

  /** Max drill-down depth: Category mode is API-bound (4 levels: category1–4 or etc0–3);
   *  Prototype / Prototype-ESL are free-form, no cap. */
  get maxDepth(): number { return this.draft?.appMode === 'category' ? 4 : Infinity; }

  /** True when a home card carries its own drill-down subtree (vs. falling back
   *  to the shared default intermediate list). Drives the "Custom subtree" badge. */
  hasCustomSubtree(c: { children?: unknown[] }): boolean {
    return !!(c.children && c.children.length > 0);
  }

  /** Result templates that render a map image — drives the map upload UI. */
  get resultNeedsMap(): boolean {
    const t = this.draft?.themeTokens.resultTemplate;
    return t === 'map-list' || t === 'cards-map' || t === 'split-panel' || t === 'map-full' || t === 'map-filter-list';
  }

  /** shelf uses the promo image as its side category panel. */
  get resultNeedsPromo(): boolean {
    const t = this.draft?.themeTokens.resultTemplate;
    return t === 'promo-list' || t === 'shelf';
  }

  /** Header style derived from the theme — determines which header text inputs to show. */
  get headerStyle(): string { return this.draft?.themeTokens.headerStyle || 'logo-only'; }
  get isCustomHeader(): boolean { return (this.draft?.themeTokens.headerLayout || 'preset') === 'custom'; }
  get needsHeaderTitle(): boolean {
    if (this.isCustomHeader) return (this.draft?.themeTokens.titlePos || 'center') !== 'hidden';
    return this.headerStyle !== 'logo-only';
  }
  get needsHeaderCaption(): boolean {
    if (this.isCustomHeader) return (this.draft?.themeTokens.captionPos || 'center') !== 'hidden';
    return this.headerStyle === 'title+caption' || this.headerStyle === 'logo+title+caption';
  }
  get showLogo(): boolean {
    if (this.isCustomHeader) return (this.draft?.themeTokens.logoPos || 'left') !== 'hidden';
    return this.headerStyle === 'logo-only' || this.headerStyle === 'logo+title' || this.headerStyle === 'logo+title+caption';
  }
  get headerStyleLabel(): string {
    const m: Record<string, string> = { 'logo-only': 'Logo only', 'logo+title': 'Logo + Title', 'title-only': 'Title only', 'title+caption': 'Title + Caption', 'logo+title+caption': 'Logo + Title + Caption' };
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

  constructor(private content: ContentService, private themes: ThemeService, private categoryApi: CategoryApiService, private workspace: WorkspaceService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router) {}

  async pickImage(item: CardItem | ResultProduct): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) item.image = dataUrl;
  }

  /** Per-image fit segment (shown when an image is set). 'cover' = default → field omitted. */
  readonly fitOpts: ImageFit[] = ['cover', 'contain', 'fill'];
  fitOf(item: CardItem | ResultProduct): ImageFit { return item.imageFit || 'cover'; }
  setFit(item: CardItem | ResultProduct, fit: ImageFit): void {
    item.imageFit = fit === 'cover' ? undefined : fit;
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
    // Re-sync the draft's theme snapshot with the saved theme: theme edits made
    // AFTER the draft was created (e.g. switching the result template to 'shelf')
    // must reflect here, otherwise template-driven sections (map/promo uploads,
    // intermediate step) work against stale tokens. Deleted themes keep the snapshot.
    try {
      const t = await this.themes.getById(this.draft.themeId);
      if (t) { this.draft.themeTokens = t.tokens; this.draft.themeName = t.name; }
    } catch { /* keep snapshot */ }
  }

  /** Featured-theme designed capacity for home cards. Undefined = unlimited (user themes). */
  get maxHomeItems(): number | undefined { return this.draft?.themeTokens.maxHomeItems; }
  /** True when the theme's home-item cap has been reached — disables "+ Add". */
  get atHomeCap(): boolean {
    const cap = this.maxHomeItems;
    return cap !== undefined && (this.draft?.home.length ?? 0) >= cap;
  }

  /** All add methods create a NEW array reference so the preview component detects
   *  the input change immediately (not on the next unrelated CD cycle). */
  addCard(): void {
    if (this.atHomeCap) return;
    this.draft!.home = [...this.draft!.home, { id: 'c' + Date.now(), name: '' }];
  }
  addProduct(): void {
    const r = this.curResult;
    this.setCurResult({ ...r, products: [...r.products, { id: 'p' + Date.now(), name: '' }] });
  }
  addIntermediate(): void { this.draft!.intermediate = [...this.draft!.intermediate, { id: 'i' + Date.now(), name: '' }]; }

  /** Remove by index — creates new array reference for change detection. */
  removeCard(i: number): void { this.draft!.home = this.draft!.home.filter((_, idx) => idx !== i); }
  removeProduct(i: number): void {
    const r = this.curResult;
    this.setCurResult({ ...r, products: r.products.filter((_, idx) => idx !== i) });
  }
  removeIntermediate(i: number): void { this.draft!.intermediate = this.draft!.intermediate.filter((_, idx) => idx !== i); }

  /** Tap-to-place map marker: which product the next map tap positions. */
  markerIdx = 0;
  /** Set the selected product's mapX/mapY (0–100 %) from a tap on the map preview. */
  placeMarker(ev: MouseEvent, box: HTMLElement): void {
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.round(Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((ev.clientY - r.top) / r.height) * 100)));
    // Annotation mode (markerIdx -2): the tap places the route line / dot instead.
    // All reads/writes go through curResult so per-item mode edits the ACTIVE card's page.
    const cur = this.curResult;
    const route = cur.route;
    if (this.markerIdx === -2 && route && (route.kind === 'line' || route.kind === 'dot')) {
      this.setCurResult({ ...cur, route: { ...route, x, y } });
      return;
    }
    const products = cur.products || [];
    if (this.markerIdx >= products.length) this.markerIdx = 0;
    const p = products[this.markerIdx];
    if (!p) return;
    p.mapX = x; p.mapY = y;
    // New products array reference so the preview strip re-renders the dot immediately.
    this.setCurResult({ ...cur, products: [...products] });
  }

  /** Map annotation (ResultContent.route) of the ACTIVE result page: line / dot / none + position + color. */
  get mapRoute(): { kind?: 'line' | 'dot' | 'none'; x?: number; y?: number; w?: number; color?: string } | undefined {
    return this.draft ? this.curResult.route : undefined;
  }
  setRouteKind(k?: 'line' | 'dot' | 'none'): void {
    if (!this.draft) return;
    const cur = this.curResult;
    const route = k ? { ...(cur.route || {}), kind: k } : undefined;
    this.setCurResult({ ...cur, route });
    if (k === 'line' || k === 'dot') this.markerIdx = -2; // next map tap places the annotation
    else if (this.markerIdx === -2) this.markerIdx = 0;
  }
  setRouteNum(key: 'x' | 'y' | 'w', v: unknown): void {
    if (!this.draft) return;
    const cur = this.curResult;
    if (!cur.route) return;
    const n = v === '' || v == null ? NaN : Math.max(0, Math.min(100, Number(v)));
    this.setCurResult({ ...cur, route: { ...cur.route, [key]: Number.isFinite(n) ? n : undefined } });
  }
  setRouteColor(c: string): void {
    if (!this.draft) return;
    const cur = this.curResult;
    if (!cur.route) return;
    this.setCurResult({ ...cur, route: { ...cur.route, color: c } });
  }

  /** Pick the result map background image (active result page). */
  async pickMap(): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) this.setCurResult({ ...this.curResult, mapImage: dataUrl });
  }

  async pickPromo(): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) this.setCurResult({ ...this.curResult, promoImage: dataUrl });
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

  /** True while a save is in flight — drives the blocking saving overlay. */
  saving = false;
  async save(): Promise<void> {
    if (!this.draft || this.saving) return;
    this.saving = true;
    try {
      // Per-item mode counts as "has products" when any card's own page has products.
      const hasProducts = this.draft.result.products.length > 0
        || (this.perItemActive && Object.values(this.draft.itemResults || {}).some((r) => (r.products || []).length > 0));
      this.draft.status = this.draft.home.length && hasProducts ? 'complete' : 'draft';
      await this.content.save(this.draft);
    } finally { this.saving = false; }
  }

  // ---- Pre-deploy validation (popup lists all issues) ----
  validationOpen = false;
  valErrors: string[] = [];
  valWarnings: string[] = [];

  /** Collect blocking errors + soft warnings for the current draft. */
  private validateDraft(): { errors: string[]; warnings: string[] } {
    const d = this.draft!;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!d.home.length) errors.push('No home items — add at least one home card.');

    // Empty names anywhere in the tree are hard errors.
    let unnamed = 0;
    let missingImages = 0;
    let leavesNoProducts = 0;
    const walk = (items: CardItem[], top: boolean): void => {
      for (const c of items) {
        if (!c.name?.trim()) unnamed++;
        if (top && this.needsImage && !c.image) missingImages++;
        if (c.children?.length) walk(c.children, false);
        // Per-item mode: a home card with its OWN result page counts as covered.
        else if (!c.products?.length && !(top && this.perItemActive && d.itemResults?.[c.id]?.products?.length)) leavesNoProducts++;
      }
    };
    walk(d.home, true);
    if (this.showIntermediateEditor) {
      for (const it of d.intermediate) if (!it.name?.trim()) unnamed++;
    }
    for (const p of d.result.products) if (!p.name?.trim()) unnamed++;
    if (unnamed) errors.push(`${unnamed} item(s) have an empty name.`);

    if (missingImages) warnings.push(`${missingImages} home card(s) have no image, but this theme's cards show images.`);
    // Leaves without own products fall back to the shared Result list — only
    // warn when that fallback is empty too (nothing would show on Result).
    if (leavesNoProducts && !d.result.products.length) {
      warnings.push(`${leavesNoProducts} leaf item(s) have no products and the shared Result list is empty.`);
    }
    return { errors, warnings };
  }

  get valBlocked(): boolean { return this.valErrors.length > 0; }

  async saveAndDeploy(): Promise<void> {
    const { errors, warnings } = this.validateDraft();
    if (errors.length || warnings.length) {
      this.valErrors = errors;
      this.valWarnings = warnings;
      this.validationOpen = true;
      return;
    }
    await this.proceedDeploy();
  }

  /** Warnings only — user chose "Deploy anyway". */
  async deployAnyway(): Promise<void> {
    this.validationOpen = false;
    await this.proceedDeploy();
  }

  private async proceedDeploy(): Promise<void> {
    await this.save();
    this.router.navigateByUrl('/deploy/' + this.draft!.id);
  }

  back(): void { this.router.navigateByUrl('/tabs/content'); }
}
