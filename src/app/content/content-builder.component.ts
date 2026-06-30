import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import type { ResultProduct, CardItem, ImageFit, ResultContent, ThemeTokens, FieldSource } from '@contract/layout';

type StepKey = 'home' | 'inter' | 'inter1' | 'inter2' | 'inter3' | 'result' | 'saver' | 'review';
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
export class ContentBuilderComponent implements OnInit, OnDestroy {
  @ViewChild('builderSteps') builderSteps?: ElementRef<HTMLElement>;
  @ViewChild(IonContent) contentViewport?: IonContent;
  draft?: ContentDraft;
  apiProducts: ApiProduct[] = [];
  selected = new Set<string>();
  /** Category drill selections per level [L0,L1,L2,L3] — unique values of
   *  category(n+1)/etc(n). catSel[0] is the Home (L0) selection. */
  catSel: Set<string>[] = [new Set(), new Set(), new Set(), new Set()];
  /** Back-compat alias used by the Home template (= L0 selection). */
  get selectedL0(): Set<string> { return this.catSel[0]; }
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
    // Category mode: replace the single 'inter' step with one step per drilled
    // level (inter1..interN) based on categoryLevelCount.
    if (this.draft?.appMode === 'category') {
      const interSteps: Step[] = [];
      if (this.draft.themeTokens.includeIntermediate !== false) {
        for (let i = 1; i <= this.categoryLevelCount; i++) {
          // Skip a level entirely when it has no values (e.g. category4 empty) —
          // go straight to the next level / Result.
          if (!this.categoryLevelHasValues(i)) continue;
          interSteps.push({ key: ('inter' + i) as StepKey, label: 'Intermediate L' + i, page: 'inter' });
        }
      }
      return this.allSteps.flatMap(s => (s.key === 'inter' ? interSteps : [s]));
    }
    return this.allSteps.filter(s => s.key !== 'inter' || this.draft?.themeTokens.includeIntermediate !== false);
  }
  /** Does a category level have ANY non-empty values (so its step is worth
   *  showing)? Uses the fetched products when available, else the built tree
   *  depth (after a reload, apiProducts is empty but the tree persists). */
  categoryLevelHasValues(level: number): boolean {
    if (this.apiProducts.length) {
      const sel = this.catSel[0];
      const pool = sel.size ? this.apiProducts.filter((p) => sel.has(this.gv(p, this.catKey(0)))) : this.apiProducts;
      return pool.some((p) => this.gv(p, this.catKey(level)) !== '');
    }
    return this.nodesAtDepth(level).length > 0;
  }
  /** Current intermediate level (1–3) for category steps; 0 for the legacy single step. */
  get interLevel(): number {
    const k = this.step?.key || '';
    return /^inter[123]$/.test(k) ? Number(k.slice(5)) : 0;
  }
  /** Switch key for the editor template: inter1/2/3 collapse to the 'inter' case. */
  get stepCase(): string {
    const k = this.step?.key || '';
    return /^inter[123]$/.test(k) ? 'inter' : k;
  }
  /** True on any intermediate step (single 'inter' or category inter1/2/3). */
  get isInterStep(): boolean { return this.stepCase === 'inter'; }
  get step(): Step { return this.visibleSteps[this.stepIndex] || this.visibleSteps[0]; }
  get isFirst(): boolean { return this.stepIndex <= 0; }
  get isLast(): boolean { return this.stepIndex >= this.visibleSteps.length - 1; }
  get progressPct(): number { return ((this.stepIndex + 1) / this.visibleSteps.length) * 100; }
  get hasMissingImagesForCurrentStep(): boolean {
    const d = this.draft;
    if (!d) return false;
    const key = this.step.key;
    if (key === 'home') {
      return this.needsImage && d.home.some((c) => !c.image);
    }
    if (key === 'inter' || /^inter[123]$/.test(key)) {
      if (!this.intermediateNeedsImage) return false;
      if (d.appMode === 'category') {
        return this.nodesAtDepth(this.interLevel).some((n) => !n.node.image);
      } else if (this.showIntermediateEditor) {
        return d.intermediate.some((it) => !it.image);
      } else {
        let missing = false;
        const walk = (c: CardItem): void => {
          if (!c.image) missing = true;
          (c.children || []).forEach(walk);
        };
        d.home.forEach((c) => (c.children || []).forEach(walk));
        return missing;
      }
    }
    return false;
  }
  isSegOptionMissingImages(segType: 'L0' | 'L1' | 'L2', value: string): boolean {
    if (!this.draft || !this.intermediateNeedsImage) return false;
    let pathPrefix: string[] = [];
    if (segType === 'L0') {
      pathPrefix = [value];
    } else if (segType === 'L1') {
      pathPrefix = value === 'all' ? [this.activeL0] : [this.activeL0, value];
    } else if (segType === 'L2') {
      if (value === 'all') {
        pathPrefix = this.activeL1 === 'all' ? [this.activeL0] : [this.activeL0, this.activeL1];
      } else {
        pathPrefix = this.activeL1 === 'all' ? [this.activeL0] : [this.activeL0, this.activeL1, value];
      }
    }
    let hasMissing = false;
    const walk = (node: CardItem, currentPath: string[], depth: number): void => {
      const val = this.childVal(node);
      const newPath = [...currentPath, val];
      if (depth === this.interLevel) {
        let matches = true;
        for (let i = 0; i < pathPrefix.length; i++) {
          if (newPath[i] !== pathPrefix[i]) {
            matches = false;
            break;
          }
        }
        if (segType === 'L2' && value !== 'all' && this.activeL1 === 'all') {
          if (newPath[0] !== this.activeL0 || newPath[2] !== value) {
            matches = false;
          }
        }
        if (matches && !node.image) {
          hasMissing = true;
        }
        return;
      }
      if (node.children?.length) {
        node.children.forEach((ch) => walk(ch, newPath, depth + 1));
      }
    };
    this.draft.home.forEach((c) => walk(c, [], 0));
    return hasMissing;
  }
  /** Per-step gating: Next blocks on missing REQUIRED data (errors listed above
   *  the footer); warnings inform but never block. */
  stepErrors: string[] = [];
  stepWarnings: string[] = [];
  private validateStep(key: string): { errors: string[]; warnings: string[] } {
    const e: string[] = [], w: string[] = [];
    const d = this.draft;
    if (!d) return { errors: e, warnings: w };
    if (key === 'home') {
      if (d.appMode === 'category') {
        if (!d.fieldSource) e.push('Select a field source (Category or ETC) first.');
        else if (!this.apiProducts.length) e.push('Fetch products from the API first.');
        else if (this.catSel[0].size === 0) e.push('Select at least one L0 value (category1/etc0).');
        if (this.catSel[0].size) {
          this.applySelection(); // build/sync L0 cards
          if (this.needsImage) {
            const n = d.home.filter((c) => !c.image).length;
            if (n) e.push(`${n} home card(s) have no image — this theme's cards show images.`);
          }
        }
      } else {
        if (!d.home.length) e.push('Add at least one home card.');
        d.home.forEach((c, i) => { if (!c.name?.trim()) e.push(`Home card ${i + 1} needs a name.`); });
        if (this.needsImage) {
          const n = d.home.filter((c) => !c.image).length;
          if (n) e.push(`${n} home card(s) have no image — this theme's cards show images.`);
        }
      }
    }
    if (key === 'inter' || /^inter[123]$/.test(key)) {
      if (d.appMode === 'category') {
        // No selection at intermediate levels — all options are shown. Just keep
        // the tree + products in sync; nothing to block on.
        if (this.catSel[0].size) this.applySelection();
        if (this.intermediateNeedsImage) {
          const n = this.nodesAtDepth(this.interLevel).filter((it) => !it.node.image).length;
          if (n) e.push(`${n} intermediate card(s) at L${this.interLevel} have no image — this theme requires images/thumbnails.`);
        }
      } else if (this.showIntermediateEditor) {
        if (!d.intermediate.length) e.push('Add at least one intermediate item.');
        d.intermediate.forEach((it, i) => { if (!it.name?.trim()) e.push(`Intermediate item ${i + 1} needs a name.`); });
        if (this.intermediateNeedsImage) {
          const n = d.intermediate.filter((it) => !it.image).length;
          if (n) e.push(`${n} intermediate item(s) have no image — this theme requires images/thumbnails.`);
        }
      } else {
        const empty = d.home.filter((c) => !(c.children && c.children.length)).length;
        if (empty === d.home.length && d.home.length) e.push('Individual mode: add sub-items under at least one home card.');
        else if (empty) w.push(`${empty} home card(s) have no sub-items yet.`);
        let unnamed = 0;
        const walk = (c: CardItem): void => (c.children || []).forEach((ch) => { if (!ch.name?.trim()) unnamed++; walk(ch); });
        d.home.forEach(walk);
        if (unnamed) e.push(`${unnamed} sub-item(s) need a name.`);
        if (this.intermediateNeedsImage) {
          let missingCount = 0;
          const walkImages = (c: CardItem): void => (c.children || []).forEach((ch) => { if (!ch.image) missingCount++; walkImages(ch); });
          d.home.forEach(walkImages);
          if (missingCount) e.push(`${missingCount} intermediate sub-item(s) have no image — this theme requires images/thumbnails.`);
        }
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
  prev(): void { if (!this.isFirst) { this.stepIndex--; this.afterStepChange(); this.stepErrors = []; this.stepWarnings = []; this.rememberStep(); } }
  goto(i: number): void { if (i >= 0 && i < this.visibleSteps.length) { this.stepIndex = i; this.afterStepChange(); this.stepErrors = []; this.stepWarnings = []; this.rememberStep(); } }
  /** Track the current step on the draft so reopening resumes here (persisted on next save). */
  private rememberStep(): void { if (this.draft) this.draft.lastStep = this.stepIndex; }

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
    // Category mode: keep L0 cards synced, init the intermediate segment filters,
    // and re-derive products when reaching the Result step.
    if (this.draft?.appMode === 'category') {
      if (this.catSel[0].size) this.applySelection();
      if (this.interLevel > 0) this.refreshInter();
      if (this.step?.key === 'result') this.syncResultProducts();
    }
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
      || s === 'brand-rail';
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
    // Hierarchical templates (finder-select / promo-map-rank / finder-detail) need
    // the per-card nested tree so Category → Sub → Products is enterable.
    if (this.isFinderSelect || this.interAllowProducts || this.isFinder || this.isDrillFilter) return 'individual';
    return this.draft?.home.some(c => c.children && c.children.length > 0) ? 'individual' : 'common';
  }
  setDrillMode(m: 'common' | 'individual'): void { if (this.draft) this.draft.drillMode = m; }
  /** Common = one shared result product list; Individual = per end-item products
   *  (tree leaves in individual drill mode, intermediate items in common mode). */
  get resultMode(): 'common' | 'individual' {
    if (this.draft?.resultMode) return this.draft.resultMode;
    // Promo Map + Ranks is built around per-branch ranked products and markers.
    return this.isPromoRank ? 'individual' : 'common';
  }
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
    return t === 'map-list' || t === 'cards-map' || t === 'split-panel' || t === 'map-full' || t === 'map-filter-list' || t === 'promo-map-rank';
  }

  /** promo-map-rank shows a per-product Zone in the ranked list. */
  get isPromoRank(): boolean { return this.draft?.themeTokens.resultTemplate === 'promo-map-rank'; }
  /** finder-detail adds description, sale price, attributes and fitments. */
  get isFinder(): boolean { return this.draft?.themeTokens.resultTemplate === 'finder-detail'; }
  /** drill-filter uses a per-home-card drill tree before the filtered result list. */
  get isDrillFilter(): boolean { return this.draft?.themeTokens.resultTemplate === 'drill-filter'; }

  addSpec(p: ResultProduct): void { (p.specs = p.specs || []).push({ label: '', value: '' }); }
  removeSpec(p: ResultProduct, i: number): void { p.specs?.splice(i, 1); }
  addFitment(p: ResultProduct): void { (p.fitments = p.fitments || []).push({ label: '' }); }
  removeFitment(p: ResultProduct, i: number): void { p.fitments?.splice(i, 1); }
  async pickFitImage(f: { image?: string }): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) f.image = dataUrl;
  }

  /** Is the finder-select intermediate template active? */
  get isFinderSelect(): boolean { return this.draft?.themeTokens.intermediateStyle === 'finder-select'; }
  /** Templates that display a full category → sub → products hierarchy and so need
   *  products attachable to each sub-item in the intermediate tree editor. */
  get interAllowProducts(): boolean {
    // promo-map-rank shows the picked sub-item's products in the ranked list, so
    // products attach to sub-items here. finder-detail keeps products on the
    // Result step (each carries its fitments), so its tree stays product-free.
    return this.draft?.themeTokens.resultTemplate === 'promo-map-rank';
  }
  /** Lazily-created per-content template data bag (text/labels moved out of theme). */
  get td(): NonNullable<ContentDraft['templateData']> {
    const d = this.draft!;
    return (d.templateData = d.templateData || {});
  }
  get tplFloorsCsv(): string { return (this.td.floors || []).join(','); }
  set tplFloorsCsv(v: string) { this.td.floors = v.split(',').map((s) => s.trim()).filter(Boolean); }
  get tplStepsCsv(): string { return (this.td.stepLabels || []).join(','); }
  set tplStepsCsv(v: string) { this.td.stepLabels = v.split(',').map((s) => s.trim()).filter(Boolean); }
  get tplCrumbsCsv(): string { return (this.td.breadcrumbLabels || []).join(','); }
  set tplCrumbsCsv(v: string) { this.td.breadcrumbLabels = v.split(',').map((s) => s.trim()).filter(Boolean); }
  setTplTimer(v: string): void { this.td.timerSeconds = Math.max(0, Math.round(Number(v) || 0)); }
  /** Theme overlaid with per-content template data, for the live preview. */
  get previewTheme(): ThemeTokens {
    const t = this.draft!.themeTokens;
    const td = this.draft!.templateData;
    if (!td) return t;
    const r: any = { ...t.result }, im: any = { ...t.intermediate };
    if (td.floors) r.floors = td.floors;
    if (td.youAreHereLabel != null) r.youAreHereLabel = td.youAreHereLabel;
    if (td.timerSeconds != null) r.timerSeconds = td.timerSeconds;
    if (td.breadcrumbLabels) r.breadcrumbLabels = td.breadcrumbLabels;
    if (td.findItLabel != null) r.findItLabel = td.findItLabel;
    if (td.findAllLabel != null) r.findAllLabel = td.findAllLabel;
    if (td.heroImage != null) r.heroImage = td.heroImage;
    if (td.promptPrefix != null) im.promptPrefix = td.promptPrefix;
    if (td.stepLabels) im.stepLabels = td.stepLabels;
    if (td.indexMode != null) im.indexMode = td.indexMode;
    if (td.indexNumberMin != null) im.indexNumberMin = td.indexNumberMin;
    if (td.indexNumberMax != null) im.indexNumberMax = td.indexNumberMax;
    if (td.indexNumberInterval != null) im.indexNumberInterval = td.indexNumberInterval;
    return { ...t, result: r, intermediate: im };
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

  /** Remove an uploaded image so the item falls back to its default placeholder. */
  clearImage(item: CardItem | ResultProduct): void {
    item.image = undefined;
    item.imageFit = undefined;
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
      if (this.draft && !this.draft.fieldSource) this.draft.fieldSource = 'category'; // default L0 source
      // Default depth to what the data actually has (the user can reduce it).
      if (this.draft && this.draft.categoryLevelCount == null) this.draft.categoryLevelCount = this.maxCategoryDepth;
      this.catSel = [new Set(), new Set(), new Set(), new Set()];
      if (this.draft?.home?.length) {
        const validL0 = new Set(this.catValues(0));
        for (const card of this.draft.home) {
          const val = this.childVal(card);
          if (val && validL0.has(val)) {
            this.catSel[0].add(val);
          }
        }
      }
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

  // ── Category hierarchy selection: pick category(n+1)/etc(n) VALUES per level ──
  /** API key for a level (0-indexed) driven by the chosen field source. */
  private catKey(level: number): string { return this.draft?.fieldSource === 'etc' ? `etc${level}` : `category${level + 1}`; }
  /** Display label for a level (same as the API key). */
  catLabel(level: number): string { return this.catKey(level); }
  /** Deepest intermediate level (0–3) actually present in the fetched data —
   *  drives which depth options the Home step offers. */
  get maxCategoryDepth(): number {
    if (!this.apiProducts.length) return 3;
    let m = 0;
    for (let lvl = 1; lvl <= 3; lvl++) {
      if (this.apiProducts.some((p) => this.gv(p, this.catKey(lvl)) !== '')) m = lvl; else break;
    }
    return m;
  }
  /** How many INTERMEDIATE levels the user chose, clamped to what the data has. */
  get categoryLevelCount(): number {
    const stored = Math.min(3, Math.max(0, this.draft?.categoryLevelCount ?? 0));
    return this.apiProducts.length ? Math.min(stored, this.maxCategoryDepth) : stored;
  }
  setCategoryLevelCount(n: number): void {
    if (!this.draft) return;
    this.draft.categoryLevelCount = Math.min(3, Math.max(0, Number(n) || 0));
    // Prune any tree nodes deeper than the new depth (depth 0 = home/L0 cards).
    const prune = (node: CardItem, depth: number): void => {
      if (depth >= this.draft!.categoryLevelCount!) { delete node.children; }
      else (node.children || []).forEach((c) => prune(c, depth + 1));
    };
    (this.draft.home || []).forEach((c) => prune(c, 0));
    this.syncResultProducts();
  }
  /** Products surviving the selections at every level BEFORE `level`. */
  private filteredUpTo(level: number): ApiProduct[] {
    let arr = this.apiProducts;
    for (let i = 0; i < level; i++) {
      const k = this.catKey(i), sel = this.catSel[i];
      if (sel.size) arr = arr.filter((p) => sel.has((((p as any)[k] ?? '') as string).trim()));
    }
    return arr;
  }
  /** Unique, non-empty, sorted values at a level (filtered by ancestor selections). */
  catValues(level: number): string[] {
    const arr = this.filteredUpTo(level), k = this.catKey(level), set = new Set<string>();
    for (const p of arr) { const v = (((p as any)[k] ?? '') as string).trim(); if (v) set.add(v); }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }
  /** Count of products under a value at a level (filtered by ancestor selections). */
  catCount(level: number, value: string): number {
    const arr = this.filteredUpTo(level), k = this.catKey(level);
    return arr.filter((p) => (((p as any)[k] ?? '') as string).trim() === value).length;
  }
  toggleCat(level: number, value: string): void {
    const s = this.catSel[level];
    s.has(value) ? s.delete(value) : s.add(value);
  }
  /** Field source changed → values + tree differ, so reset everything. */
  setFieldSource(src: FieldSource): void {
    if (!this.draft) return;
    this.draft.fieldSource = src;
    this.catSel = [new Set(), new Set(), new Set(), new Set()];
    this.draft.home = [];
    this.activeL0 = ''; this.activeL1 = 'all'; this.activeL2 = 'all';
  }

  // ── Intermediate L1/L2/L3 — ancestor segment selectors + path-based cards ────
  /** Active ancestor segment selections that filter the current intermediate step. */
  activeL0 = ''; activeL1: string = 'all'; activeL2: string = 'all';
  /** Cached view-state for the current intermediate step — recomputed only on
   *  real events (NOT every change-detection) to avoid CD thrash / freezes. */
  l0SegList: string[] = []; l1SegList: string[] = []; l2SegList: string[] = [];
  interCardsList: { node: CardItem; label: string }[] = [];
  /** Recompute the cached intermediate view-state (segments + all option cards). */
  refreshInter(): void {
    if (this.draft?.appMode !== 'category' || this.interLevel < 1) { this.interCardsList = []; this.l0SegList = []; this.l1SegList = []; this.l2SegList = []; return; }
    this.ensureInterActive();
    this.l0SegList = this.interL0Segs;
    this.l1SegList = this.interLevel >= 2 ? this.interL1Segs : [];
    this.l2SegList = this.interLevel >= 3 ? this.interL2Segs : [];
    this.interCardsList = this.interCards(this.interLevel);
  }
  private mk(raw: string) { return { rawName: raw, name: this.applyCase(raw), fromApi: true }; }
  private gv(p: ApiProduct, key: string): string { return (((p as any)[key] ?? '') as string).trim(); }
  /** Abbreviate a parent value to its first 3 chars (for "all" mode labels). */
  abbrev(s: string): string { return (s || '').slice(0, 3); }
  private childVal(c: CardItem): string { return (c.rawName ?? c.name) ?? ''; }
  private findChild(list: CardItem[], v: string): CardItem | undefined { return list.find((c) => this.childVal(c) === v); }
  findNodeByPath(path: string[]): CardItem | undefined {
    let list = this.draft?.home || []; let node: CardItem | undefined;
    for (const v of path) { node = this.findChild(list, v); if (!node) return undefined; list = node.children || []; }
    return node;
  }
  private ensureNodeByPath(path: string[]): CardItem {
    let list = this.draft!.home; let node!: CardItem;
    for (let i = 0; i < path.length; i++) {
      const v = path[i]; let n = this.findChild(list, v);
      if (!n) { n = { id: `l${i}_${v.replace(/\W+/g, '_')}_${Math.random().toString(36).slice(2, 5)}`, ...this.mk(v) }; list.push(n); }
      node = n; if (i < path.length - 1) { node.children = node.children || []; list = node.children; }
    }
    return node;
  }
  private removeNodeByPath(path: string[]): void {
    if (!path.length) return;
    const list = path.length > 1 ? (this.findNodeByPath(path.slice(0, -1))?.children || []) : (this.draft?.home || []);
    const idx = list.findIndex((c) => this.childVal(c) === path[path.length - 1]);
    if (idx >= 0) list.splice(idx, 1);
  }

  /** L0 segment options = the home (L0) cards. */
  get interL0Segs(): string[] { return (this.draft?.home || []).map((c) => this.childVal(c)); }
  /** L1 segment options (+ 'all') = L1 children under the active L0 node. */
  get interL1Segs(): string[] {
    const l0 = this.findNodeByPath([this.activeL0]);
    return ['all', ...(l0?.children || []).map((c) => this.childVal(c))];
  }
  /** L2 segment options (+ 'all') = L2 nodes under the active L0 (and L1 if specific). */
  get interL2Segs(): string[] {
    const l0 = this.findNodeByPath([this.activeL0]); if (!l0) return ['all'];
    const l1s = this.activeL1 === 'all' ? (l0.children || []) : (l0.children || []).filter((c) => this.childVal(c) === this.activeL1);
    const set = new Set<string>();
    l1s.forEach((c) => (c.children || []).forEach((g) => set.add(this.childVal(g))));
    return ['all', ...Array.from(set)];
  }
  setActiveL0(v: string): void { this.activeL0 = v; this.activeL1 = 'all'; this.activeL2 = 'all'; this.refreshInter(); }
  setActiveL1(v: string): void { this.activeL1 = v; this.activeL2 = 'all'; this.refreshInter(); }
  setActiveL2(v: string): void { this.activeL2 = v; this.refreshInter(); }
  /** Pick a sensible active L0 when entering an intermediate step. */
  ensureInterActive(): void {
    const segs = this.interL0Segs;
    if (!segs.includes(this.activeL0)) { this.activeL0 = segs[0] || ''; this.activeL1 = 'all'; this.activeL2 = 'all'; }
    if (this.interLevel >= 2 && !this.interL1Segs.includes(this.activeL1)) this.activeL1 = 'all';
    if (this.interLevel >= 3 && !this.interL2Segs.includes(this.activeL2)) this.activeL2 = 'all';
  }

  /** ALL card nodes at the given level under the active filters (NO selection —
   *  every option is shown). Labels are abbreviated when every ancestor segment
   *  is in 'all' mode. Reads straight from the auto-built tree. */
  interCards(level: number): { node: CardItem; label: string }[] {
    const l0 = this.findNodeByPath([this.activeL0]); if (!l0) return [];
    const out: { node: CardItem; label: string }[] = [];
    if (level === 1) {
      (l0.children || []).forEach((c) => out.push({ node: c, label: this.childVal(c) }));
    } else if (level === 2) {
      const l1s = this.activeL1 === 'all' ? (l0.children || []) : (l0.children || []).filter((c) => this.childVal(c) === this.activeL1);
      const allMode = this.activeL1 === 'all';
      l1s.forEach((l1) => (l1.children || []).forEach((l2) => out.push({
        node: l2, label: allMode ? `${this.childVal(l2)} -${this.abbrev(this.childVal(l1))}-${this.abbrev(this.activeL0)}` : this.childVal(l2),
      })));
    } else if (level === 3) {
      const l1s = this.activeL1 === 'all' ? (l0.children || []) : (l0.children || []).filter((c) => this.childVal(c) === this.activeL1);
      const allMode = this.activeL1 === 'all' && this.activeL2 === 'all';
      l1s.forEach((l1) => {
        const l2s = this.activeL2 === 'all' ? (l1.children || []) : (l1.children || []).filter((c) => this.childVal(c) === this.activeL2);
        l2s.forEach((l2) => (l2.children || []).forEach((l3) => out.push({
          node: l3, label: allMode ? `${this.childVal(l3)} -${this.abbrev(this.childVal(l2))}-${this.abbrev(this.childVal(l1))}-${this.abbrev(this.activeL0)}` : this.childVal(l3),
        })));
      });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }
  trackInterCard = (_: number, it: { node: CardItem }): string => it.node.id;

  // ── Category Result: which product fields to display ───────────────────────
  resultFieldOpts: { id: 'name' | 'price' | 'zone' | 'articleId' | 'shelf'; label: string }[] = [
    { id: 'name', label: 'Article name' }, { id: 'price', label: 'Price' }, { id: 'zone', label: 'Zone' },
    { id: 'articleId', label: 'Article ID' }, { id: 'shelf', label: 'Shelf' },
  ];
  private readonly defaultResultFields: ('name' | 'price' | 'zone' | 'articleId' | 'shelf')[] = ['name', 'price', 'zone'];
  resultFieldOn(f: 'name' | 'price' | 'zone' | 'articleId' | 'shelf'): boolean {
    return (this.draft?.result.fields ?? this.defaultResultFields).includes(f);
  }
  toggleResultField(f: 'name' | 'price' | 'zone' | 'articleId' | 'shelf'): void {
    if (!this.draft) return;
    const cur = new Set(this.draft.result.fields ?? this.defaultResultFields);
    cur.has(f) ? cur.delete(f) : cur.add(f);
    this.draft.result.fields = this.resultFieldOpts.map((o) => o.id).filter((id) => cur.has(id));
  }

  /** Re-derive each leaf's products + the shared Result list from the tree paths. */
  private syncResultProducts(): void {
    if (!this.draft) return;
    // Never wipe the persisted product lists when the API products aren't loaded
    // (e.g. after reopening the draft — apiProducts is transient and empty).
    if (!this.apiProducts.length) return;
    const dedupe = (arr: ApiProduct[]): ApiProduct[] => { const seen = new Set<string>(); return arr.filter((p) => (seen.has(p.productId) ? false : (seen.add(p.productId), true))); };
    const toProduct = (p: ApiProduct): ResultProduct => ({ id: p.productId, ...this.mk(p.name), price: p.price, articleId: p.articleId, labelId: p.labelId, shelf: p.shelf, aisle: p.zone } as ResultProduct);
    const all: ApiProduct[] = [];
    const walk = (node: CardItem, path: string[]): void => {
      const kids = node.children || [];
      if (kids.length) { kids.forEach((ch) => walk(ch, [...path, this.childVal(ch)])); }
      else {
        const prods = this.apiProducts.filter((p) => path.every((v, i) => this.gv(p, this.catKey(i)) === v));
        node.products = dedupe(prods).map(toProduct); all.push(...prods);
      }
    };
    (this.draft.home || []).forEach((c) => walk(c, [this.childVal(c)]));
    this.draft.result.products = dedupe(all).map(toProduct);
  }

  /** First incomplete intermediate level error (used by validateStep). */
  private categoryInterError(level: number): string {
    const parents = this.nodesAtDepth(level - 1);
    for (const par of parents) {
      const avail = new Set<string>();
      for (const p of this.apiProducts) {
        if (par.path.every((v, i) => this.gv(p, this.catKey(i)) === v)) { const vv = this.gv(p, this.catKey(level)); if (vv) avail.add(vv); }
      }
      if (avail.size > 0 && !(par.node.children && par.node.children.length)) {
        return `Select at least one L${level} value for "${this.childVal(par.node)}".`;
      }
    }
    return '';
  }
  private nodesAtDepth(depth: number): { node: CardItem; path: string[] }[] {
    const out: { node: CardItem; path: string[] }[] = [];
    const walk = (node: CardItem, path: string[], d: number): void => {
      if (d === depth) { out.push({ node, path }); return; }
      (node.children || []).forEach((ch) => walk(ch, [...path, this.childVal(ch)], d + 1));
    };
    (this.draft?.home || []).forEach((c) => walk(c, [this.childVal(c)], 0));
    return out;
  }

  /** Home-step "build pages" → build the FULL tree: the SELECTED L0 (category1)
   *  values, then ALL descendant values (category2..4) down to the chosen depth
   *  (no per-level selection). Existing per-node edits (image/price/unit) are
   *  preserved by path. */
  applySelection(): void {
    if (!this.draft || !this.catSel[0].size) return;
    if (!this.draft.fieldSource) this.draft.fieldSource = 'category';
    // Snapshot existing edits by path so a rebuild keeps user-entered fields.
    const editMap = new Map<string, { image?: string; price?: string; unit?: string }>();
    const collect = (nodes: CardItem[], path: string[]): void => nodes.forEach((c) => {
      const pp = [...path, this.childVal(c)];
      editMap.set(pp.join(''), { image: c.image, price: c.price, unit: c.unit });
      collect(c.children || [], pp);
    });
    collect(this.draft.home, []);
    const maxLevel = this.categoryLevelCount;
    const applyEdits = (node: CardItem, pp: string[]): void => {
      const e = editMap.get(pp.join('')); if (!e) return;
      if (e.image) node.image = e.image; if (e.price) node.price = e.price; if (e.unit) node.unit = e.unit;
    };
    const build = (level: number, subset: ApiProduct[], path: string[]): CardItem[] => {
      const k = this.catKey(level), vals = new Set<string>();
      for (const p of subset) { const v = this.gv(p, k); if (v) vals.add(v); }
      return Array.from(vals).sort((a, b) => a.localeCompare(b)).map((v) => {
        const pp = [...path, v];
        const node: CardItem = { id: `l${level}_${v.replace(/\W+/g, '_')}`, ...this.mk(v) };
        applyEdits(node, pp);
        if (level < maxLevel) node.children = build(level + 1, subset.filter((p) => this.gv(p, k) === v), pp);
        return node;
      });
    };
    this.draft.home = Array.from(this.catSel[0]).sort((a, b) => a.localeCompare(b)).map((v) => {
      const sub = this.apiProducts.filter((p) => this.gv(p, this.catKey(0)) === v);
      const node: CardItem = { id: `l0_${v.replace(/\W+/g, '_')}`, ...this.mk(v) };
      applyEdits(node, [v]);
      if (maxLevel >= 1) node.children = build(1, sub, [v]);
      return node;
    });
    this.draft.drillMode = 'individual';
    this.syncResultProducts();
    // The tree was replaced with NEW node objects (same ids) — invalidate the
    // resultLeaves memo so it returns the CURRENT nodes (which carry products).
    this.leafCache = null;
  }

  // ── Locked API article names: case transform only (no free-text edit) ──────
  articleCaseOpts: { id: NonNullable<ContentDraft['articleCase']>; label: string }[] = [
    { id: 'asis', label: 'As is' }, { id: 'upper', label: 'UPPER' }, { id: 'lower', label: 'lower' },
    { id: 'capital', label: 'Capitalize' }, { id: 'camel', label: 'camelCase' },
  ];
  /** Transform a raw API string by the draft's selected article case. */
  applyCase(raw: string, mode = this.draft?.articleCase || 'asis'): string {
    const s = (raw ?? '').trim();
    if (!s) return s;
    switch (mode) {
      case 'upper': return s.toUpperCase();
      case 'lower': return s.toLowerCase();
      case 'capital': return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      case 'camel': {
        const words = s.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
        return words.map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');
      }
      default: return s;
    }
  }
  /** Set the case and re-derive every locked (fromApi) name from its rawName. */
  setArticleCase(mode: NonNullable<ContentDraft['articleCase']>): void {
    if (!this.draft) return;
    this.draft.articleCase = mode;
    const fix = (o: any) => { if (o?.fromApi && o.rawName != null) o.name = this.applyCase(o.rawName, mode); };
    const walk = (cards: any[]) => cards?.forEach((c) => { fix(c); (c.products || []).forEach(fix); walk(c.children || []); });
    walk(this.draft.home);
    walk(this.draft.intermediate);
    (this.draft.result?.products || []).forEach(fix);
    Object.values(this.draft.itemResults || {}).forEach((r: any) => (r?.products || []).forEach(fix));
  }
  /** LCD live-refresh: which API fields the kiosk re-fetches at startup. */
  liveRefreshHas(f: 'name' | 'price'): boolean { return (this.draft?.liveRefresh ?? ['name']).includes(f); }
  toggleLiveRefresh(f: 'name' | 'price'): void {
    if (!this.draft) return;
    const cur = new Set(this.draft.liveRefresh ?? ['name']);
    cur.has(f) ? cur.delete(f) : cur.add(f);
    this.draft.liveRefresh = Array.from(cur) as ('name' | 'price')[];
  }

  get modeLabel(): string {
    const m = this.draft?.appMode;
    return m === 'category' ? 'Category' : m === 'prototype' ? 'Prototype' : 'Prototype + ESL';
  }

  get previewIntermediateItems(): CardItem[] {
    if (this.draft?.appMode === 'category') {
      return (this.interCardsList || []).map((it) => it.node);
    }
    return this.draft?.intermediate || [];
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
    const themeSaverMode = this.draft.themeTokens.screensaver?.mode;
    if (themeSaverMode && this.draft.screensaver.mode !== themeSaverMode) {
      this.draft.screensaver = { ...this.draft.screensaver, mode: themeSaverMode };
    }
    // Resume where the user left off (lastStep persisted with the draft).
    if (typeof this.draft.lastStep === 'number') {
      this.stepIndex = Math.min(Math.max(0, Math.round(this.draft.lastStep)), this.visibleSteps.length - 1);
    }
    this.afterStepChange();
  }

  /** Safety net: leaving the builder by ANY route (tab switch, hardware back,
   *  navigation) persists in-progress edits so partial work is never lost. */
  ngOnDestroy(): void {
    if (this.draft && !this.saving) void this.save();
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
  /** Selected product per individual end-item for the Promo Map + Ranks map locator. */
  private leafMarkerIndices: Record<string, number> = {};
  leafMarkerIndex(node: CardItem): number {
    const index = this.leafMarkerIndices[node.id] ?? 0;
    const count = node.products?.length || 0;
    return count ? Math.max(0, Math.min(index, count - 1)) : 0;
  }
  selectLeafMarker(node: CardItem, index: number): void { this.leafMarkerIndices[node.id] = index; }
  leafMarkerColor(node: CardItem): string {
    return node.products?.[this.leafMarkerIndex(node)]?.markerColor
      || this.mapRoute?.color
      || this.draft?.themeTokens.result.pathColor
      || this.draft?.themeTokens.result.accent
      || '#2563eb';
  }
  setLeafMarkerColor(node: CardItem, color: string): void {
    const products = node.products || [];
    const product = products[this.leafMarkerIndex(node)];
    if (!product) return;
    product.markerColor = color;
    node.products = [...products];
  }
  /** Editor map zoom (H-2) — 1 = fit. Coordinates stay correct because
   *  placeMarker reads the (scaled) bounding rect. */
  mapZoom = 1;
  zoomMapIn(): void { this.mapZoom = Math.min(3, Math.round((this.mapZoom + 0.25) * 100) / 100); }
  zoomMapOut(): void { this.mapZoom = Math.max(1, Math.round((this.mapZoom - 0.25) * 100) / 100); }
  get mapDotsEnabled(): boolean { return this.mapRoute?.kind !== 'none'; }
  /** Set the selected product's mapX/mapY (0–100 %) from a tap on the map preview. */
  placeMarker(ev: MouseEvent, box: HTMLElement): void {
    if (!this.mapDotsEnabled) return;
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.round(Math.max(0, Math.min(100, ((ev.clientX - r.left) / r.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((ev.clientY - r.top) / r.height) * 100)));
    // All reads/writes go through curResult so per-item mode edits the ACTIVE card's page.
    const cur = this.curResult;
    const products = cur.products || [];
    if (this.markerIdx >= products.length) this.markerIdx = 0;
    const p = products[this.markerIdx];
    if (!p) return;
    p.mapX = x; p.mapY = y;
    // New products array reference so the preview strip re-renders the dot immediately.
    this.setCurResult({ ...cur, products: [...products] });
  }

  /** Place a marker on a product owned by an individual intermediate end-item. */
  placeLeafMarker(ev: MouseEvent, box: HTMLElement, node: CardItem): void {
    if (!this.mapDotsEnabled) return;
    const rect = box.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const products = node.products || [];
    const product = products[this.leafMarkerIndex(node)];
    if (!product) return;
    product.mapX = Math.round(Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100)));
    product.mapY = Math.round(Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100)));
    node.products = [...products];
  }

  /** Map marker placement mode of the ACTIVE result page: dot / none. */
  get mapRoute(): { kind?: 'dot' | 'none'; x?: number; y?: number; color?: string } | undefined {
    const route = this.draft ? this.curResult.route : undefined;
    if (route?.kind === 'line') return { ...route, kind: 'dot' };
    return route as { kind?: 'dot' | 'none'; x?: number; y?: number; color?: string } | undefined;
  }
  setRouteKind(k: 'dot' | 'none'): void {
    if (!this.draft) return;
    const cur = this.curResult;
    const { w: _w, ...prev } = cur.route || {};
    const route = { ...prev, kind: k };
    this.setCurResult({ ...cur, route });
    if (this.markerIdx === -2) this.markerIdx = 0;
  }
  setRouteNum(key: 'x' | 'y', v: unknown): void {
    if (!this.draft) return;
    const cur = this.curResult;
    if (!cur.route) return;
    const n = v === '' || v == null ? NaN : Math.max(0, Math.min(100, Number(v)));
    this.setCurResult({ ...cur, route: { ...cur.route, [key]: Number.isFinite(n) ? n : undefined } });
  }
  setRouteColor(c: string): void {
    if (!this.draft) return;
    const cur = this.curResult;
    const { w: _w, ...prev } = cur.route || {};
    this.setCurResult({ ...cur, route: { ...prev, kind: prev.kind === 'none' ? 'dot' : (prev.kind || 'dot'), color: c } });
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
    const wantsVideo = this.draft?.screensaver?.mode === 'video';
    const dataUrl = wantsVideo ? await this.picker.pickRaw('video/*') : await this.picker.pick();
    if (!dataUrl) return;
    this.draft!.screensaver.media = [...(this.draft!.screensaver.media || []), dataUrl];
  }
  removeSaverMedia(i: number): void {
    const arr = this.draft!.screensaver.media || [];
    arr.splice(i, 1);
    this.draft!.screensaver.media = arr;
  }

  isVideoDataUrl(s: string | undefined): boolean {
    return !!s && typeof s === 'string' && s.startsWith('data:video');
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

  /** LED colour options — the SaaS LED API only accepts these names. */
  ledColorOpts: SelectOption[] = ['Red', 'Green', 'Yellow', 'Blue', 'Magenta', 'Cyan', 'White']
    .map((c) => ({ value: c, label: c }));
  /** Blink-duration options accepted by the SaaS LED API. */
  ledDurationOpts: SelectOption[] = ['0s', '10s', '30s', '1m', '2m', '5m', '10m', '15m', '20m', '30m', '60m']
    .map((d) => ({ value: d, label: d }));
  setLedColour(v: string): void { if (this.draft) { this.draft.ledColour = v; this.save(); } }
  setLedDuration(v: string): void { if (this.draft) { this.draft.ledDuration = v; this.save(); } }

  /** True while a save is in flight — drives the blocking saving overlay. */
  saving = false;
  /** Brief "Saved ✓" confirmation on the header Save button. */
  savedFlash = false;
  private savedFlashTimer: any = null;
  async save(): Promise<void> {
    if (!this.draft || this.saving) return;
    this.saving = true;
    try {
      this.rememberStep();
      // Per-item mode counts as "has products" when any card's own page has products.
      const hasProducts = this.draft.result.products.length > 0
        || (this.perItemActive && Object.values(this.draft.itemResults || {}).some((r) => (r.products || []).length > 0));
      this.draft.status = this.draft.home.length && hasProducts ? 'complete' : 'draft';
      await this.content.save(this.draft);
      this.savedFlash = true;
      if (this.savedFlashTimer) clearTimeout(this.savedFlashTimer);
      this.savedFlashTimer = setTimeout(() => (this.savedFlash = false), 1600);
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
        if (!top && this.intermediateNeedsImage && !c.image) missingImages++;
        if (c.children?.length) walk(c.children, false);
        // Per-item mode: a home card with its OWN result page counts as covered.
        else if (!c.products?.length && !(top && this.perItemActive && d.itemResults?.[c.id]?.products?.length)) leavesNoProducts++;
      }
    };
    walk(d.home, true);
    if (this.showIntermediateEditor) {
      for (const it of d.intermediate) {
        if (!it.name?.trim()) unnamed++;
        if (this.intermediateNeedsImage && !it.image) missingImages++;
      }
    }
    for (const p of d.result.products) if (!p.name?.trim()) unnamed++;
    if (unnamed) errors.push(`${unnamed} item(s) have an empty name.`);

    if (missingImages) errors.push(`${missingImages} card(s) have no image — this theme requires images/thumbnails.`);
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

  /** Back to the content list — persists in-progress edits first (no data loss). */
  async back(): Promise<void> {
    await this.save();
    this.router.navigateByUrl('/tabs/content');
  }
}
