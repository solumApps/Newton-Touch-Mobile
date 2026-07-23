import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonModal, IonIcon, AlertController } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { ThemeService } from '../services/theme.service';
import { CategoryApiService, ApiProduct } from '../services/category-api.service';
import { WorkspaceService } from '../services/workspace.service';
import { ImagePickerService } from '../services/image-picker.service';
import { SelectFieldComponent, SelectOption } from '../shared/select-field.component';
import { ColorPickerComponent } from '../shared/color-picker.component';
import { ContentPreviewStripComponent } from '../shared/content-preview-strip.component';
import type { ResultProduct, CardItem, ImageFit, ResultContent, ThemeTokens, FieldSource } from '@contract/layout';
import { addIcons } from 'ionicons';
import {
  addOutline, albumsOutline, appsOutline, bulbOutline, chatboxOutline, chatbubbleOutline, checkboxOutline,
  cloudDownloadOutline, compassOutline, ellipseOutline, eyeOutline, gitBranchOutline, gitNetworkOutline,
  gridOutline, hourglassOutline, imageOutline, imagesOutline, layersOutline, listOutline, locateOutline,
  locationOutline, mapOutline, megaphoneOutline, menuOutline, optionsOutline, pricetagOutline,
  pricetagsOutline, removeOutline, repeatOutline, resizeOutline, shuffleOutline, swapVerticalOutline,
  textOutline, timeOutline, timerOutline, toggleOutline,
} from 'ionicons/icons';
import {
  NtDeckChipsComponent, NtDeckChip,
  NtValuePillRowComponent, NtValuePill,
  NtEditorCardComponent,
  NtSettingsSheetComponent, NtSettingsGroup,
  NtCollapsedItemRowComponent,
} from '../shared/ui';

type StepKey = 'home' | 'inter' | 'inter1' | 'inter2' | 'inter3' | 'result' | 'saver' | 'review';
interface Step { key: StepKey; label: string; page: 'home' | 'inter' | 'result' | 'saver'; }
/** One option inside an Editor Deck category (content-builder Home step).
 *  `key` selects which existing control markup the editor-card level renders;
 *  `value` feeds the value-pill and All-settings-sheet row faces. Mirrors the
 *  `DeckOption` shape used by theme-wizard.component.ts. */
interface DeckOption { key: string; icon: string; label: string; value: string; swatch?: string; }

/**
 * Prototype / Prototype+ESL data entry + Category fetch/map. Add/remove home cards &
 * result products with per-item image upload; +ESL adds id mapping. Saves to the draft.
 */
