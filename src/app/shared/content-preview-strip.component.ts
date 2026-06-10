import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ThemeTokens, CardItem, ResultProduct, Screensaver } from '@contract/layout';
import { imageFitSize } from '@contract/layout';

type PreviewPage = 'home' | 'inter' | 'result' | 'saver';

/**
 * Reusable mini-LCD preview strip driven by real draft data. Used in the
 * content-builder step wizard so each step shows a live preview reflecting the
 * user's edits + the chosen theme.
 *
 * Encapsulation is None: the preview SCSS uses generic class names
 * (`.prev .stage …`) and we want them to apply to this component's markup the
 * same way they apply in the theme-wizard. The class names are unique enough
 * (prefixed `.prev`) that they don't collide with the rest of the app.
 */
@Component({
  selector: 'app-content-preview-strip',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./content-preview-strip.component.scss'],
  template: `
    <div class="cps-wrap">
      <div class="prev" [ngClass]="['fit-'+(theme?.typography?.textFit||'shrink'), 'surface-'+(theme?.cardSurface || 'flat'), 'nav-'+(theme?.navStyle || 'floating')]"
           [style.background]="backgroundForPage"
           [style.fontFamily]="theme?.typography?.fontFamily"
           [style.--prev-scale]="scaleNum"
           [style.--prev-accent]="theme?.accent"
           [style.--prev-card]="theme?.cardBackground"
           [style.--prev-text]="theme?.cardText"
           [style.--prev-overlay]="theme?.overlayColor || 'rgba(0,0,0,0.6)'"
           [ngSwitch]="page">
        <div class="hdr" *ngIf="headerVisible"
             [ngClass]="isCustomHeader ? 'hdr-custom' : ['logo-'+(theme?.logoPosition||'left'), 'hdr-style-'+(theme?.headerStyle||'logo-only')]"
             [class.hdr-transparent]="isTransparentHeader"
             [style.background]="isTransparentHeader ? 'transparent' : headerColor">
          <ng-container *ngIf="!isCustomHeader">
            <img *ngIf="showLogo" src="assets/solum-logo-white.svg" class="logo" alt="SOLUM" />
            <div class="brand-text" *ngIf="showTitle || showHeaderCaption">
              <span class="nt" *ngIf="showTitle">{{ titleText }}</span>
              <span class="cap-line" *ngIf="showHeaderCaption">{{ captionText }}</span>
            </div>
          </ng-container>
          <ng-container *ngIf="isCustomHeader">
            <div class="hzone left">
              <img *ngIf="logoPos==='left'" src="assets/solum-logo-white.svg" class="logo" alt="SOLUM" />
              <span class="nt" *ngIf="titlePos==='left'">{{ titleText }}</span>
              <span class="cap-line" *ngIf="captionPos==='left'">{{ captionText }}</span>
            </div>
            <div class="hzone center">
              <img *ngIf="logoPos==='center'" src="assets/solum-logo-white.svg" class="logo" alt="SOLUM" />
              <span class="nt" *ngIf="titlePos==='center'">{{ titleText }}</span>
              <span class="cap-line" *ngIf="captionPos==='center'">{{ captionText }}</span>
            </div>
            <div class="hzone right">
              <img *ngIf="logoPos==='right'" src="assets/solum-logo-white.svg" class="logo" alt="SOLUM" />
              <span class="nt" *ngIf="titlePos==='right'">{{ titleText }}</span>
              <span class="cap-line" *ngIf="captionPos==='right'">{{ captionText }}</span>
            </div>
          </ng-container>
        </div>

        <!-- HOME -->
        <div *ngSwitchCase="'home'" class="stage layout-{{theme?.homeLayout}} card-size-{{theme?.cardSize||'normal'}} align-{{theme?.cardAlign||'center'}} gap-{{theme?.cardGap||'normal'}}" [class.shape]="shapeCard"
             [class.has-cols]="theme?.columns !== undefined" [style.--cols]="theme?.columns"
             [class.scroll-vertical]="theme?.scrollMode==='vertical'" [class.scroll-horizontal]="theme?.scrollMode==='horizontal'">
          <div class="hero-copy" *ngIf="theme?.homeLayout==='hero-start'">
            <span>{{ titleText || 'Product Finder' }}</span>
            <b>Start Search</b>
          </div>
          <div class="promo-copy" *ngIf="theme?.homeLayout==='promo-categories'">
            <b>Featured</b>
            <span>{{ titleText || 'Find the right product faster' }}</span>
          </div>
          <!-- h-scroll layout: single scrollable rail -->
          <div class="h-scroll-rail" *ngIf="theme?.homeLayout==='h-scroll'">
            <ng-container *ngIf="(home?.length||0) > 0; else hScrollPlaceholders">
              <div *ngFor="let c of homeSlice"
                   class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                   [class.has-img]="!!c.image"
                   [style.color]="theme?.cardText" [style.borderColor]="theme?.accent">
                <div class="img" [class.placeholder]="!c.image" [style.background-image]="c.image ? 'url('+c.image+')' : null" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null" [style.background-color]="!c.image ? theme?.accent : null"></div>
                <div class="meta"><span class="name">{{ c.name || 'Item' }}</span></div>
              </div>
            </ng-container>
            <ng-template #hScrollPlaceholders>
              <div *ngFor="let n of placeholderSlots; let i = index"
                   class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                   [style.color]="theme?.cardText" [style.borderColor]="theme?.accent">
                <div class="img placeholder" [style.background]="theme?.accent"></div>
                <div class="meta"><span class="name">{{ placeholderLabels[i] }}</span></div>
              </div>
            </ng-template>
          </div>
          <!-- all other layouts -->
          <ng-container *ngIf="theme?.homeLayout!=='h-scroll'">
            <ng-container *ngIf="(home?.length||0) > 0; else homePlaceholders">
              <div *ngFor="let c of homeSlice; let i = index"
                   class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                   [class.featured]="i===0"
                   [class.has-img]="!!c.image"
                   [style.color]="theme?.cardText" [style.borderColor]="theme?.accent">
                <div class="img" [class.placeholder]="!c.image" [style.background-image]="c.image ? 'url('+c.image+')' : null" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null" [style.background-color]="!c.image ? theme?.accent : null"></div>
                <div class="meta"><span class="name">{{ c.name || 'Item' }}</span></div>
              </div>
            </ng-container>
            <ng-template #homePlaceholders>
              <div *ngFor="let n of placeholderSlots; let i = index"
                   class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                   [class.featured]="i===0"
                   [style.color]="theme?.cardText" [style.borderColor]="theme?.accent">
                <div class="img placeholder" [style.background]="theme?.accent"></div>
                <div class="meta"><span class="name">{{ placeholderLabels[i] }}</span></div>
              </div>
            </ng-template>
          </ng-container>
        </div>

        <!-- INTERMEDIATE -->
        <div *ngSwitchCase="'inter'" class="stage int int-{{theme?.intermediateStyle}} int-size-{{theme?.intermediate?.itemSize||'medium'}} int-shape-{{theme?.intermediate?.cardShape||'rect'}} int-align-{{theme?.intermediate?.align||'center'}} int-gap-{{theme?.intermediate?.gap||'normal'}}"
             [class.scroll-vertical]="theme?.scrollMode==='vertical'" [class.scroll-horizontal]="theme?.scrollMode==='horizontal'"
             [style.--int-card]="theme?.intermediate?.cardBackground"
             [style.--int-accent]="theme?.intermediate?.accent"
             [style.--int-text]="theme?.intermediate?.cardText">
          <div class="rail" *ngIf="theme?.intermediateStyle==='side-rail'">
            <b>{{ titleText || 'Finder' }}</b><span>Category</span><span>Model</span><span>Result</span>
          </div>
          <ng-container *ngIf="(intermediateSource?.length||0) > 0; else interPlaceholders">
            <div class="item" *ngFor="let it of intermediateSlice; let i = index" [class.open]="i===0">
              <div class="img" [style.background-image]="it.image ? 'url('+it.image+')' : null" [style.background-size]="fitSize(it.imageFit)" [style.background-repeat]="it.imageFit ? 'no-repeat' : null"></div>
              <span class="name">{{ it.name || 'Item' }}</span>
            </div>
          </ng-container>
          <ng-template #interPlaceholders>
            <div class="item" *ngFor="let n of placeholderSlots; let i = index" [class.open]="i===0">
              <div class="img"></div>
              <span class="name">{{ placeholderLabels[i] }}</span>
            </div>
          </ng-template>
        </div>

        <!-- RESULT -->
        <div *ngSwitchCase="'result'" class="stage result res-{{theme?.resultTemplate}}"
             [class.scroll-vertical]="theme?.scrollMode==='vertical'" [class.scroll-horizontal]="theme?.scrollMode==='horizontal'">
          <div class="map" [style.borderColor]="theme?.result?.pathColor" [style.background-image]="result?.mapImage ? 'url('+result?.mapImage+')' : null">
            <div class="path path-{{theme?.result?.pathStyle}}" [style.background]="theme?.result?.pathColor" [style.borderColor]="theme?.result?.pathColor"></div>
          </div>
          <div class="promo" *ngIf="theme?.resultTemplate==='promo-list'" [style.background-image]="result?.promoImage ? 'url('+result?.promoImage+')' : null"></div>
          <div class="focus" *ngIf="theme?.resultTemplate==='product-focus'">
            <b>{{ (result?.products?.[0]?.price) || 'Best Match' }}</b>
            <span>Find Me</span>
          </div>
          <div class="filters side" *ngIf="theme?.resultTemplate==='map-filter-list'">
            <span class="filter on" [style.background]="theme?.result?.accent">All</span>
            <span class="filter">Care</span>
          </div>
          <div class="stair-mock" *ngIf="theme?.resultTemplate==='drill-filter'">
            <span class="sc" [style.background]="theme?.result?.accent"></span>
            <span class="sc" [style.background]="theme?.result?.accent"></span>
          </div>
          <div class="list">
            <ng-container *ngIf="(result?.products?.length||0) > 0; else prodPlaceholders">
              <div class="prod" *ngFor="let p of resultSlice; let i = index" [class.found]="i===0"
                   [style.background]="theme?.result?.cardBackground" [style.color]="theme?.result?.cardText"
                   [style.borderColor]="i===0 ? theme?.result?.accent : 'transparent'">
                <span class="dot" [style.background]="theme?.result?.accent"></span>{{ p.name || 'Product' }}
              </div>
            </ng-container>
            <ng-template #prodPlaceholders>
              <div class="prod" *ngFor="let n of [0,1,2]; let i = index" [class.found]="i===0"
                   [style.background]="theme?.result?.cardBackground" [style.color]="theme?.result?.cardText"
                   [style.borderColor]="i===0 ? theme?.result?.accent : 'transparent'">
                <span class="dot" [style.background]="theme?.result?.accent"></span>Product
              </div>
            </ng-template>
          </div>
        </div>
        <div class="mock-nav"
             *ngIf="page !== 'home' && page !== 'saver' && navVisible"
             [ngClass]="'nav-pos-'+(theme?.nav?.position || 'bottom-left')">
          <span class="mock-btn"
                [style.color]="theme?.nav?.backColor || '#fff'"
                [style.background]="theme?.nav?.backBg || 'rgba(0,0,0,.35)'">&#8249;</span>
          <span class="mock-btn"
                [style.color]="theme?.nav?.homeColor || '#fff'"
                [style.background]="theme?.nav?.homeBg || 'rgba(0,0,0,.35)'">&#8962;</span>
        </div>

        <!-- SCREENSAVER -->
        <div *ngSwitchCase="'saver'" class="stage saver saver-{{screensaver?.mode || 'slideshow'}}">
          <div class="ss-media">
            <ng-container *ngIf="(screensaver?.media?.length||0) > 0; else saverPlaceholders">
              <span class="ss-slide" *ngFor="let m of (screensaver?.media || []).slice(0,3)" [style.background-image]="'url('+m+')'"></span>
            </ng-container>
            <ng-template #saverPlaceholders>
              <span class="ss-slide" [style.background]="theme?.headerColor"></span>
              <span class="ss-slide" [style.background]="theme?.accent"></span>
              <span class="ss-slide" [style.background]="theme?.background"></span>
            </ng-template>
          </div>
          <span class="ss-play" *ngIf="screensaver?.mode === 'video'">&#9654;</span>
          <span class="ss-badge">{{ saverBadge }}</span>
          <div class="ss-overlay"></div>
          <div class="ss-c"
               *ngIf="saverShowContent"
               [ngClass]="'ss-pos-'+(theme?.saverOverlay?.position || 'center')"
               [style.background]="theme?.saverOverlay?.bgColor || 'transparent'"
               [style.color]="theme?.saverOverlay?.textColor || '#fff'">
            <img src="assets/solum-logo-white.svg" class="logo" alt="SOLUM" />
            <div class="nt">{{ theme?.saverOverlay?.title || screensaver?.ctaText || titleText || 'Newton Touch' }}</div>
            <div class="cta">{{ theme?.saverOverlay?.subtitle || 'Touch screen to begin' }}</div>
          </div>
        </div>
      </div>
      <div class="cps-cap" *ngIf="showStripCaption">{{ caption || pageCaption }} preview</div>
    </div>
  `,
})
export class ContentPreviewStripComponent {
  /** Per-item image fit → CSS background-size (null = preview default) — matches the LCD. */
  fitSize = imageFitSize;
  @Input() theme?: ThemeTokens;
  @Input() page: PreviewPage = 'home';
  @Input() home: CardItem[] = [];
  @Input() intermediate: CardItem[] = [];
  @Input() result?: { mapImage?: string; promoImage?: string; products: ResultProduct[] };
  @Input() screensaver?: Screensaver;
  @Input() header?: { title?: string; caption?: string };
  /** Optional caption override under the strip. */
  @Input() caption?: string;
  /** Set false to hide the caption text under the preview. */
  @Input() showStripCaption = true;
  @Input() draftName?: string;