@Component({
  selector: 'app-content-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonModal, IonIcon, SelectFieldComponent, ColorPickerComponent, ContentPreviewStripComponent,
    NtDeckChipsComponent, NtValuePillRowComponent, NtEditorCardComponent, NtSettingsSheetComponent, NtCollapsedItemRowComponent],
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
    // Prototype / Prototype+ESL in Individual mode: same leveled approach as
    // Category — one step per drill level. Empty levels are NOT skipped (the
    // user needs the step to add cards there).
    if (this.protoLeveled) {
      const interSteps: Step[] = [];
      for (let i = 1; i <= this.protoLevelCount; i++) {
        interSteps.push({ key: ('inter' + i) as StepKey, label: 'Intermediate L' + i, page: 'inter' });
      }
      return this.allSteps.flatMap(s => (s.key === 'inter' ? interSteps : [s]));
    }
    return this.allSteps.filter(s => s.key !== 'inter' || this.draft?.themeTokens.includeIntermediate !== false);
  }
  /** Prototype / Prototype+ESL with per-card drill pages → Category-style leveled
   *  authoring (depth selector + one Intermediate step per level). */
  get protoLeveled(): boolean {
    const m = this.draft?.appMode;
    return (m === 'prototype' || m === 'prototype-esl')
      && this.draft?.themeTokens.includeIntermediate !== false
      && this.drillMode === 'individual';
  }
  /** Intermediate drill levels for prototype leveled mode (1–3). Reuses the same
   *  draft field as Category mode so the pruning/persistence path is shared. */
  get protoLevelCount(): number {
    return Math.min(3, Math.max(1, this.draft?.categoryLevelCount ?? 1));
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
      if (d.appMode === 'category' || this.protoLeveled) {
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
    if (key === 'result') {
      return this.resultNeedsImage && this.resultProductsForValidation.some((p) => !p.image);
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
      } else if (this.protoLeveled) {
        const nodes = this.nodesAtDepth(this.interLevel);
        const parents = this.nodesAtDepth(this.interLevel - 1);
        // EVERY field must have at least one card at this level — an empty
        // branch would dead-end on the LCD (a drill page with no options).
        const empty = parents.filter((p) => !(p.node.children && p.node.children.length));
        if (empty.length) {
          const names = empty.slice(0, 6).map((p) => p.path.map((v) => v?.trim() || 'Unnamed').join(' › ')).join(', ');
          e.push(`Add at least one L${this.interLevel} card under: ${names}${empty.length > 6 ? ` and ${empty.length - 6} more` : ''}.`);
        }
        let unnamed = 0;
        nodes.forEach((n) => { if (!n.node.name?.trim()) unnamed++; });
        if (unnamed) e.push(`${unnamed} L${this.interLevel} card(s) need a name.`);
        if (this.intermediateNeedsImage) {
          const miss = nodes.filter((it) => !it.node.image).length;
          if (miss) e.push(`${miss} intermediate card(s) at L${this.interLevel} have no image — this theme requires images/thumbnails.`);
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
      if (this.resultNeedsImage) {
        const missingImages = this.resultProductsForValidation.filter((p) => !p.image).length;
        if (missingImages) e.push(`${missingImages} result product(s) have no image — this theme requires images/thumbnails.`);
      }
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
    if (this.protoLeveled && this.interLevel > 0) this.refreshProto();
    // View-only deck state: the Intermediate step's chip/pill options depend on
    // `interLevel` (different per inter/inter1/inter2/inter3 instance), so reset
    // to the first chip/pill whenever the step changes — same as switching chips
    // manually via onInterChipChange().
    this.interActiveChip = 0;
    this.interActivePill = 0;
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
    const d = this.draft;
    if (!d) return false;
    if (this.isFinderSelect) {
      const c = d.themeTokens.intermediate?.fsCardContent || 'text-only';
      return c === 'image-text' || c === 'image-only' || c === 'icon-text';
    }
    const c = d.themeTokens.cardContent;
    return c === 'image-text' || c === 'image-only' || c === 'icon-text';
  }
  /** True when the per-item upload is an ICON (icon+text) rather than a full image. */
  get uploadIsIcon(): boolean {
    if (this.isFinderSelect) {
      return (this.draft?.themeTokens.intermediate?.fsCardContent || 'text-only') === 'icon-text';
    }
    return this.draft?.themeTokens.cardContent === 'icon-text';
  }

  /** Result product media follows the Result card content setting. */
  get resultNeedsImage(): boolean {
    return (this.draft?.themeTokens.result?.content || 'image-text') !== 'text-only';
  }

  /** Every product configured for the current result-page mode. Used to enforce
   *  required product media consistently with the Intermediate step. */
  private get resultProductsForValidation(): ResultProduct[] {
    const d = this.draft;
    if (!d) return [];

    const products: ResultProduct[] = [...(d.result.products || [])];
    if (d.appMode === 'category' || (this.resultMode === 'individual' && !this.skipsIntermediate)) {
      this.resultLeaves.forEach((leaf) => products.push(...(leaf.node.products || [])));
    } else if (this.perItemActive) {
      d.home.forEach((card) => products.push(...(d.itemResults?.[card.id]?.products || [])));
    }

    // A product can be represented by both the shared list and a derived leaf.
    return products.filter((product, index) => products.indexOf(product) === index);
  }

  /** Intermediate styles that render an image/logo per item — drives image upload UI. */
  get intermediateNeedsImage(): boolean {
    const s = this.draft?.themeTokens.intermediateStyle;
    const inter = this.draft?.themeTokens.intermediate;
    if (s === 'finder-select') {
      const c = inter?.fsCardContent || 'text-only';
      return c === 'image-text' || c === 'image-only' || c === 'icon-text';
    }
    if (s === 'drill-stair' || s === 'accordion' || s === 'pill-tabs' || s === 'scroll-list') {
      return false;
    }
    const c = inter?.content || 'image-text';
    return c === 'image-text' || c === 'image-only' || c === 'icon-text';
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
  clearMap(): void { this.setCurResult({ ...this.curResult, mapImage: undefined, mapImageWidth: undefined, mapImageHeight: undefined }); }
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

  // ── Prototype / Prototype+ESL leveled drill (Category-style authoring) ──────
  /** Depth change: confirm before pruning user-entered cards below the new depth. */
  async setProtoLevelCount(n: number): Promise<void> {
    if (!this.draft) return;
    const v = Math.min(3, Math.max(1, Math.round(Number(n)) || 1));
    if (v === this.protoLevelCount) return;
    if (v < this.protoLevelCount) {
      let count = 0;
      const walk = (c: CardItem, d: number): void => { if (d > v) count++; (c.children || []).forEach((ch) => walk(ch, d + 1)); };
      (this.draft.home || []).forEach((c) => (c.children || []).forEach((ch) => walk(ch, 1)));
      if (count) {
        const alert = await this.alertController.create({
          header: 'Reduce drill depth?',
          message: `${count} card(s) below L${v} will be removed.`,
          buttons: [
            { text: 'Keep depth', role: 'cancel' },
            { text: 'Remove', role: 'destructive', handler: () => this.applyProtoLevelCount(v) },
          ],
        });
        await alert.present();
        return;
      }
    }
    this.applyProtoLevelCount(v);
  }
  private applyProtoLevelCount(v: number): void {
    if (!this.draft) return;
    this.draft.categoryLevelCount = v;
    // Prune nodes deeper than the new depth (depth 0 = home/L0 cards).
    const prune = (node: CardItem, depth: number): void => {
      if (depth >= v) { delete node.children; }
      else (node.children || []).forEach((c) => prune(c, depth + 1));
    };
    (this.draft.home || []).forEach((c) => prune(c, 0));
    this.leafCache = null;
    if (this.stepIndex >= this.visibleSteps.length) this.stepIndex = this.visibleSteps.length - 1;
    this.refreshProto();
  }

  /** Active segment selections, tracked by node ID (names are editable here, so
   *  string paths — as Category mode uses — would go stale on rename). Always a
   *  SPECIFIC node (auto-defaults to the first option) — there is no 'all'. */
  protoL0Id = ''; protoL1Id = ''; protoL2Id = '';
  /** Cached view-state (same pattern as Category's refreshInter — recomputed on
   *  real events only, never per change-detection pass). */
  protoL0Segs: { id: string; label: string }[] = [];
  protoL1Segs: { id: string; label: string }[] = [];
  protoL2Segs: { id: string; label: string }[] = [];
  protoCards: { node: CardItem; parent: CardItem }[] = [];
  private protoName(c: CardItem): string { return c.name?.trim() || 'Unnamed'; }
  refreshProto(): void {
    if (!this.protoLeveled || this.interLevel < 1) {
      this.protoL0Segs = []; this.protoL1Segs = []; this.protoL2Segs = []; this.protoCards = [];
      return;
    }
    const home = this.draft?.home || [];
    this.protoL0Segs = home.map((c) => ({ id: c.id, label: this.protoName(c) }));
    if (!home.some((c) => c.id === this.protoL0Id)) { this.protoL0Id = home[0]?.id || ''; this.protoL1Id = ''; this.protoL2Id = ''; }
    const l0 = home.find((c) => c.id === this.protoL0Id);
    const lvl = this.interLevel;
    if (lvl >= 2) {
      this.protoL1Segs = (l0?.children || []).map((c) => ({ id: c.id, label: this.protoName(c) }));
      if (this.protoL1Id && !this.protoL1Segs.some((c) => c.id === this.protoL1Id)) this.protoL1Id = '';
      if (!this.protoL1Id && this.protoL1Segs.length > 0) this.protoL1Id = this.protoL1Segs[0].id;
    } else { this.protoL1Segs = []; this.protoL1Id = ''; }
    const l1Pool = (l0?.children || []).filter((c) => c.id === this.protoL1Id);
    if (lvl >= 3) {
      const opts: { id: string; label: string }[] = [];
      l1Pool.forEach((c) => (c.children || []).forEach((g) => opts.push({ id: g.id, label: this.protoName(g) })));
      this.protoL2Segs = opts;
      if (this.protoL2Id && !opts.some((o) => o.id === this.protoL2Id)) this.protoL2Id = '';
      if (!this.protoL2Id && opts.length > 0) this.protoL2Id = opts[0].id;
    } else { this.protoL2Segs = []; this.protoL2Id = ''; }
    this.protoCards = this.buildProtoCards(lvl);
  }
  /** The cards at the current level under the selected parent, with the parent
   *  node attached (for add/move/remove). */
  private buildProtoCards(level: number): { node: CardItem; parent: CardItem }[] {
    const parent = this.protoAddParent;
    if (!parent || level < 1) return [];
    return (parent.children || []).map((c) => ({ node: c, parent }));
  }
  setProtoL0(id: string): void { this.protoL0Id = id; this.protoL1Id = ''; this.protoL2Id = ''; this.refreshProto(); }
  setProtoL1(id: string): void { this.protoL1Id = id; this.protoL2Id = ''; this.refreshProto(); }
  setProtoL2(id: string): void { this.protoL2Id = id; this.refreshProto(); }
  /** The node whose children this level shows (and new cards go under) — null
   *  when an ancestor level is still empty, so + Add disables with a hint. */
  get protoAddParent(): CardItem | null {
    const home = this.draft?.home || [];
    const l0 = home.find((c) => c.id === this.protoL0Id);
    if (!l0) return null;
    if (this.interLevel === 1) return l0;
    const l1 = (l0.children || []).find((c) => c.id === this.protoL1Id);
    if (!l1) return null;
    if (this.interLevel === 2) return l1;
    return (l1.children || []).find((c) => c.id === this.protoL2Id) || null;
  }
  addProtoCard(): void {
    const parent = this.protoAddParent;
    if (!parent) return;
    parent.children = [...(parent.children || []), { id: 's' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: '' }];
    this.refreshProto();
  }
  removeProtoCard(entry: { node: CardItem; parent: CardItem }): void {
    const arr = entry.parent.children || [];
    const i = arr.indexOf(entry.node);
    if (i < 0) return;
    arr.splice(i, 1);
    entry.parent.children = [...arr];
    this.refreshProto();
  }
  moveProtoCard(entry: { node: CardItem; parent: CardItem }, dir: number): void {
    const arr = entry.parent.children || [];
    const i = arr.indexOf(entry.node);
    const t = i + dir;
    if (i < 0 || t < 0 || t >= arr.length) return;
    arr.splice(t, 0, arr.splice(i, 1)[0]);
    entry.parent.children = [...arr];
    this.refreshProto();
  }
  trackProtoCard = (_: number, it: { node: CardItem }): string => it.node.id;
  /** Missing-image highlight for a segment option (parity with Category's
   *  isSegOptionMissingImages, but resolved by node id). */
  protoSegMissingImages(seg: 'L0' | 'L1' | 'L2', id: string): boolean {
    if (!this.intermediateNeedsImage || id === 'all' || !this.draft) return false;
    const missingAtLevel = (root: CardItem, rootDepth: number): boolean => {
      let missing = false;
      const walk = (n: CardItem, d: number): void => {
        if (d === this.interLevel) { if (!n.image) missing = true; return; }
        (n.children || []).forEach((c) => walk(c, d + 1));
      };
      walk(root, rootDepth);
      return missing;
    };
    const home = this.draft.home || [];
    if (seg === 'L0') { const c = home.find((x) => x.id === id); return c ? missingAtLevel(c, 0) : false; }
    const l0 = home.find((x) => x.id === this.protoL0Id);
    if (!l0) return false;
    if (seg === 'L1') { const c = (l0.children || []).find((x) => x.id === id); return c ? missingAtLevel(c, 1) : false; }
    const l1Pool = this.protoL1Id === 'all' ? (l0.children || []) : (l0.children || []).filter((x) => x.id === this.protoL1Id);
    for (const l1 of l1Pool) {
      const c = (l1.children || []).find((x) => x.id === id);
      if (c && missingAtLevel(c, 2)) return true;
    }
    return false;
  }

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
  /** promo-categories home layout — gates the editable Featured/promo-copy inputs. */
  get isPromoCategories(): boolean { return this.draft?.themeTokens.homeLayout === 'promo-categories'; }
  /** Is the brand-rail intermediate style active? */
  get isBrandRail(): boolean { return this.draft?.themeTokens.intermediateStyle === 'brand-rail'; }
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
  // ── finder-select step labels (fs-step-lbl) — one input PER DRILL LEVEL ──
  /** Number of finder steps = drill depth = the home level plus every
   *  intermediate level (the "Category depth"). One editable label per step. */
  get finderStepCount(): number { return this.protoLevelCount + 1; }
  get finderStepIndices(): number[] { return Array.from({ length: this.finderStepCount }, (_, i) => i); }
  finderStepValue(i: number): string { return this.td.stepLabels?.[i] || ''; }
  setFinderStep(i: number, v: string): void {
    const arr = [...(this.td.stepLabels || [])];
    while (arr.length < this.finderStepCount) arr.push('');
    arr[i] = v;
    this.td.stepLabels = arr.slice(0, this.finderStepCount);
  }
  /** Effective label for a step: the user's value, else the generic default. */
  finderStepLabel(i: number): string { return this.finderStepValue(i).trim() || 'Category ' + (i + 1); }
  /** Track step-label inputs by index — the value changes on every keystroke, so
   *  the default value-identity tracking would recreate the <input> and drop focus. */
  trackByIndex = (i: number): number => i;
  // ── finder-detail breadcrumb labels — the result screen's "Finder steps" ──
  // When the intermediate is finder-select these INHERIT td.stepLabels (edited on
  // the Intermediate step); otherwise they get their own per-level editor below.
  /** Breadcrumb chips = levels drilled before the result: just the home pick when
   *  the theme skips the intermediate, else home + every intermediate level. */
  get crumbStepCount(): number {
    return this.draft?.themeTokens.includeIntermediate === false ? 1 : this.finderStepCount;
  }
  get crumbStepIndices(): number[] { return Array.from({ length: this.crumbStepCount }, (_, i) => i); }
  crumbValue(i: number): string { return this.td.breadcrumbLabels?.[i] || ''; }
  setCrumb(i: number, v: string): void {
    const arr = [...(this.td.breadcrumbLabels || [])];
    while (arr.length < this.crumbStepCount) arr.push('');
    arr[i] = v;
    this.td.breadcrumbLabels = arr.slice(0, this.crumbStepCount);
  }
  /** Effective breadcrumb label: the user's value, else the generic default. */
  crumbLabel(i: number): string { return this.crumbValue(i).trim() || 'Category ' + (i + 1); }
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
    // finder-detail: preview the EFFECTIVE breadcrumb chips — inherited from the
    // Finder steps when the intermediate is finder-select, else the per-level
    // breadcrumb editor values — with generic defaults filled, matching deploy.
    if (this.isFinder) {
      r.breadcrumbLabels = this.isFinderSelect
        ? this.finderStepIndices.map((i) => this.finderStepLabel(i))
        : this.crumbStepIndices.map((i) => this.crumbLabel(i));
    }
    if (td.findItLabel != null) r.findItLabel = td.findItLabel;
    if (td.findAllLabel != null) r.findAllLabel = td.findAllLabel;
    if (td.heroImage != null) r.heroImage = td.heroImage;
    if (td.promptPrefix != null) im.promptPrefix = td.promptPrefix;
    if (td.promptText != null) im.promptText = td.promptText;
    if (td.stepLabels) im.stepLabels = td.stepLabels;
    // finder-select: preview exactly `finderStepCount` steps (drill depth), each
    // filled with the user's label or the generic default, so the preview matches
    // what deploys.
    if (this.isFinderSelect) im.stepLabels = this.finderStepIndices.map((i) => this.finderStepLabel(i));
    if (td.indexMode != null) im.indexMode = td.indexMode;
    if (td.indexNumberMin != null) im.indexNumberMin = td.indexNumberMin;
    if (td.indexNumberMax != null) im.indexNumberMax = td.indexNumberMax;
    if (td.indexNumberInterval != null) im.indexNumberInterval = td.indexNumberInterval;
    if (td.fsSortOrder != null) im.fsSortOrder = td.fsSortOrder;
    // Preview shows the CURRENT step's level (with inheritance) — the preview
    // strip renders one intermediate view and reads brandRailMessageText.
    im.brandRailMessageText = this.brandRailMessageAt(this.brStepLevel);
    return {
      ...t, result: r, intermediate: im,
      promoFeatured: td.promoFeatured != null ? td.promoFeatured : t.promoFeatured,
      promoCopy: td.promoCopy != null ? td.promoCopy : t.promoCopy,
    };
  }

  // ── brand-rail per-level message (index 0 = L1; blank inherits shallower) ──
  /** Level the brand-rail input on the current Intermediate step edits (1-based).
   *  The legacy single 'inter' step (interLevel 0) maps to L1. */
  get brStepLevel(): number { return this.interLevel || 1; }
  /** Resolved message for a level: own value, else nearest shallower, else default. */
  brandRailMessageAt(level: number): string {
    const arr = this.draft?.templateData?.brandRailMessages || [];
    for (let l = level; l >= 1; l--) { const m = arr[l - 1]; if (m && m.trim()) return m; }
    return 'Which one will you choose?';
  }
  /** The raw (own) value for the current step's level — '' when it inherits. */
  get brandRailMsgForStep(): string { return this.td.brandRailMessages?.[this.brStepLevel - 1] || ''; }
  setBrandRailMsg(v: string): void {
    const arr = [...(this.td.brandRailMessages || [])];
    arr[this.brStepLevel - 1] = v;
    // Trim trailing empties so the array stays compact.
    while (arr.length && !(arr[arr.length - 1] && arr[arr.length - 1].trim())) arr.pop();
    this.td.brandRailMessages = arr;
  }
  /** Placeholder for the current level's input: what it inherits when left blank. */
  get brandRailMsgPlaceholder(): string {
    const arr = this.td.brandRailMessages || [];
    for (let l = this.brStepLevel - 1; l >= 1; l--) { const m = arr[l - 1]; if (m && m.trim()) return m + '  (inherited from L' + l + ')'; }
    return 'Which one will you choose?';
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
  /** Header logo size as a percentage (100 = default). */
  get headerLogoScalePct(): number { return Math.round((this.draft?.header?.logoScale ?? 1) * 100); }
  setHeaderLogoScale(pct: unknown): void {
    if (!this.draft) return;
    const v = Math.max(0.5, Math.min(2.5, (Number(pct) || 100) / 100));
    this.draft.header = { ...(this.draft.header || {}), logoScale: v };
  }
  async pickLogo(): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) this.setHeader('logo', dataUrl);
  }
  clearLogo(): void {
    if (this.draft?.header) {
      delete this.draft.header.logo;
    }
  }

  // ===== Editor Deck (Home step) — view-only UI state (active category chip /
  // value pill, sheet + card-sheet open flags). Every option below reads/writes
  // the exact same properties/methods as the original vertical form — only the
  // presentation (chips → value pills → single editor card, plus an "All
  // settings" sheet) is restructured. Home cards use the separate collapsed-row
  // + bottom-sheet pattern (not the deck) per UI-REDESIGN-PROMPT.md §5.
  // See UI-REDESIGN-INVENTORY.md PART 2 Step A for the full control list.
  homeActiveChip = 0;
  homeActivePill = 0;
  homeSettingsOpen = false;

  private get homeHeaderOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const d = this.draft;
    if (!d) return out;
    out.push({ key: 'headerVisibility', icon: 'eye-outline', label: 'Header visibility', value: d.themeTokens.showHeader ? 'Visible' : 'Hidden' });
    if (d.themeTokens.showHeader) {
      if (this.showLogo) {
        out.push({ key: 'logoImage', icon: 'image-outline', label: 'Logo image', value: d.header?.logo ? 'Custom' : 'Default (SOLUM)' });
        out.push({ key: 'logoSize', icon: 'resize-outline', label: 'Logo size', value: `${this.headerLogoScalePct}%` });
      }
      if (this.needsHeaderTitle) {
        out.push({ key: 'headerTitle', icon: 'text-outline', label: 'Title', value: d.header?.title || 'Default (content name)' });
      }
      if (this.needsHeaderCaption) {
        out.push({ key: 'headerCaption', icon: 'chatbubble-outline', label: 'Caption', value: d.header?.caption || 'Default (Welcome)' });
      }
    }
    return out;
  }

  private get homePromoOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.isPromoCategories) return out;
    out.push({ key: 'promoEyebrow', icon: 'megaphone-outline', label: 'Promo eyebrow label', value: this.td.promoFeatured || 'Featured' });
    out.push({ key: 'promoMessage', icon: 'chatbox-outline', label: 'Promo message', value: this.td.promoCopy || 'Default' });
    return out;
  }

  private readonly categoryDepthLabels = ['L0 only', 'L0+L1', '+L2', '+L3'];
  private readonly protoDepthLabels: Record<number, string> = { 1: 'L0+L1', 2: '+L2', 3: '+L3' };

  private get homeCategoryOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const d = this.draft;
    if (!d || d.appMode !== 'category') return out;
    out.push({
      key: 'categoryApi', icon: 'cloud-download-outline', label: 'Category API',
      value: this.apiProducts.length ? `${this.apiProducts.length} products` : (this.fetching ? 'Fetching…' : 'Not fetched'),
    });
    if (this.apiProducts.length) {
      out.push({ key: 'fieldSource', icon: 'layers-outline', label: 'Hierarchy fields', value: this.fieldSourceOpts.find((o) => o.value === (d.fieldSource || 'category'))?.label || 'Category fields' });
      if (d.themeTokens.includeIntermediate !== false) {
        out.push({ key: 'categoryDepth', icon: 'git-branch-outline', label: 'Category depth', value: this.categoryDepthLabels[this.categoryLevelCount] || 'L0 only' });
      }
      out.push({ key: 'l0Selection', icon: 'checkbox-outline', label: 'L0 selection', value: `${this.catSel[0].size} selected` });
      out.push({ key: 'categoryTextCase', icon: 'text-outline', label: 'Category text case', value: this.articleCaseOpts.find((c) => c.id === (d.articleCase || 'asis'))?.label || 'As is' });
    }
    return out;
  }

  private get homePagesOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const d = this.draft;
    if (!d || d.appMode === 'category' || d.themeTokens.includeIntermediate === false) return out;
    out.push({ key: 'drillMode', icon: 'git-network-outline', label: 'Intermediate pages mode', value: this.drillMode === 'common' ? 'Common — one shared page' : 'Individual — per card' });
    if (this.drillMode === 'individual') {
      out.push({ key: 'protoDepth', icon: 'layers-outline', label: 'Category depth', value: this.protoDepthLabels[this.protoLevelCount] || 'L0+L1' });
    }
    return out;
  }

  get homeCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'header', icon: 'menu-outline', label: 'Header', options: this.homeHeaderOptions },
      { key: 'promo', icon: 'megaphone-outline', label: 'Promo', options: this.homePromoOptions },
      { key: 'category', icon: 'grid-outline', label: 'Category', options: this.homeCategoryOptions },
      { key: 'pages', icon: 'git-network-outline', label: 'Pages', options: this.homePagesOptions },
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

  // ----- Home cards — collapsed-row + bottom-sheet pattern (UI-REDESIGN-PROMPT.md §5) -----
  // Displayed newest-first (same reversed order the original inline list used);
  // `idx` is the REAL index into `draft.home[]` so reorder/delete call the exact
  // same `moveHomeCard()` / `removeCard()` methods with the exact same indices
  // the old template computed via `d.home.length - 1 - i`.
  homeCardModalOpen = false;
  homeCardModalIndex: number | null = null;

  get homeCardsReversed(): { card: CardItem; idx: number }[] {
    const arr = this.draft?.home || [];
    return arr.map((card, idx) => ({ card, idx })).slice().reverse();
  }
  /** Small summary badge for a home-card row, e.g. "Contain · has own page". */
  homeCardBadge(c: CardItem): string {
    const parts: string[] = [];
    if (this.needsImage && c.image) {
      const fit = this.fitOf(c);
      parts.push(fit.charAt(0).toUpperCase() + fit.slice(1));
    }
    if (this.draft?.themeTokens.includeIntermediate !== false && this.drillMode === 'individual') {
      parts.push(this.hasCustomSubtree(c) ? 'has own page' : 'shared page');
    }
    return parts.join(' · ');
  }
  openHomeCardEditor(idx: number): void { this.homeCardModalIndex = idx; this.homeCardModalOpen = true; }
  closeHomeCardEditor(): void { this.homeCardModalOpen = false; this.homeCardModalIndex = null; }
  get homeCardModalCard(): CardItem | undefined {
    return this.homeCardModalIndex != null ? this.draft?.home[this.homeCardModalIndex] : undefined;
  }

  // ===== Editor Deck (Intermediate step) — view-only UI state (active category
  // chip / value pill, sheet + card-sheet open flags). Every option below
  // reads/writes the exact same properties/methods as the original vertical
  // form — only the presentation is restructured. Reused across all 4 step
  // instances (inter/inter1/inter2/inter3): the chip/pill option lists below
  // recompute from `interLevel`/`stepCase` on every access (same mechanism the
  // original template used), so no extra per-level state is needed. Repeating
  // lists (Intermediate L{n} Cards, prototype leveled cards, common-mode
  // Intermediate items) use the separate collapsed-row + bottom-sheet pattern
  // (not the deck) per UI-REDESIGN-PROMPT.md §5.
  // See UI-REDESIGN-INVENTORY.md PART 2 Step B for the full control list.
  interActiveChip = 0;
  interActivePill = 0;
  interSettingsOpen = false;

  /** Home Fields (L0) / L1 / L2 selectors — shared pill keys across category
   *  mode (raw API values) and prototype-leveled mode (home-card ids), which
   *  are mutually exclusive by `appMode`, so a single option set is safe. */
  private get interLevelsOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const d = this.draft;
    if (!d) return out;
    if (d.appMode === 'category') {
      if (!this.l0SegList.length) return out;
      out.push({ key: 'homeFields', icon: 'grid-outline', label: 'Home Fields', value: this.activeL0 || '—' });
      if (this.interLevel >= 2) {
        out.push({ key: 'l1Options', icon: 'layers-outline', label: `${this.catLabel(1)} options`, value: this.activeL1 === 'all' ? 'All' : this.activeL1 });
      }
      if (this.interLevel >= 3) {
        out.push({ key: 'l2Options', icon: 'layers-outline', label: `${this.catLabel(2)} options`, value: this.activeL2 === 'all' ? 'All' : this.activeL2 });
      }
    } else if (this.protoLeveled && this.interLevel > 0) {
      if (!this.protoL0Segs.length) return out;
      out.push({ key: 'homeFields', icon: 'grid-outline', label: 'Home Fields', value: this.protoL0Segs.find((s) => s.id === this.protoL0Id)?.label || '—' });
      if (this.interLevel >= 2) {
        out.push({ key: 'l1Options', icon: 'layers-outline', label: 'L1 options', value: this.protoL1Segs.find((s) => s.id === this.protoL1Id)?.label || '—' });
      }
      if (this.interLevel >= 3) {
        out.push({ key: 'l2Options', icon: 'layers-outline', label: 'L2 options', value: this.protoL2Segs.find((s) => s.id === this.protoL2Id)?.label || '—' });
      }
    }
    return out;
  }

  private get interBrandRailOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.isBrandRail) return out;
    out.push({ key: 'brandRailMsg', icon: 'chatbox-outline', label: `Brand rail message (L${this.brStepLevel})`, value: this.brandRailMsgForStep || 'Inherits' });
    return out;
  }

  private get interFinderOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.isFinderSelect || this.interLevel > 1) return out;
    out.push({ key: 'finderSteps', icon: 'list-outline', label: 'Finder steps', value: `${this.finderStepCount} label${this.finderStepCount === 1 ? '' : 's'}` });
    out.push({ key: 'heroTitleFinder', icon: 'text-outline', label: 'Hero Title', value: this.draft?.header?.title || 'Default (content name)' });
    out.push({ key: 'promptFinder', icon: 'chatbubble-outline', label: 'Prompt', value: this.td.promptText || 'Default' });
    out.push({ key: 'indexMode', icon: 'swap-vertical-outline', label: 'Fast lookup index', value: (this.td.indexMode || 'alpha') === 'alpha' ? 'A–Z' : 'Number' });
    if (this.td.indexMode === 'number') {
      out.push({ key: 'indexMin', icon: 'remove-outline', label: 'Fast lookup · Min', value: String(this.td.indexNumberMin ?? 0) });
      out.push({ key: 'indexMax', icon: 'add-outline', label: 'Fast lookup · Max', value: String(this.td.indexNumberMax ?? 100) });
      out.push({ key: 'indexInterval', icon: 'repeat-outline', label: 'Fast lookup · Interval', value: String(this.td.indexNumberInterval ?? 10) });
    }
    return out;
  }

  private get interPagesOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const d = this.draft;
    if (!d || d.appMode === 'category') return out;
    out.push({ key: 'resultPagesMode', icon: 'git-network-outline', label: 'Result pages mode', value: this.resultMode === 'common' ? 'Common — one result page' : 'Individual — per item' });
    return out;
  }

  get interCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'levels', icon: 'grid-outline', label: 'Category', options: this.interLevelsOptions },
      { key: 'brandrail', icon: 'megaphone-outline', label: 'Brand rail', options: this.interBrandRailOptions },
      { key: 'finder', icon: 'compass-outline', label: 'Finder', options: this.interFinderOptions },
      { key: 'pages', icon: 'git-network-outline', label: 'Pages', options: this.interPagesOptions },
    ].filter((c) => c.options.length > 0);
  }
  get interActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.interCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.interActiveChip, cats.length - 1)];
  }
  get interChipsInput(): NtDeckChip[] { return this.interCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get interPillsInput(): NtValuePill[] {
    return (this.interActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get interActiveOption(): DeckOption | undefined {
    const opts = this.interActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.interActivePill, opts.length - 1)];
  }
  get interActivePillKey(): string { return this.interActiveOption?.key || ''; }
  get interActivePillLabel(): string { return (this.interActiveOption?.label || '').toUpperCase(); }
  get interSettingsGroups(): NtSettingsGroup[] {
    return this.interCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onInterChipChange(i: number): void { this.interActiveChip = i; this.interActivePill = 0; }
  onInterRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.interActiveChip = sel.groupIndex;
    this.interActivePill = sel.rowIndex;
  }

  // ----- Intermediate L{n} Cards (category mode) — collapsed-row + bottom-sheet
  // (UI-REDESIGN-PROMPT.md §5). Read-only names from the API — no reorder/delete
  // on the row (matches the original markup, which had none). -----
  interCardModalOpen = false;
  interCardModalIndex: number | null = null;
  /** Small summary badge for a category L{n}-card row — just the image Fit
   *  (there is no subtree/name concept here; the value is locked from the API). */
  interCardBadge(node: CardItem): string {
    if (!(this.intermediateNeedsImage && node.image)) return '';
    const fit = this.fitOf(node);
    return fit.charAt(0).toUpperCase() + fit.slice(1);
  }
  openInterCardEditor(idx: number): void { this.interCardModalIndex = idx; this.interCardModalOpen = true; }
  closeInterCardEditor(): void { this.interCardModalOpen = false; this.interCardModalIndex = null; }
  get interCardModalItem(): { node: CardItem; label: string } | undefined {
    return this.interCardModalIndex != null ? this.interCardsList[this.interCardModalIndex] : undefined;
  }

  // ----- Intermediate L{n} cards (prototype leveled mode) — collapsed-row +
  // bottom-sheet. Reorder/delete stay on the row (moveProtoCard/removeProtoCard,
  // same as before). -----
  protoCardModalOpen = false;
  protoCardModalIndex: number | null = null;
  /** Small summary badge for a prototype-leveled card row — Fit, plus own
   *  result-product count for promo-map-rank leaves. */
  protoCardBadge(node: CardItem): string {
    const parts: string[] = [];
    if (this.intermediateNeedsImage && node.image) {
      const fit = this.fitOf(node);
      parts.push(fit.charAt(0).toUpperCase() + fit.slice(1));
    }
    if (this.interAllowProducts && !(node.children && node.children.length)) {
      const n = (node.products || []).length;
      if (n) parts.push(`${n} product${n === 1 ? '' : 's'}`);
    }
    return parts.join(' · ');
  }
  openProtoCardEditor(idx: number): void { this.protoCardModalIndex = idx; this.protoCardModalOpen = true; }
  closeProtoCardEditor(): void { this.protoCardModalOpen = false; this.protoCardModalIndex = null; }
  get protoCardModalItem(): { node: CardItem; parent: CardItem } | undefined {
    return this.protoCardModalIndex != null ? this.protoCards[this.protoCardModalIndex] : undefined;
  }

  // ----- Intermediate items (common/shared mode) — collapsed-row + bottom-sheet,
  // same pattern as Home step's Home Cards (newest-first display; `idx` is the
  // REAL index into `draft.intermediate[]` so reorder/delete call the exact same
  // `moveIntermediate()` / `removeIntermediate()` methods with the exact same
  // indices the old template computed via `d.intermediate.length - 1 - i`). -----
  interItemModalOpen = false;
  interItemModalIndex: number | null = null;
  get intermediateItemsReversed(): { item: CardItem; idx: number }[] {
    const arr = this.draft?.intermediate || [];
    return arr.map((item, idx) => ({ item, idx })).slice().reverse();
  }
  interItemBadge(it: CardItem): string {
    if (!(this.intermediateNeedsImage && it.image)) return '';
    const fit = this.fitOf(it);
    return fit.charAt(0).toUpperCase() + fit.slice(1);
  }
  openInterItemEditor(idx: number): void { this.interItemModalIndex = idx; this.interItemModalOpen = true; }
  closeInterItemEditor(): void { this.interItemModalOpen = false; this.interItemModalIndex = null; }
  get interItemModalItem(): CardItem | undefined {
    return this.interItemModalIndex != null ? this.draft?.intermediate[this.interItemModalIndex] : undefined;
  }

  // ===== Editor Deck (Result step) — view-only UI state (active category chip
  // / value pill, sheet + card-sheet open flags). Every option below reads/
  // writes the exact same properties/methods as the original vertical form —
  // only the presentation is restructured. Repeating lists (Hierarchy &
  // matched products, Individual result pages, Result products — the latter
  // with nested Specs/Fitments) use the separate collapsed-row + bottom-sheet
  // pattern (not the deck) per UI-REDESIGN-PROMPT.md §5. Marker placement
  // keeps its full tap-to-place interaction inside its editor-card, unchanged.
  // See UI-REDESIGN-INVENTORY.md PART 2 Step C for the full control list.
  resultActiveChip = 0;
  resultActivePill = 0;
  resultSettingsOpen = false;

  private get resultFieldsOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const d = this.draft;
    if (!d) return out;
    if (d.appMode === 'category') {
      const on = this.resultFieldOpts.filter((f) => this.resultFieldOn(f.id)).map((f) => f.label);
      out.push({ key: 'fieldsToShow', icon: 'eye-outline', label: 'Fields to show', value: on.length ? on.join(', ') : 'None selected' });
    }
    if (d.appMode === 'category' || d.appMode === 'prototype-esl') {
      out.push({ key: 'ledBlink', icon: 'bulb-outline', label: 'LED blink', value: `${d.ledColour || 'Red'} · ${d.ledDuration || '10s'}` });
    }
    if (d.appMode === 'prototype-esl') {
      out.push({ key: 'eslBlinkBy', icon: 'pricetag-outline', label: 'ESL blink by', value: this.eslByOpts.find((o) => o.value === (d.eslBlinkBy || 'article'))?.label || 'Article ID' });
    }
    return out;
  }

  private get resultMapOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.resultNeedsMap) return out;
    out.push({ key: 'resultMapImage', icon: 'map-outline', label: 'Result map image', value: this.curResult.mapImage ? 'Uploaded' : 'Not uploaded' });
    if (this.curResult.mapImage && this.curResult.products.length) {
      const placed = this.curResult.products.filter((p) => p.mapX != null && p.mapY != null).length;
      out.push({ key: 'markerPlacement', icon: 'locate-outline', label: 'Marker placement', value: `${placed} marker${placed === 1 ? '' : 's'} placed` });
      out.push({ key: 'mapDots', icon: 'ellipse-outline', label: 'Map dots', value: this.mapDotsEnabled ? 'Dot' : 'None', swatch: this.mapDotsEnabled ? (this.mapRoute?.color || this.draft?.themeTokens.result.pathColor) : undefined });
    }
    return out;
  }

  private get resultPanelOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.resultNeedsPromo) return out;
    const isShelf = this.draft?.themeTokens.resultTemplate === 'shelf';
    out.push({ key: 'panelImage', icon: 'image-outline', label: isShelf ? 'Side category image' : 'Promo / selection panel image', value: this.curResult.promoImage ? 'Uploaded' : 'Not uploaded' });
    return out;
  }

  private get resultPagesOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.skipsIntermediate || this.draft?.appMode === 'category') return out;
    out.push({ key: 'resultPagesMode', icon: 'git-network-outline', label: 'Result pages mode', value: this.itemResultMode === 'common' ? 'Common — one result page' : 'Per item — one per home card' });
    return out;
  }

  private get resultFinderOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.isFinder) return out;
    if (this.isFinderSelect) {
      out.push({ key: 'finderSteps', icon: 'list-outline', label: 'Finder steps', value: `${this.finderStepCount} inherited label${this.finderStepCount === 1 ? '' : 's'}` });
    } else {
      out.push({ key: 'finderSteps', icon: 'list-outline', label: 'Finder steps', value: `${this.crumbStepCount} label${this.crumbStepCount === 1 ? '' : 's'}` });
    }
    out.push({ key: 'heroTitleFinder', icon: 'text-outline', label: 'Hero Title', value: this.draft?.header?.title || 'Default (content name)' });
    out.push({ key: 'finderLabels', icon: 'pricetags-outline', label: 'Finder labels', value: `${this.td.findItLabel || 'Find It'} / ${this.td.findAllLabel || 'Find All'}` });
    return out;
  }

  private get resultPromotionOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    if (!this.isPromoRank) return out;
    out.push({ key: 'floorLabels', icon: 'layers-outline', label: 'Floor labels', value: this.tplFloorsCsv || 'Not set' });
    out.push({ key: 'youAreHere', icon: 'location-outline', label: '"You are here" label', value: this.td.youAreHereLabel || 'Not set' });
    out.push({ key: 'timerSeconds', icon: 'timer-outline', label: 'Timer seconds', value: this.td.timerSeconds != null ? `${this.td.timerSeconds}s` : 'Not set' });
    return out;
  }

  get resultCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'fields', icon: 'options-outline', label: 'Fields & display', options: this.resultFieldsOptions },
      { key: 'map', icon: 'map-outline', label: 'Map & markers', options: this.resultMapOptions },
      { key: 'panel', icon: 'image-outline', label: 'Panel & promo', options: this.resultPanelOptions },
      { key: 'pages', icon: 'git-network-outline', label: 'Pages', options: this.resultPagesOptions },
      { key: 'finder', icon: 'compass-outline', label: 'Finder', options: this.resultFinderOptions },
      { key: 'promotion', icon: 'megaphone-outline', label: 'Promotion', options: this.resultPromotionOptions },
    ].filter((c) => c.options.length > 0);
  }
  get resultActiveCategory(): { key: string; icon: string; label: string; options: DeckOption[] } | undefined {
    const cats = this.resultCategories;
    if (!cats.length) return undefined;
    return cats[Math.min(this.resultActiveChip, cats.length - 1)];
  }
  get resultChipsInput(): NtDeckChip[] { return this.resultCategories.map((c) => ({ icon: c.icon, label: c.label })); }
  get resultPillsInput(): NtValuePill[] {
    return (this.resultActiveCategory?.options || []).map((o) => ({ label: o.label, value: o.value, swatch: o.swatch }));
  }
  get resultActiveOption(): DeckOption | undefined {
    const opts = this.resultActiveCategory?.options || [];
    if (!opts.length) return undefined;
    return opts[Math.min(this.resultActivePill, opts.length - 1)];
  }
  get resultActivePillKey(): string { return this.resultActiveOption?.key || ''; }
  get resultActivePillLabel(): string { return (this.resultActiveOption?.label || '').toUpperCase(); }
  get resultSettingsGroups(): NtSettingsGroup[] {
    return this.resultCategories.map((c) => ({
      label: c.label.toUpperCase(),
      rows: c.options.map((o) => ({ icon: o.icon, label: o.label, value: o.value, swatch: o.swatch })),
    }));
  }
  onResultChipChange(i: number): void { this.resultActiveChip = i; this.resultActivePill = 0; }
  onResultRowSelected(sel: { groupIndex: number; rowIndex: number }): void {
    this.resultActiveChip = sel.groupIndex;
    this.resultActivePill = sel.rowIndex;
  }

  // ----- Result product badges (collapsed-row summary text) -----
  private resultProductBadgeParts(p: ResultProduct, includeFinderCounts: boolean): string {
    const parts: string[] = [];
    if (this.resultNeedsImage && p.image) {
      const fit = this.fitOf(p);
      parts.push(fit.charAt(0).toUpperCase() + fit.slice(1));
    }
    if (p.price) parts.push(p.price);
    if (includeFinderCounts && this.isFinder) {
      const specs = p.specs?.length || 0;
      const fitments = p.fitments?.length || 0;
      if (specs || fitments) parts.push(`${specs} spec${specs === 1 ? '' : 's'} · ${fitments} fitment${fitments === 1 ? '' : 's'}`);
    }
    return parts.join(' · ');
  }
  /** Hierarchy & matched products (category mode) — read-only from the API. */
  hierProductBadge(p: ResultProduct): string { return this.resultProductBadgeParts(p, false); }
  /** Individual result pages (drill-tree leaves) — no nested specs/fitments UI here. */
  leafProductBadge(p: ResultProduct): string { return this.resultProductBadgeParts(p, false); }
  /** Result products (common/shared list) — includes finder-detail specs/fitments counts. */
  resultProductBadge(p: ResultProduct): string { return this.resultProductBadgeParts(p, true); }

  // ----- Hierarchy & matched products (category mode) — collapsed-row +
  // bottom-sheet (UI-REDESIGN-PROMPT.md §5). Read-only names from the API —
  // no reorder/delete on the row (matches the original markup, which had none). -----
  hierProductModalOpen = false;
  private hierProductModalNode: CardItem | null = null;
  private hierProductModalIndex: number | null = null;
  openHierProductEditor(node: CardItem, idx: number): void { this.hierProductModalNode = node; this.hierProductModalIndex = idx; this.hierProductModalOpen = true; }
  closeHierProductEditor(): void { this.hierProductModalOpen = false; this.hierProductModalNode = null; this.hierProductModalIndex = null; }
  get hierProductModalItem(): ResultProduct | undefined {
    if (!this.hierProductModalNode || this.hierProductModalIndex == null) return undefined;
    return (this.hierProductModalNode.products || [])[this.hierProductModalIndex];
  }

  // ----- Individual result pages (drill-tree leaves) — collapsed-row +
  // bottom-sheet, one list per leaf. No reorder in the original markup — only
  // delete (removeLeafProduct) stays on the row. The leaf-level Map locator
  // (tap-to-place) stays inline in the template, outside this modal. -----
  leafProductModalOpen = false;
  private leafProductModalNode: CardItem | null = null;
  private leafProductModalIndex: number | null = null;
  /** Products for a leaf node, newest-first (matches the original `.slice().reverse()`);
   *  `idx` is the REAL index into `node.products[]` so delete calls the exact
   *  same `removeLeafProduct()` with the exact same index the old template
   *  computed via `node.products.length - 1 - pi`. */
  leafProductsReversed(node: CardItem): { product: ResultProduct; idx: number }[] {
    const arr = node.products || [];
    return arr.map((product, idx) => ({ product, idx })).slice().reverse();
  }
  openLeafProductEditor(node: CardItem, idx: number): void { this.leafProductModalNode = node; this.leafProductModalIndex = idx; this.leafProductModalOpen = true; }
  closeLeafProductEditor(): void { this.leafProductModalOpen = false; this.leafProductModalNode = null; this.leafProductModalIndex = null; }
  get leafProductModalItem(): ResultProduct | undefined {
    if (!this.leafProductModalNode || this.leafProductModalIndex == null) return undefined;
    return (this.leafProductModalNode.products || [])[this.leafProductModalIndex];
  }

  // ----- Result products (common/shared list) — collapsed-row + bottom-sheet.
  // Reorder + delete stay on the row (moveProduct/removeProduct, same as
  // before). The bottom sheet holds the FULL original per-product editor,
  // including the finder-detail nested Specs/Fitments add-remove lists. -----
  resultProductModalOpen = false;
  resultProductModalIndex: number | null = null;
  /** Products of the ACTIVE result page, newest-first (matches the original
   *  `curResult.products.slice().reverse()`); `idx` is the REAL index into
   *  `curResult.products[]` so reorder/delete call the exact same
   *  `moveProduct()` / `removeProduct()` with the exact same indices the old
   *  template computed via `curResult.products.length - 1 - i`. */
  get resultProductsReversed(): { product: ResultProduct; idx: number }[] {
    const arr = this.curResult.products || [];
    return arr.map((product, idx) => ({ product, idx })).slice().reverse();
  }
  openResultProductEditor(idx: number): void { this.resultProductModalIndex = idx; this.resultProductModalOpen = true; }
  closeResultProductEditor(): void { this.resultProductModalOpen = false; this.resultProductModalIndex = null; }
  get resultProductModalItem(): ResultProduct | undefined {
    return this.resultProductModalIndex != null ? this.curResult.products[this.resultProductModalIndex] : undefined;
  }

  constructor(private content: ContentService, private themes: ThemeService, private categoryApi: CategoryApiService, private workspace: WorkspaceService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router, private alertController: AlertController) {
    // Editor Deck redesign: register every icon name used by this component's
    // chip/pill/editor-card/settings-sheet option lists (same reasoning as
    // theme-wizard.component.ts's constructor — see comment there).
    addIcons({
      addOutline, albumsOutline, appsOutline, bulbOutline, chatboxOutline, chatbubbleOutline, checkboxOutline,
      cloudDownloadOutline, compassOutline, ellipseOutline, eyeOutline, gitBranchOutline, gitNetworkOutline,
      gridOutline, hourglassOutline, imageOutline, imagesOutline, layersOutline, listOutline, locateOutline,
      locationOutline, mapOutline, megaphoneOutline, menuOutline, optionsOutline, pricetagOutline,
      pricetagsOutline, removeOutline, repeatOutline, resizeOutline, shuffleOutline, swapVerticalOutline,
      textOutline, timeOutline, timerOutline, toggleOutline,
    });
  }

  async pickImage(item: CardItem | ResultProduct): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) {
      item.image = dataUrl;
      if (this.draft?.appMode === 'category') {
        this.syncResultProducts();
      }
    }
  }

  /** Remove an uploaded image so the item falls back to its default placeholder. */
  clearImage(item: CardItem | ResultProduct): void {
    item.image = undefined;
    item.imageFit = undefined;
    if (this.draft?.appMode === 'category') {
      this.syncResultProducts();
    }
  }

  /** Per-image fit segment (shown when an image is set). The choice is stored
   *  EXPLICITLY — including 'cover' — because some templates default to contain
   *  (brand-rail logos, product-focus disc): omitting 'cover' made that option
   *  a no-op there. */
  readonly fitOpts: ImageFit[] = ['cover', 'contain', 'fill'];
  fitOf(item: CardItem | ResultProduct): ImageFit { return item.imageFit || 'cover'; }
  setFit(item: CardItem | ResultProduct, fit: ImageFit): void {
    item.imageFit = fit;
    if (this.draft?.appMode === 'category') {
      this.syncResultProducts();
    }
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
        const unchecked: string[] = [];
        const missingFromApi: string[] = [];
        for (const card of this.draft.home) {
          const val = this.childVal(card);
          if (val) {
            if (!validL0.has(val)) {
              missingFromApi.push(val);
            } else {
              const missingKey = this.checkCategoryDepthValid(val);
              if (missingKey) {
                unchecked.push(val);
              } else {
                this.catSel[0].add(val);
              }
            }
          }
        }
        if (missingFromApi.length || unchecked.length) {
          if (this.catSel[0].size > 0) {
            this.applySelection();
          } else {
            this.draft.home = [];
            this.syncResultProducts();
            this.leafCache = null;
          }
          const alertMessages: string[] = [];
          if (missingFromApi.length) {
            alertMessages.push(`The following categories are no longer available in the API and have been removed: ${missingFromApi.join(', ')}.`);
          }
          if (unchecked.length) {
            alertMessages.push(`The following categories were removed because they do not contain required category/etc values for the current depth: ${unchecked.join(', ')}.`);
          }
          const alert = await this.alertController.create({
            header: 'Categories Validated',
            message: alertMessages.join('\n\n'),
            buttons: ['OK']
          });
          await alert.present();
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
  /** How many INTERMEDIATE levels the user chose, clamped to what the data has.
   *  A theme WITHOUT an intermediate page forces 0 — the Home (L0) selection maps
   *  every product under it straight to the Result page. */
  get categoryLevelCount(): number {
    if (this.draft?.themeTokens.includeIntermediate === false) return 0;
    const stored = Math.min(3, Math.max(0, this.draft?.categoryLevelCount ?? 0));
    return this.apiProducts.length ? Math.min(stored, this.maxCategoryDepth) : stored;
  }
  setCategoryLevelCount(n: number): void {
    if (!this.draft) return;
    this.draft.categoryLevelCount = Math.min(3, Math.max(0, Number(n) || 0));
    
    // Validate currently selected L0 categories and uncheck any that are not supported at the new depth
    const unchecked: string[] = [];
    if (this.catSel[0].size) {
      for (const val of Array.from(this.catSel[0])) {
        const missingKey = this.checkCategoryDepthValid(val);
        if (missingKey) {
          this.catSel[0].delete(val);
          unchecked.push(val);
        }
      }
    }

    // Prune any tree nodes deeper than the new depth (depth 0 = home/L0 cards).
    const prune = (node: CardItem, depth: number): void => {
      if (depth >= this.draft!.categoryLevelCount!) { delete node.children; }
      else (node.children || []).forEach((c) => prune(c, depth + 1));
    };
    (this.draft.home || []).forEach((c) => prune(c, 0));
    this.syncResultProducts();

    if (unchecked.length) {
      void this.showUncheckedAlert(unchecked);
    }
  }
  private async showUncheckedAlert(categories: string[]): Promise<void> {
    const listStr = categories.join(', ');
    const alert = await this.alertController.create({
      header: 'Categories Unselected',
      message: `The following categories were unchecked because they do not contain required category/etc values for the new depth: ${listStr}. Please update data and refetch if needed.`,
      buttons: ['OK']
    });
    await alert.present();
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
  checkCategoryDepthValid(value: string): string | null {
    const depth = this.categoryLevelCount;
    for (let lvl = 1; lvl <= depth; lvl++) {
      const key = this.catKey(lvl);
      const hasValue = this.apiProducts.some(
        (p) => this.gv(p, this.catKey(0)) === value && this.gv(p, key) !== ''
      );
      if (!hasValue) {
        return key;
      }
    }
    return null;
  }
  async toggleCat(level: number, value: string, ev?: Event): Promise<void> {
    const s = this.catSel[level];
    if (s.has(value)) {
      s.delete(value);
    } else {
      if (level === 0) {
        const missingKey = this.checkCategoryDepthValid(value);
        if (missingKey) {
          if (ev) {
            ev.preventDefault();
            (ev.target as HTMLInputElement).checked = false;
          }
          const alert = await this.alertController.create({
            header: 'Missing Category Value',
            message: `this data is not contains requird ${missingKey} value, plese update ${missingKey} value and refetch data to continue`,
            buttons: ['OK']
          });
          await alert.present();
          return;
        }
      }
      s.add(value);
    }
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
  syncResultProducts(): void {
    if (!this.draft) return;
    // Never wipe the persisted product lists when the API products aren't loaded
    // (e.g. after reopening the draft — apiProducts is transient and empty).
    if (!this.apiProducts.length) return;

    // Collect all existing user edits by product ID
    const productEdits = new Map<string, Partial<ResultProduct>>();
    if (this.draft.result?.products) {
      for (const p of this.draft.result.products) {
        if (p.id) {
          productEdits.set(p.id, {
            image: p.image,
            imageFit: p.imageFit,
            price: p.price,
            aisle: p.aisle,
            shelf: p.shelf,
            mapX: p.mapX,
            mapY: p.mapY,
            markerColor: p.markerColor,
            description: p.description,
            onSale: p.onSale,
            salePrice: p.salePrice,
            specs: p.specs,
            fitments: p.fitments
          });
        }
      }
    }
    const collectFromNodes = (items: CardItem[]): void => {
      for (const c of items) {
        if (c.products) {
          for (const p of c.products) {
            if (p.id) {
              productEdits.set(p.id, {
                image: p.image,
                imageFit: p.imageFit,
                price: p.price,
                aisle: p.aisle,
                shelf: p.shelf,
                mapX: p.mapX,
                mapY: p.mapY,
                markerColor: p.markerColor,
                description: p.description,
                onSale: p.onSale,
                salePrice: p.salePrice,
                specs: p.specs,
                fitments: p.fitments
              });
            }
          }
        }
        if (c.children) {
          collectFromNodes(c.children);
        }
      }
    };
    collectFromNodes(this.draft.home || []);

    const dedupe = (arr: ApiProduct[]): ApiProduct[] => { const seen = new Set<string>(); return arr.filter((p) => (seen.has(p.productId) ? false : (seen.add(p.productId), true))); };
    const toProduct = (p: ApiProduct): ResultProduct => {
      const edit = productEdits.get(p.productId) || {};
      return {
        id: p.productId,
        ...this.mk(p.name),
        price: edit.price !== undefined ? edit.price : p.price,
        articleId: p.articleId,
        labelId: p.labelId,
        shelf: edit.shelf !== undefined ? edit.shelf : p.shelf,
        aisle: edit.aisle !== undefined ? edit.aisle : p.zone,
        image: edit.image,
        imageFit: edit.imageFit,
        mapX: edit.mapX,
        mapY: edit.mapY,
        markerColor: edit.markerColor,
        description: edit.description,
        onSale: edit.onSale,
        salePrice: edit.salePrice,
        specs: edit.specs,
        fitments: edit.fitments
      } as ResultProduct;
    };
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
    if (this.protoLeveled && this.interLevel > 0) {
      return this.protoCards.map((it) => it.node);
    }
    return this.draft?.intermediate || [];
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.draft = (await this.content.list()).find((d) => d.id === id);
    if (!this.draft) { this.router.navigateByUrl('/tabs/content'); return; }
    if (this.draft.appMode === 'prototype-esl' && !this.draft.eslBlinkBy) this.draft.eslBlinkBy = 'article';
    // Migrate the earlier single brand-rail message → per-level array (index 0 = L1).
    const tdMig = this.draft.templateData as (typeof this.draft.templateData & { brandRailMessage?: string }) | undefined;
    if (tdMig?.brandRailMessage && !tdMig.brandRailMessages) {
      tdMig.brandRailMessages = [tdMig.brandRailMessage];
      delete tdMig.brandRailMessage;
    }
    // Prototype leveled drill: infer the depth from the deepest existing children
    // so drafts built before the depth control keep their whole tree editable.
    if ((this.draft.appMode === 'prototype' || this.draft.appMode === 'prototype-esl') && this.draft.categoryLevelCount == null) {
      let depth = 1;
      const walk = (c: CardItem, d: number): void => { depth = Math.max(depth, d); (c.children || []).forEach((ch) => walk(ch, d + 1)); };
      (this.draft.home || []).forEach((c) => (c.children || []).forEach((ch) => walk(ch, 1)));
      this.draft.categoryLevelCount = Math.min(3, depth);
    }
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
    if (this.draft.appMode === 'category') {
      await this.fetch();
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
  moveHomeCard(i: number, dir: number): void {
    const target = i + dir;
    if (target < 0 || target >= this.draft!.home.length) return;
    const item = this.draft!.home.splice(i, 1)[0];
    this.draft!.home.splice(target, 0, item);
  }
  moveIntermediate(i: number, dir: number): void {
    const target = i + dir;
    if (target < 0 || target >= this.draft!.intermediate.length) return;
    const item = this.draft!.intermediate.splice(i, 1)[0];
    this.draft!.intermediate.splice(target, 0, item);
  }
  moveProduct(i: number, dir: number): void {
    const r = this.curResult;
    const arr = [...r.products];
    const target = i + dir;
    if (target < 0 || target >= arr.length) return;
    const item = arr.splice(i, 1)[0];
    arr.splice(target, 0, item);
    this.setCurResult({ ...r, products: arr });
  }
  moveMedia(i: number, dir: number): void {
    const arr = this.draft!.screensaver.media;
    const target = i + dir;
    if (target < 0 || target >= arr.length) return;
    const item = arr.splice(i, 1)[0];
    arr.splice(target, 0, item);
  }


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

  private loadImageNatural(src: string | undefined): { w: number; h: number } | null {
    if (!src) return null;
    const img = new Image();
    img.src = src;
    if (!img.naturalWidth || !img.naturalHeight) return null;
    return { w: img.naturalWidth, h: img.naturalHeight };
  }

  private coverBounds(containerW: number, containerH: number, imgW: number, imgH: number): { x: number; y: number; w: number; h: number; scale: number } {
    const scale = Math.max(containerW / imgW, containerH / imgH);
    const renderedW = imgW * scale;
    const renderedH = imgH * scale;
    const offsetX = (containerW - renderedW) / 2;
    const offsetY = (containerH - renderedH) / 2;
    return { x: -offsetX, y: -offsetY, w: renderedW, h: renderedH, scale };
  }

  /** Set the selected product's mapX/mapY (0–100 %) from a tap on the map preview. */
  placeMarker(ev: MouseEvent, box: HTMLElement): void {
    if (!this.mapDotsEnabled) return;
    const r = box.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const natural = this.loadImageNatural(this.curResult.mapImage);
    if (!natural) return;
    const scale = Math.max(r.width / natural.w, r.height / natural.h);
    const renderedW = natural.w * scale;
    const renderedH = natural.h * scale;
    const offsetX = (r.width - renderedW) / 2;
    const offsetY = (r.height - renderedH) / 2;
    const tapX = ev.clientX - r.left;
    const tapY = ev.clientY - r.top;
    if (tapX < offsetX || tapX > offsetX + renderedW || tapY < offsetY || tapY > offsetY + renderedH) return;
    const imgX = ((tapX - offsetX) / renderedW) * natural.w;
    const imgY = ((tapY - offsetY) / renderedH) * natural.h;
    const x = Math.round(Math.max(0, Math.min(100, (imgX / natural.w) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, (imgY / natural.h) * 100)));
    const cur = this.curResult;
    const products = cur.products || [];
    if (this.markerIdx >= products.length) this.markerIdx = 0;
    const p = products[this.markerIdx];
    if (!p) return;
    p.mapX = x; p.mapY = y;
    this.setCurResult({ ...cur, products: [...products] });
    if (this.draft?.appMode === 'category') {
      this.syncResultProducts();
    }
  }

  /** Place a marker on a product owned by an individual intermediate end-item. */
  placeLeafMarker(ev: MouseEvent, box: HTMLElement, node: CardItem): void {
    if (!this.mapDotsEnabled) return;
    const rect = box.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const natural = this.loadImageNatural(this.curResult.mapImage);
    if (!natural) return;
    const scale = Math.max(rect.width / natural.w, rect.height / natural.h);
    const renderedW = natural.w * scale;
    const renderedH = natural.h * scale;
    const offsetX = (rect.width - renderedW) / 2;
    const offsetY = (rect.height - renderedH) / 2;
    const tapX = ev.clientX - rect.left;
    const tapY = ev.clientY - rect.top;
    if (tapX < offsetX || tapX > offsetX + renderedW || tapY < offsetY || tapY > offsetY + renderedH) return;
    const products = node.products || [];
    const product = products[this.leafMarkerIndex(node)];
    if (!product) return;
    const imgX = ((tapX - offsetX) / renderedW) * natural.w;
    const imgY = ((tapY - offsetY) / renderedH) * natural.h;
    product.mapX = Math.round(Math.max(0, Math.min(100, (imgX / natural.w) * 100)));
    product.mapY = Math.round(Math.max(0, Math.min(100, (imgY / natural.h) * 100)));
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
    if (!dataUrl) return;
    const natural = this.loadImageNatural(dataUrl);
    this.setCurResult({ ...this.curResult, mapImage: dataUrl, mapImageWidth: natural?.w, mapImageHeight: natural?.h });
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

  // ----- Screensaver step — Editor Deck (Timing/Behavior chips) — view-only UI
  // state, same pattern as Home/Intermediate/Result. Every option below
  // reads/writes the exact same `d.screensaver.*` properties as the original
  // vertical form — only the presentation is restructured. -----
  saverActiveChip = 0;
  saverActivePill = 0;
  saverSettingsOpen = false;

  private get saverTimingOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const d = this.draft;
    if (!d) return out;
    out.push({ key: 'secondsPerSlide', icon: 'time-outline', label: 'Seconds / slide', value: `${d.screensaver.secondsPerSlide || 5}s` });
    out.push({ key: 'idleTimeout', icon: 'hourglass-outline', label: 'Idle timeout', value: `${d.screensaver.idleTimeoutSec || 30}s` });
    out.push({ key: 'ctaText', icon: 'chatbubble-outline', label: 'CTA text', value: d.screensaver.ctaText || 'Default' });
    return out;
  }
  private get saverBehaviorOptions(): DeckOption[] {
    const out: DeckOption[] = [];
    const d = this.draft;
    if (!d) return out;
    out.push({ key: 'loop', icon: 'repeat-outline', label: 'Loop', value: d.screensaver.loop ? 'On' : 'Off' });
    out.push({ key: 'shuffle', icon: 'shuffle-outline', label: 'Shuffle', value: d.screensaver.shuffle ? 'On' : 'Off' });
    return out;
  }
  get saverCategories(): { key: string; icon: string; label: string; options: DeckOption[] }[] {
    return [
      { key: 'timing', icon: 'time-outline', label: 'Timing', options: this.saverTimingOptions },
      { key: 'behavior', icon: 'toggle-outline', label: 'Behavior', options: this.saverBehaviorOptions },
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

  // ----- Screensaver media — collapsed-row + bottom-sheet (UI-REDESIGN-PROMPT.md
  // §5). Each media item has no editable fields beyond a larger preview + delete,
  // so the sheet is a preview/delete view rather than a full form — still the
  // same pattern (collapsed row on the step, full detail in a modal). No reorder
  // method exists for media (the original had none either), so both move
  // affordances stay disabled. -----
  saverMediaModalOpen = false;
  saverMediaModalIndex: number | null = null;
  openSaverMediaPreview(i: number): void { this.saverMediaModalIndex = i; this.saverMediaModalOpen = true; }
  closeSaverMediaPreview(): void { this.saverMediaModalOpen = false; this.saverMediaModalIndex = null; }
  get saverMediaModalItem(): string | undefined {
    return this.saverMediaModalIndex != null ? this.draft?.screensaver.media?.[this.saverMediaModalIndex] : undefined;
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