  readonly placeholderSlots = [0, 1, 2, 3, 4, 5];
  readonly placeholderLabels = ['Bakery', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Drinks'];

  get scaleNum(): number {
    const s = this.theme?.typography?.textScale;
    return s === 'compact' ? 0.8 : s === 'large' ? 1.25 : 1;
  }
  get shapeCard(): boolean {
    const sh = this.theme?.cardShape;
    const layout = this.theme?.homeLayout;
    return (sh === 'circle' || sh === 'hexagon') && !['image-strip', 'fullscreen', 'hero-start', 'promo-categories', 'h-scroll', 'bento'].includes(layout || '');
  }
  get navVisible(): boolean { return (this.theme?.navStyle || 'floating') !== 'hidden'; }
  get saverShowContent(): boolean { return this.theme?.saverOverlay?.showContent !== false; }
  get headerColor(): string | undefined {
    return this.page === 'inter' ? this.theme?.intermediate?.headerColor
      : this.page === 'result' ? this.theme?.result?.headerColor
      : this.theme?.headerColor;
  }
  get headerVisible(): boolean {
    if (this.page === 'saver') return false;
    if (this.page === 'inter') return this.theme?.intermediate?.showHeader !== false;
    if (this.page === 'result') return this.theme?.result?.showHeader !== false;
    return this.theme?.showHeader !== false;
  }
  get backgroundForPage(): string | undefined {
    const bg = this.page === 'inter' ? this.theme?.intermediate?.background
      : this.page === 'result' ? this.theme?.result?.background
      : this.theme?.background;
    const image = this.page === 'inter' ? this.theme?.intermediate?.backgroundImage
      : this.page === 'result' ? this.theme?.result?.backgroundImage
      : this.theme?.backgroundImage;
    return image ? `linear-gradient(rgba(0,0,0,.28), rgba(0,0,0,.28)), url("${image}") center/cover no-repeat, ${bg || '#000'}` : bg;
  }
  get pageCaption(): string {
    return this.page === 'inter' ? 'Intermediate'
      : this.page === 'result' ? 'Result'
      : this.page === 'saver' ? 'Screensaver'
      : 'Home';
  }
  get homeSlice(): CardItem[] { return (this.home || []).slice(0, 6); }
  get intermediateSource(): CardItem[] {
    // Mirror the LCD runtime (IntermediateComponent.load): the intermediate page
    // shows the *opened* node's OWN children first, and only falls back to the
    // SHARED default intermediate list when that node has no custom subtree.
    // The preview drills from the first home card, so use its children if present.
    const ownChildren = this.home?.[0]?.children || [];
    if (ownChildren.length) return ownChildren;
    return this.intermediate || [];
  }
  get intermediateSlice(): CardItem[] { return this.intermediateSource.slice(0, 6); }
  get resultSlice(): ResultProduct[] { return (this.result?.products || []).slice(0, 6); }
  get saverBadge(): string {
    const m = this.screensaver?.mode;
    return m === 'single-image' ? 'Single image' : m === 'video' ? 'Video' : 'Slideshow';
  }

  // Header style logic mirrors the LCD home component.
  get headerStyle(): string { return this.theme?.headerStyle || 'logo-only'; }
  get isTransparentHeader(): boolean {
    if (this.page === 'inter') return !!this.theme?.intermediate?.transparentHeader;
    if (this.page === 'result') return !!this.theme?.result?.transparentHeader;
    return !!this.theme?.transparentHeader;
  }
  get isCustomHeader(): boolean { return (this.theme?.headerLayout || 'preset') === 'custom'; }
  get logoPos(): string { return this.theme?.logoPos || 'left'; }
  get titlePos(): string { return this.theme?.titlePos || 'center'; }
  get captionPos(): string { return this.theme?.captionPos || 'center'; }
  get showLogo(): boolean {
    if (this.isCustomHeader) return this.logoPos !== 'hidden';
    return this.headerStyle === 'logo-only' || this.headerStyle === 'logo+title' || this.headerStyle === 'logo+title+caption';
  }
  get showTitle(): boolean {
    if (this.isCustomHeader) return this.titlePos !== 'hidden';
    return this.headerStyle !== 'logo-only';
  }
  get showHeaderCaption(): boolean {
    if (this.isCustomHeader) return this.captionPos !== 'hidden';
    return this.headerStyle === 'title+caption' || this.headerStyle === 'logo+title+caption';
  }
  get titleText(): string { return this.header?.title || this.draftName || ''; }
  get captionText(): string { return this.header?.caption || ''; }
}
