import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { ThemeTokens, CardItem, ResultProduct, Screensaver } from '@contract/layout';
import { imageFitSize, NAV_ICONS, navIconKind, textScaleNum, textCaseCss, navBtnSizeNum } from '@contract/layout';

type PreviewPage = 'home' | 'inter' | 'result' | 'saver';

/**
 * Reusable mini-LCD preview strip driven by real draft data.
 *
 * The preview emits the SAME class names + DOM structure as the LCD renderer
 * (apps/newtontouch-lcd pages) and is styled by the SHARED stylesheet
 * src/styles/_nt-layouts.scss (imported globally). The stage (.prev.nt-stage)
 * enforces the 1920:540 aspect and exposes the var-based stage units
 * --nt-vw / --nt-vh / --nt-vmin in px, computed from the measured stage width.
 *
 * Encapsulation is None so the global shared rules apply unscoped; the local
 * SCSS keeps only studio chrome (frame, caption, screensaver mock).
 */
@Component({
  selector: 'app-content-preview-strip',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./content-preview-strip.component.scss'],
  template: `
    <div class="cps-wrap">
      <div class="prev nt-stage" #ntStage [ngClass]="prevClasses"
           [style.background]="backgroundForPage"
           [style.fontFamily]="theme?.typography?.fontFamily"
           [style.--nt-text-scale]="scaleNum"
           [style.--nt-gscale]="scaleNum"
           [style.--nt-card-text-scale]="cardScaleNum"
           [style.--nt-header-text-scale]="headerScaleNum"
           [style.--nt-card-text-case]="cardCase"
           [style.--nt-header-text-case]="headerCase"
           [style.--nt-nav-btn-size]="navBtnSize"
           [style.--nt-card-scale]="cardSizeScaleNum"
           [style.--nt-card-align]="cardAlignCss"
           [style.--nt-font]="theme?.typography?.fontFamily"
           [style.--nt-base-text]="theme?.typography?.baseTextColor"
           [style.--nt-accent]="theme?.accent"
           [style.--nt-card]="theme?.cardBackground"
           [style.--nt-text]="theme?.cardText"
           [style.--nt-overlay]="theme?.overlayColor || 'rgba(0,0,0,0.6)'"
           [style.--prev-scale]="scaleNum"
           [style.--prev-accent]="theme?.accent"
           [style.--prev-card]="theme?.cardBackground"
           [style.--prev-text]="theme?.cardText"
           [style.--prev-overlay]="theme?.overlayColor || 'rgba(0,0,0,0.6)'"
           [style.--nt-int-card]="theme?.intermediate?.cardBackground"
           [style.--nt-int-accent]="theme?.intermediate?.accent"
           [style.--nt-int-text]="theme?.intermediate?.cardText"
           [style.--nt-res-card]="theme?.result?.cardBackground"
           [style.--nt-res-accent]="theme?.result?.accent"
           [style.--nt-res-text]="theme?.result?.cardText"
           [style.--nt-res-header]="theme?.result?.headerColor"
           [style.--prm-panel]="theme?.result?.panelColor"
           [style.--prm-subpanel]="theme?.result?.subPanelColor"
           [style.--prm-accent]="theme?.result?.accent"
           [style.--prm-map]="theme?.result?.mapBg"
           [style.--prm-rail]="theme?.result?.railBg"
           [style.--prm-list]="theme?.result?.listBg"
           [style.--prm-card]="theme?.result?.cardBg"
           [style.--prm-cardtext]="theme?.result?.cardTextColor"
           [style.--nt-path]="routeColor"
           [style.--nt-route-x]="routeX" [style.--nt-route-y]="routeY" [style.--nt-route-w]="routeW"
           [ngSwitch]="page">
        <!-- HEADER (LCD markup: .hdr > .brand-logo + .brand-text(.title/.caption)) -->
        <div class="hdr" *ngIf="headerVisible"
             [class.right]="logoRight && !isCustomHeader" [class.center]="logoCenter && !isCustomHeader"
             [class.hdr-transparent]="isTransparentHeader" [class.hdr-custom]="isCustomHeader"
             [ngClass]="isCustomHeader ? '' : ('hdr-style-' + headerStyle)"
             [style.background]="isTransparentHeader ? 'transparent' : headerColor">
          <ng-container *ngIf="!isCustomHeader">
            <img *ngIf="showLogo" src="assets/solum-logo-white.svg" alt="Logo" class="brand-logo" />
            <div class="brand-text" *ngIf="showTitle || showHeaderCaption">
              <span class="title" *ngIf="showTitle">{{ titleText }}</span>
              <span class="caption" *ngIf="showHeaderCaption">{{ captionText }}</span>
            </div>
          </ng-container>
          <ng-container *ngIf="isCustomHeader">
            <div class="hzone left">
              <img *ngIf="logoPos==='left'" src="assets/solum-logo-white.svg" alt="Logo" class="brand-logo" />
              <span class="title" *ngIf="titlePos==='left'">{{ titleText }}</span>
              <span class="caption" *ngIf="captionPos==='left'">{{ captionText }}</span>
            </div>
            <div class="hzone center">
              <img *ngIf="logoPos==='center'" src="assets/solum-logo-white.svg" alt="Logo" class="brand-logo" />
              <span class="title" *ngIf="titlePos==='center'">{{ titleText }}</span>
              <span class="caption" *ngIf="captionPos==='center'">{{ captionText }}</span>
            </div>
            <div class="hzone right">
              <img *ngIf="logoPos==='right'" src="assets/solum-logo-white.svg" alt="Logo" class="brand-logo" />
              <span class="title" *ngIf="titlePos==='right'">{{ titleText }}</span>
              <span class="caption" *ngIf="captionPos==='right'">{{ captionText }}</span>
            </div>
          </ng-container>
        </div>

        <!-- HOME (LCD markup: .cards.layout-*) -->
        <div *ngSwitchCase="'home'" class="cards layout-{{theme?.homeLayout}} card-size-{{theme?.cardSize||'normal'}} align-{{theme?.cardAlign||'center'}} valign-{{theme?.cardVAlign||'middle'}} gap-{{theme?.cardGap||'normal'}} htext-{{theme?.cardTextPos||'center'}}" [class.shape]="shapeCard" [class.shape-hex]="shapeCard && theme?.cardShape==='hexagon'"
             [class.has-cols]="cols !== undefined" [style.--cols]="cols" [style.--card-gap]="cardGapPx"
             [class.scroll-vertical]="theme?.scrollMode==='vertical'" [class.scroll-horizontal]="theme?.scrollMode==='horizontal'" [class.no-overlay]="theme?.cardTextOverlay === false">
          <div class="hero-copy" *ngIf="theme?.homeLayout==='hero-start'">
            <span>{{ titleText || 'Product Finder' }}</span>
            <b>Start Search</b>
          </div>
          <div class="promo-copy" *ngIf="theme?.homeLayout==='promo-categories'">
            <b>Featured</b>
            <span>{{ titleText || 'Find the right product faster' }}</span>
          </div>
          <!-- promo-categories: scrollable rail, copy pinned left (mirrors LCD) -->
          <div class="promo-rail" *ngIf="theme?.homeLayout==='promo-categories'">
            <div class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                 [class.has-img]="!!c.image || usePh" *ngFor="let c of homeCells; let i = index">
              <div class="img" [class.placeholder]="!c.image && !usePh" [style.background-image]="c.image ? 'url('+c.image+')' : (usePh ? phImg(i) : null)" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null" [style.background-color]="(!c.image && !usePh) ? theme?.accent : null"></div>
              <div class="meta"><span class="name">{{ c.name }}</span><span class="price" *ngIf="c.price">{{ c.price }}<span class="unit" *ngIf="c.unit"> / {{ c.unit }}</span></span></div>
            </div>
          </div>
          <!-- h-scroll: single horizontally-scrolling rail -->
          <div class="h-scroll-rail" *ngIf="theme?.homeLayout==='h-scroll'">
            <div class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                 [class.has-img]="!!c.image || usePh" *ngFor="let c of homeCells; let i = index">
              <div class="img" [class.placeholder]="!c.image && !usePh" [style.background-image]="c.image ? 'url('+c.image+')' : (usePh ? phImg(i) : null)" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null" [style.background-color]="(!c.image && !usePh) ? theme?.accent : null"></div>
              <div class="meta"><span class="name">{{ c.name }}</span><span class="price" *ngIf="c.price">{{ c.price }}<span class="unit" *ngIf="c.unit"> / {{ c.unit }}</span></span></div>
            </div>
          </div>
          <!-- all other layouts -->
          <ng-container *ngIf="theme?.homeLayout!=='h-scroll' && theme?.homeLayout!=='promo-categories'">
            <div class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                 [class.featured]="i===0" [class.has-img]="!!c.image || usePh" *ngFor="let c of homeCells; let i = index">
              <div class="img" [class.placeholder]="!c.image && !usePh" [style.background-image]="c.image ? 'url('+c.image+')' : (usePh ? phImg(i) : null)" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null" [style.background-color]="(!c.image && !usePh) ? theme?.accent : null"></div>
              <div class="meta"><span class="name">{{ c.name }}</span><span class="price" *ngIf="c.price">{{ c.price }}<span class="unit" *ngIf="c.unit"> / {{ c.unit }}</span></span></div>
            </div>
          </ng-container>
        </div>

        <!-- INTERMEDIATE (LCD markup: .body.int-*) -->
        <ng-container *ngSwitchCase="'inter'">
          <!-- finder-select: hero progress rail + selection cards + index strip -->
          <div class="body fs-body" *ngIf="theme?.intermediateStyle==='finder-select'" [style.--prm-panel]="theme?.intermediate?.heroColor || null" [style.--prm-accent]="theme?.intermediate?.accent || null">
            <div class="fs-hero">
              <div class="fs-hero-title">{{ titleText || 'Product Finder' }}</div>
              <div class="fs-home"><span class="fs-home-ic">&#8962;</span> Home</div>
              <div class="fs-steps">
                <div class="fs-step done"><span class="fs-step-lbl">Manufacturer</span><span class="fs-step-ic">&#10003;</span></div>
                <div class="fs-step done"><span class="fs-step-lbl">Model</span><span class="fs-step-ic">&#10003;</span></div>
                <div class="fs-step current"><span class="fs-step-lbl">Year</span><span class="fs-step-dot"></span></div>
              </div>
            </div>
            <div class="fs-main">
              <div class="fs-top"><button type="button" class="fs-back">&#8592;</button><div class="fs-prompt">{{ (theme?.intermediate?.promptPrefix || 'TOUCH YOUR') }} YEAR</div></div>
              <div class="fs-cards"><div class="fs-card" *ngFor="let it of interCells.slice(0,5)"><span class="fs-card-nm">{{ it.name }}</span></div></div>
              <div class="fs-index fs-index-values"><span class="fs-val" *ngFor="let it of interCells.slice(0,6); let i=index" [class.active]="i===0">{{ it.name }}</span></div>
            </div>
          </div>
          <ng-container *ngIf="theme?.intermediateStyle!=='finder-select'">
          <!-- drill-stair: side-by-side columns (mirrors LCD .col structure) -->
          <div class="body int-drill-stair" *ngIf="theme?.intermediateStyle==='drill-stair'; else flatInter">
            <div class="col">
              <div class="col-label">Category</div>
              <div class="col-items">
                <div class="col-item" *ngFor="let it of interCells; let i = index" [class.picked]="i===0">{{ it.name }}</div>
              </div>
            </div>
            <div class="col col-result">
              <div class="rprod">
                <div class="rprod-name">{{ interCells[0].name }}</div>
                <div class="rprod-price">$0.00</div>
                <div class="rprod-aisle">Aisle 1</div>
              </div>
            </div>
          </div>
          </ng-container>
          <ng-template #flatInter>
            <div class="body int-{{theme?.intermediateStyle}} int-size-{{theme?.intermediate?.itemSize||'medium'}} int-shape-{{theme?.intermediate?.cardShape||'rect'}} int-align-{{theme?.intermediateStyle==='side-rail' ? 'left' : (theme?.intermediate?.align||'center')}} int-gap-{{theme?.intermediate?.gap||'normal'}} int-content-{{theme?.intermediate?.content||'image-text'}} int-textpos-{{theme?.intermediate?.textPos||'below'}} int-valign-{{theme?.intermediate?.valign||'middle'}}"
                 [class.scroll-vertical]="theme?.scrollMode==='vertical'" [class.scroll-horizontal]="theme?.scrollMode==='horizontal'" [class.no-overlay]="theme?.intermediate?.textOverlay === false" [style.--int-cols]="theme?.intermediate?.columns || 3" [style.--nt-int-scale]="theme?.intermediate?.itemSizeScale || 1">
              <div class="item" *ngFor="let it of interCells; let i = index" [class.open]="i===0">
                <div class="img" [class.no-img]="!it.image && !interUsePh" [style.background-image]="it.image ? 'url('+it.image+')' : (interUsePh ? phImg(i) : null)" [style.background-size]="fitSize(it.imageFit)" [style.background-repeat]="it.imageFit ? 'no-repeat' : null"></div>
                <span class="name">{{ it.name }}</span>
              </div>
            </div>
          </ng-template>
        </ng-container>

        <!-- RESULT (LCD markup: res-* class on the stage, .body variants inside) -->
        <ng-container *ngSwitchCase="'result'">
          <!-- drill-stair -->
          <div class="body stair" *ngIf="resTpl==='drill-stair'">
            <div class="scol">
              <div class="scol-label">Category</div>
              <div class="scol-items">
                <div class="scol-item" *ngFor="let p of resultCells; let i = index" [class.picked]="isFound(i)" (click)="selectResult(i)">{{ p.name }}</div>
              </div>
            </div>
            <div class="scol scol-result">
              <div class="rprod">
                <div class="rprod-img" *ngIf="found?.image" [style.background-image]="'url('+found?.image+')'" [style.background-size]="fitSize(found?.imageFit)" [style.background-repeat]="found?.imageFit ? 'no-repeat' : null"></div>
                <div class="rprod-name">{{ found?.name || 'Product' }}</div>
                <div class="rprod-price" *ngIf="found?.price">{{ found?.price }}</div>
                <div class="rprod-aisle" *ngIf="found?.aisle">Aisle {{ found?.aisle }}</div>
              </div>
            </div>
          </div>
          <!-- drill-filter -->
          <div class="body stair" *ngIf="resTpl==='drill-filter'">
            <div class="scol">
              <div class="scol-items">
                <div class="scol-item" *ngFor="let p of resultCells.slice(0,3); let i = index" [class.picked]="isFound(i)" (click)="selectResult(i)">{{ p.name }}</div>
              </div>
            </div>
            <div class="scol scol-flist">
              <div class="filter-tabs">
                <div class="ftab active">Popular</div>
                <div class="ftab">Alphabetic</div>
              </div>
              <div class="filter-list">
                <div class="fitem" [class.found]="isFound(i)" *ngFor="let p of resultCells; let i = index" (click)="selectResult(i)">
                  <span class="fnum">{{ i + 1 }}</span>
                  <div class="finfo">
                    <div class="fnm">{{ p.name }}</div>
                    <div class="fmeta" *ngIf="p.price">Price {{ p.price }}<span *ngIf="p.aisle"> · Zone {{ p.aisle }}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- filter-list -->
          <div class="body filter-body" *ngIf="resTpl==='filter-list'">
            <div class="filter-tabs">
              <div class="ftab active">Popular</div>
              <div class="ftab">Alphabetical</div>
            </div>
            <div class="filter-list">
                <div class="fitem" [class.found]="isFound(i)" *ngFor="let p of resultCells; let i = index" (click)="selectResult(i)">
                <span class="fnum">{{ i + 1 }}</span>
                <div class="finfo">
                  <div class="fnm">{{ p.name }}</div>
                  <div class="fmeta" *ngIf="p.price">Price {{ p.price }}<span *ngIf="p.aisle"> · Zone {{ p.aisle }}</span></div>
                </div>
              </div>
            </div>
          </div>
          <!-- map-filter-list -->
          <div class="body map-filter-body" *ngIf="resTpl==='map-filter-list'">
            <div class="map" [style.background-image]="result?.mapImage ? 'url('+result?.mapImage+')' : null">
              <div class="marker" *ngIf="markerVisible" [style.top]="markerTop" [style.left]="markerLeft" [style.background]="markerColor"></div>
            </div>
            <div class="filter-rail">
              <div class="ftab active">Popular</div>
              <div class="ftab">Alphabetical</div>
            </div>
            <div class="filter-list">
              <div class="fitem" [class.found]="isFound(i)" *ngFor="let p of resultCells; let i = index" (click)="selectResult(i)">
                <span class="fnum">{{ i + 1 }}</span>
                <div class="finfo">
                  <div class="fnm">{{ p.name }}</div>
                  <div class="fmeta" *ngIf="p.price">Price {{ p.price }}<span *ngIf="p.aisle"> · Zone {{ p.aisle }}</span></div>
                </div>
              </div>
            </div>
          </div>
          <!-- promo-list -->
          <div class="body promo-body" *ngIf="resTpl==='promo-list'">
            <div class="promo-panel" [style.background-image]="result?.promoImage ? 'url('+result?.promoImage+')' : null">
              <div class="promo-fallback" *ngIf="!result?.promoImage">Promotion</div>
            </div>
            <div class="promo-products">
              <div class="filter-tabs">
                <div class="ftab active">Popular</div>
                <div class="ftab">Alphabetical</div>
              </div>
              <div class="prod" [class.found]="isFound(i)" *ngFor="let p of resultCells.slice(0,5); let i = index" (click)="selectResult(i)">
                <div class="info">
                  <div class="nm">{{ p.name }}<span class="price" *ngIf="p.price"> · {{ p.price }}</span></div>
                  <div class="loc" *ngIf="p.aisle">ZONE {{ p.aisle }}</div>
                </div>
              </div>
            </div>
            <div class="selected-tags">
              <div class="tag" *ngFor="let p of resultCells.slice(0,4)">#{{ p.aisle || p.name }}</div>
            </div>
          </div>
          <!-- product-focus -->
          <div class="body product-focus-body" *ngIf="resTpl==='product-focus'">
            <div class="focus-copy">
              <div class="label">Best Match</div>
              <div class="name">{{ found?.name || 'Product' }}</div>
              <div class="meta" *ngIf="found?.aisle">Aisle {{ found?.aisle }}</div>
              <div class="price" *ngIf="found?.price">{{ found?.price }}</div>
              <button type="button">Find Me</button>
            </div>
            <div class="focus-image" *ngIf="found?.image" [style.background-image]="'url('+found?.image+')'" [style.background-size]="fitSize(found?.imageFit)" [style.background-repeat]="found?.imageFit ? 'no-repeat' : null"></div>
            <div class="focus-list">
              <div class="mini" *ngFor="let p of resultCells.slice(0,4); let i = index" [class.found]="isFound(i)" (click)="selectResult(i)">{{ p.name }}</div>
            </div>
          </div>
          <!-- hero-product -->
          <div class="body hero-product-body" *ngIf="resTpl==='hero-product'">
            <div class="hp-benefits">
              <div class="hp-bullet">Made for what you picked</div>
              <div class="hp-bullet">Fresh, quality &amp; ready to go</div>
            </div>
            <div class="hp-product">
              <div class="hp-img" [style.background-image]="found?.image ? 'url('+found?.image+')' : null" [style.background-size]="fitSize(found?.imageFit)" [style.background-repeat]="found?.imageFit ? 'no-repeat' : null"></div>
              <div class="hp-info">
                <div class="hp-tag">Popular</div>
                <div class="hp-name">{{ found?.name || 'Product' }}</div>
                <div class="hp-price" *ngIf="found?.price">{{ found?.price }}</div>
                <button type="button">Find Me</button>
              </div>
            </div>
            <div class="hp-headline">Awesome!<span>Loved your pick!</span></div>
          </div>
          <!-- shelf: side category panel + product shelf -->
          <div class="body shelf-body" *ngIf="resTpl==='shelf'">
            <div class="shelf-side" [class.no-img]="!result?.promoImage" [style.background-image]="result?.promoImage ? 'url('+result?.promoImage+')' : null">
              <div class="shelf-title">{{ captionText || titleText }}</div>
            </div>
            <div class="shelf-main">
              <div class="filter-tabs">
                <div class="ftab active">Popular</div>
                <div class="ftab">Alphabetical</div>
              </div>
              <div class="shelf-prods">
                <div class="sprod" [class.found]="isFound(i)" *ngFor="let p of resultCells; let i = index" (click)="selectResult(i)">
                  <div class="s-img" [class.no-img]="!p.image && !resUsePh" [style.background-image]="p.image ? 'url('+p.image+')' : (resUsePh ? phImg(i) : null)" [style.background-size]="fitSize(p.imageFit)"></div>
                  <div class="s-nm">{{ p.name }}</div>
                  <div class="s-price" *ngIf="p.price">{{ p.price }}</div>
                  <div class="s-meta" *ngIf="p.aisle">Zone {{ p.aisle }}</div>
                </div>
              </div>
            </div>
          </div>
          <!-- promo-map-rank -->
          <div class="body promo-rank-body" *ngIf="resTpl==='promo-map-rank'">
            <div class="prm-map" [style.background-image]="result?.mapImage ? 'url('+result?.mapImage+')' : null">
              <div class="prm-shelf" *ngFor="let s of shelfRects" [style.top]="s.t" [style.left]="s.l" [style.width]="s.w" [style.height]="s.h"></div>
              <div class="prm-dot" *ngFor="let p of resultCells.slice(0,3); let i=index" [style.top]="(40+i*16)+'%'" [style.left]="(30+i*16)+'%'" [style.background]="theme?.result?.dotColor || null"></div>
              <div class="prm-pin" style="top:32%;left:34%;" [style.background]="theme?.result?.pinColor || null"><span class="prm-pin-lbl" *ngIf="theme?.result?.youAreHereLabel !== ''">{{ theme?.result?.youAreHereLabel || 'YOU ARE HERE' }}</span></div>
              <div class="prm-floors">
                <div class="prm-floor" *ngFor="let f of previewFloors; let i=index" [class.active]="i === previewFloors.length - 1">{{ f }}</div>
              </div>
            </div>
            <div class="prm-panel">
              <div class="prm-head"><span class="prm-title">{{ titleText || 'Promotion' }}</span><span class="prm-bell" *ngIf="theme?.result?.showBell">&#128276;</span><span class="prm-timer" *ngIf="theme?.result?.showTimer">00:25:53</span></div>
              <div class="prm-cols">
                <div class="prm-primary"><div class="prm-pill" *ngFor="let c of homeCells.slice(0,5); let i=index" [class.active]="i===3">{{ c.name }}</div></div>
                <div class="prm-secondary"><div class="prm-sub" *ngFor="let s of interCells.slice(0,5); let i=index" [class.active]="i===0">{{ s.name }}</div></div>
                <div class="prm-listwrap">
                  <div class="prm-tabs" *ngIf="theme?.result?.showSortTabs!==false"><div class="ftab active">Popular</div><div class="ftab">Alphabetical</div></div>
                  <div class="prm-list"><div class="prm-row" [class.found]="i===0" *ngFor="let p of promoCells; let i=index"><span class="prm-rank" *ngIf="theme?.result?.showRanks!==false">{{ i+1 < 10 ? '0'+(i+1) : i+1 }}</span><div class="prm-info"><div class="prm-nm">{{ p.name }}</div><div class="prm-meta"><span *ngIf="p.price">{{ p.price }}</span><span *ngIf="theme?.result?.showZone!==false && (p.zone||p.aisle)"> &middot; {{ p.zone||p.aisle }}</span></div></div></div></div>
                </div>
              </div>
            </div>
          </div>

          <!-- finder-detail -->
          <div class="body finder-body" *ngIf="resTpl==='finder-detail'">
            <div class="fd-hero" [style.background-image]="theme?.result?.heroImage ? 'url('+theme?.result?.heroImage+')' : null">
              <div class="fd-hero-title">{{ titleText || 'Product Finder' }}</div>
              <div class="fd-home"><span class="fd-home-ic">&#8962;</span> Home</div>
              <div class="fd-chips"><div class="fd-chip" *ngFor="let c of breadcrumbPreview"><span class="fd-chip-lbl">{{ c.label }}</span><span class="fd-chip-val">{{ c.value }}</span></div></div>
            </div>
            <div class="fd-list">
              <div class="fd-sorts"><div class="fd-sort active">Recommend</div><div class="fd-sort">A&ndash;Z</div></div>
              <div class="fd-prod" [class.found]="i===0" *ngFor="let p of finderCells; let i=index">
                <div class="fd-prod-top"><div class="fd-prod-nm">{{ p.name }}</div><div class="fd-price"><span class="fd-sale-badge" *ngIf="theme?.result?.showSaleBadge!==false && p.onSale">SALE</span><span class="fd-orig" *ngIf="p.onSale && p.salePrice">{{ p.price }}</span><span class="fd-now" [class.sale]="p.onSale && p.salePrice">{{ (p.onSale && p.salePrice) ? p.salePrice : (p.price || '$58.88') }}</span></div></div>
                <div class="fd-specs" *ngIf="p.specs?.length"><span class="fd-spec" *ngFor="let s of p.specs">{{ s.label }} &middot; {{ s.value }}</span></div>
              </div>
            </div>
            <div class="fd-detail" *ngIf="finderFound as r">
              <div class="fd-d-head"><div class="fd-d-title">{{ r.name }}</div><button type="button" class="fd-find-all" [style.background]="theme?.result?.findColor || null">{{ theme?.result?.findAllLabel || 'Find All' }}</button></div>
              <div class="fd-d-desc" *ngIf="r.description">{{ r.description }}</div>
              <div class="fd-fit" *ngFor="let f of (r.fitments?.length ? r.fitments : previewFitments)">
                <div class="fd-fit-info"><div class="fd-fit-nm">{{ f.label }}</div><div class="fd-fit-sub" *ngIf="f.articleId || f.name">{{ f.articleId }}<span *ngIf="f.name"> &middot; {{ f.name }}</span></div><div class="fd-fit-price"><span class="fd-orig" *ngIf="f.salePrice">{{ f.price }}</span><span class="fd-now" [class.sale]="f.salePrice">{{ f.salePrice || f.price }}</span></div></div>
                <button type="button" class="fd-find-it" [style.background]="theme?.result?.findColor || null">{{ theme?.result?.findItLabel || 'Find It' }}</button>
                <div class="fd-fit-img" *ngIf="f.image" [style.background-image]="'url('+f.image+')'"></div>
              </div>
            </div>
          </div>

          <!-- default: map + list -->
          <div class="body" *ngIf="!specialResult">
            <div class="map" [style.background-image]="result?.mapImage ? 'url('+result?.mapImage+')' : null">
              <div class="marker" *ngIf="markerVisible" [style.top]="markerTop" [style.left]="markerLeft" [style.background]="markerColor"></div>
            </div>
            <div class="list">
              <div class="prod" [class.found]="isFound(i)" *ngFor="let p of resultCells; let i = index" (click)="selectResult(i)">
                <div class="img" [style.background-image]="p.image ? 'url('+p.image+')' : (resUsePh ? phImg(i) : null)" [style.background-size]="fitSize(p.imageFit)" [style.background-repeat]="p.imageFit ? 'no-repeat' : null"></div>
                <div class="info">
                  <div class="nm">{{ p.name }}<span class="price" *ngIf="p.price"> · {{ p.price }}</span></div>
                  <div class="loc" *ngIf="p.aisle">AISLE {{ p.aisle }}</div>
                </div>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- NAV (LCD markup: .nav.nav-pos-* > .fb) — grouped OR split (independent positions) -->
        <ng-container *ngIf="page !== 'home' && page !== 'saver' && (theme?.navStyle || 'floating') !== 'hidden'">
          <ng-template #backBtn>
            <div class="fb" [class.fb-text]="navMode === 'text'" [class.fb-icon-text]="navMode === 'icon-text'"
                 [style.color]="theme?.nav?.backColor || '#fff'" [style.background]="theme?.nav?.backBg || 'rgba(0,0,0,.35)'">
              <ng-container *ngIf="navMode !== 'text'">
                <span class="fb-ic" *ngIf="backIconHtml" [innerHTML]="backIconHtml"></span>
                <img class="fb-img" *ngIf="backIconCustom" [src]="backIconCustom" alt="" />
                <ng-container *ngIf="!backIconHtml && !backIconCustom">&#8592;</ng-container>
              </ng-container>
              <span class="fb-lbl" *ngIf="navMode !== 'icon'">{{ navBackLabel }}</span>
            </div>
          </ng-template>
          <ng-template #homeBtn>
            <div class="fb" [class.fb-text]="navMode === 'text'" [class.fb-icon-text]="navMode === 'icon-text'"
                 [style.color]="theme?.nav?.homeColor || '#fff'" [style.background]="theme?.nav?.homeBg || 'rgba(0,0,0,.35)'">
              <ng-container *ngIf="navMode !== 'text'">
                <span class="fb-ic" *ngIf="homeIconHtml" [innerHTML]="homeIconHtml"></span>
                <img class="fb-img" *ngIf="homeIconCustom" [src]="homeIconCustom" alt="" />
                <ng-container *ngIf="!homeIconHtml && !homeIconCustom">&#8962;</ng-container>
              </ng-container>
              <span class="fb-lbl" *ngIf="navMode !== 'icon'">{{ navHomeLabel }}</span>
            </div>
          </ng-template>
          <div class="nav nav-pos-{{theme?.nav?.position || 'bottom-left'}}"
               *ngIf="!theme?.nav?.split && (theme?.nav?.position || 'bottom-left') !== 'hidden'">
            <ng-container *ngTemplateOutlet="backBtn"></ng-container>
            <ng-container *ngTemplateOutlet="homeBtn"></ng-container>
          </div>
          <ng-container *ngIf="theme?.nav?.split">
            <div class="nav nav-single nav-pos-{{theme?.nav?.backPosition || 'bottom-left'}}" *ngIf="(theme?.nav?.backPosition || 'bottom-left') !== 'hidden'">
              <ng-container *ngTemplateOutlet="backBtn"></ng-container>
            </div>
            <div class="nav nav-single nav-pos-{{theme?.nav?.homePosition || 'bottom-right'}}" *ngIf="(theme?.nav?.homePosition || 'bottom-right') !== 'hidden'">
              <ng-container *ngTemplateOutlet="homeBtn"></ng-container>
            </div>
          </ng-container>
        </ng-container>

        <!-- SCREENSAVER (studio mock — no LCD equivalent layout) -->
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
export class ContentPreviewStripComponent implements AfterViewInit, OnDestroy {
  /** Per-item image fit → CSS background-size (null = preview default) — matches the LCD. */
  fitSize = imageFitSize;
  constructor(private sanitizer: DomSanitizer) {}
  @Input() theme?: ThemeTokens;
  @Input() page: PreviewPage = 'home';
  @Input() home: CardItem[] = [];
  @Input() intermediate: CardItem[] = [];
  @Input() result?: { mapImage?: string; promoImage?: string; products: ResultProduct[]; route?: { kind?: 'line' | 'dot' | 'none'; x?: number; y?: number; w?: number; color?: string } };
  @Input() screensaver?: Screensaver;
  @Input() header?: { title?: string; caption?: string };
  /** Optional caption override under the strip. */
  @Input() caption?: string;
  /** Set false to hide the caption text under the preview. */
  @Input() showStripCaption = true;
  @Input() draftName?: string;
  /** Product index highlighted on map/result previews. If absent, preview clicks own it. */
  @Input() selectedResultIndex?: number;
  @Output() selectedResultIndexChange = new EventEmitter<number>();

  @ViewChild('ntStage') ntStage?: ElementRef<HTMLElement>;
  private resizeObserver?: { disconnect(): void };

  readonly placeholderSlots = [0, 1, 2, 3, 4, 5];
  readonly placeholderLabels = ['Bakery', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Drinks'];

  /** Dummy preview images: when the card content shows an image but the cell has
   *  none (theme wizard placeholders), render a colored sample so the user sees
   *  how Image+Text actually looks. */
  get usePh(): boolean {
    const cc = this.theme?.cardContent;
    return this.page === 'home' && (cc === 'image-text' || cc === 'image-only');
  }
  /** Intermediate: dummy images for image-showing styles (unless text-only). */
  get interUsePh(): boolean {
    if (this.page !== 'inter' || this.theme?.intermediate?.content === 'text-only') return false;
    return ['image-grid', 'card-strip', 'side-rail', 'brand-grid', 'brand-rail', 'circular', 'fullscreen'].includes(this.theme?.intermediateStyle || '');
  }
  /** Result: dummy product images (unless content is text-only). */
  get resUsePh(): boolean {
    return this.page === 'result' && this.theme?.result?.content !== 'text-only';
  }
  private static readonly PH_FILLS = ['%2386EFAC', '%23FDE68A', '%23FCA5A5', '%23A5B4FC', '%2367E8F9', '%23F9A8D4'];
  phImg(i: number): string {
    const c = ContentPreviewStripComponent.PH_FILLS[i % ContentPreviewStripComponent.PH_FILLS.length];
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 100'%3E%3Crect width='160' height='100' fill='${c}'/%3E%3Cpolygon points='0,100 160,18 160,100' fill='rgba(255,255,255,0.22)'/%3E%3C/svg%3E")`;
  }

  /* ===== Stage units: --nt-vw/--nt-vh/--nt-vmin in px from the measured stage width.
     Stage height is locked to width * 540/1920 (LCD aspect) by the chrome CSS. ===== */
  applyStageUnits = (): void => {
    const el = this.ntStage?.nativeElement;
    if (!el) return;
    const w = el.clientWidth || 0;
    if (!w) return;
    const vw = w / 100;
    const vh = (w * 540 / 1920) / 100;
    el.style.setProperty('--nt-vw', vw + 'px');
    el.style.setProperty('--nt-vh', vh + 'px');
    el.style.setProperty('--nt-vmin', vh + 'px'); /* height < width on a 1920x540 stage */
  };
  ngAfterViewInit(): void {
    this.applyStageUnits();
    const RO: any = (window as any).ResizeObserver;
    if (RO && this.ntStage?.nativeElement) {
      this.resizeObserver = new RO(() => this.applyStageUnits());
      (this.resizeObserver as any).observe(this.ntStage.nativeElement);
    } else {
      window.addEventListener('resize', this.applyStageUnits);
    }
  }
  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.applyStageUnits);
  }

  /* ===== Stage classes (page scope + result template, mirrors the LCD wrap) ===== */
  get prevClasses(): string[] {
    const cls = [
      'fit-' + (this.theme?.typography?.textFit || 'shrink'),
      'surface-' + (this.theme?.cardSurface || 'flat'),
      'nav-' + (this.theme?.navStyle || 'floating'),
    ];
    if (this.page === 'inter') cls.push('nt-inter');
    else if (this.page === 'result') {
      cls.push('nt-result', 'res-' + this.resTpl);
      const rk = this.result?.route?.kind;
      if (rk) cls.push('route-kind-' + rk);
      if (this.theme?.result?.content === 'text-only') cls.push('res-content-text-only');
      if (this.theme?.result?.textPos) cls.push('res-textpos-' + this.theme.result.textPos);
      if (this.theme?.result?.cardShape) cls.push('res-shape-' + this.theme.result.cardShape);
      if (this.resTpl === 'map-filter-list' && this.theme?.result?.filterPos) cls.push('res-filter-pos-' + this.theme.result.filterPos);
      if (this.theme?.scrollMode === 'vertical') cls.push('scroll-vertical');
      if (this.theme?.scrollMode === 'horizontal') cls.push('scroll-horizontal');
    } else if (this.page === 'home') cls.push('nt-home');
    return cls;
  }
  get resTpl(): string { return this.theme?.resultTemplate || 'map-list'; }
  get specialResult(): boolean {
    return ['drill-stair', 'drill-filter', 'filter-list', 'map-filter-list', 'promo-list', 'product-focus', 'hero-product', 'shelf', 'promo-map-rank', 'finder-detail'].includes(this.resTpl);
  }
  /** finder-detail preview breadcrumb chips (custom labels + sample values). */
  get breadcrumbPreview(): { label: string; value: string }[] {
    const labels = this.theme?.result?.breadcrumbLabels?.length ? this.theme.result.breadcrumbLabels : ['Manufacturer', 'Model', 'Year'];
    const vals = ['Mercedes-Benz', 'S Class', '2021'];
    return labels.slice(0, 3).map((label, i) => ({ label, value: vals[i] || '—' }));
  }
  private swatch(hex: string): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80'%3E%3Crect width='120' height='80' fill='${hex}'/%3E%3C/svg%3E`;
  }
  /** finder-detail preview placeholder fitments when a product has none. */
  get previewFitments(): any[] {
    return [
      { label: 'Driver Side', articleId: 'AAA001', name: '26 inch', price: '$88.88', salePrice: '$58.88', image: this.swatch('%23f7d046') },
      { label: 'Passenger Side', articleId: 'AAA002', name: '16 inch', price: '$88.88', image: this.swatch('%23f7d046') },
    ];
  }
  /** finder-detail middle list: enrich placeholders with attributes + a sale row. */
  get finderCells(): ResultProduct[] {
    const specs = [{ label: 'Color', value: 'Black' }, { label: 'Material', value: 'Rubber' }, { label: 'Type', value: 'Traditional' }];
    return this.resultCells.map((p, i) => ({
      ...p,
      specs: p.specs?.length ? p.specs : specs,
      onSale: p.onSale ?? (i === 0),
      salePrice: p.salePrice || (i === 0 ? '$58.88' : ''),
      price: p.price || '$88.88',
    } as ResultProduct));
  }
  /** finder-detail right detail: the first product, with a fallback description. */
  get finderFound(): ResultProduct {
    const f = this.finderCells[0];
    return { ...f, description: f.description || 'Smooth, clean, streak-free wipe with embedded friction reducers and multiple pressure points.' } as ResultProduct;
  }
  /** promo-map-rank preview: floor selector labels (default when none set). */
  get previewFloors(): string[] {
    return this.theme?.result?.floors?.length ? this.theme.result.floors : ['3F', '2F', '1F'];
  }
  /** promo-map-rank preview: faint shelf rectangles so the map reads like a floorplan. */
  readonly shelfRects = [
    { t: '20%', l: '14%', w: '20%', h: '16%' }, { t: '20%', l: '46%', w: '22%', h: '16%' },
    { t: '46%', l: '12%', w: '24%', h: '14%' }, { t: '58%', l: '48%', w: '26%', h: '14%' },
    { t: '74%', l: '20%', w: '20%', h: '12%' },
  ];
  /** promo-map-rank ranked list: placeholders get a price + zone. */
  get promoCells(): ResultProduct[] {
    const zones = ['Beverage', 'Beverage', 'Office', 'Toy & Doll', 'Beverage', 'Living'];
    return this.resultCells.map((p, i) => ({
      ...p,
      price: p.price || '$' + ((i + 1) * 3),
      zone: p.zone || zones[i % zones.length],
    } as ResultProduct));
  }
  private localResultIndex = 0;
  get activeResultIndex(): number {
    const n = this.resultCells.length;
    const raw = this.selectedResultIndex ?? this.localResultIndex;
    if (!n || !Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(n - 1, Math.trunc(raw)));
  }
  get found(): ResultProduct | undefined { return this.resultCells[this.activeResultIndex]; }
  isFound(i: number): boolean { return i === this.activeResultIndex; }
  selectResult(i: number): void {
    this.localResultIndex = i;
    this.selectedResultIndexChange.emit(i);
  }

  get scaleNum(): number {
    // Fine-grained slider value overrides the textScale bucket when present.
    const n = this.theme?.typography?.textScaleNum;
    if (typeof n === 'number' && n > 0) return n;
    const s = this.theme?.typography?.textScale;
    return s === 'compact' ? 0.8 : s === 'large' ? 1.25 : 1;
  }
  /* Per-element typography + nav-button vars — same derivation as the LCD
     layout.service injectTheme(), so preview and kiosk render identically. */
  get cols(): number | undefined {
    const l = this.theme?.homeLayout, c = this.theme?.columns;
    if (l === 'bento') {
      const itemCount = this.homeCells.length;
      return Math.max(2, 1 + Math.ceil((itemCount - 1) / 2));
    }
    return c;
  }
  get cardSizeScaleNum(): number { const n = this.theme?.cardSizeScale; return typeof n === 'number' && n > 0 ? n : 1; }
  get cardAlignCss(): string { return this.theme?.cardTextAlign === 'left' ? 'left' : this.theme?.cardTextAlign === 'right' ? 'right' : 'center'; }
  get cardGapPx(): string | null {
    const n = this.theme?.cardGapNum;
    return typeof n === 'number' ? n + 'px' : null;
  }
  get cardScaleNum(): number { const s = this.theme?.typography?.cardTextScale; return s ? textScaleNum(s) : 1; }
  get headerScaleNum(): number { const s = this.theme?.typography?.headerTextScale; return s ? textScaleNum(s) : 1; }
  get cardCase(): string { return textCaseCss(this.theme?.typography?.cardTextCase); }
  get headerCase(): string { return textCaseCss(this.theme?.typography?.headerTextCase); }
  get navBtnSize(): number { return navBtnSizeNum(this.theme?.nav?.size); }
  /* Nav button mode / icons / labels — mirrors LCD intermediate/result pages. */
  get navMode(): string { return this.theme?.nav?.mode || 'icon'; }
  get navBackLabel(): string { return this.theme?.nav?.backLabel || 'Back'; }
  get navHomeLabel(): string { return this.theme?.nav?.homeLabel || 'Home'; }
  // Default (undefined) nav icons resolve to real built-in SVGs — 'arrow' for
  // Back, 'home' for Home — so they're always visible (font glyphs were missing
  // on the kiosk) and clearly distinct from each other.
  get backIconHtml(): SafeHtml | undefined {
    const ic = this.theme?.nav?.backIcon;
    if (navIconKind(ic) === 'custom') return undefined;
    return this.sanitizer.bypassSecurityTrustHtml(NAV_ICONS[navIconKind(ic) === 'builtin' ? ic! : 'arrow']);
  }
  get homeIconHtml(): SafeHtml | undefined {
    const ic = this.theme?.nav?.homeIcon;
    if (navIconKind(ic) === 'custom') return undefined;
    return this.sanitizer.bypassSecurityTrustHtml(NAV_ICONS[navIconKind(ic) === 'builtin' ? ic! : 'home']);
  }
  get backIconCustom(): string { const ic = this.theme?.nav?.backIcon; return navIconKind(ic) === 'custom' ? ic! : ''; }
  get homeIconCustom(): string { const ic = this.theme?.nav?.homeIcon; return navIconKind(ic) === 'custom' ? ic! : ''; }
  get shapeCard(): boolean {
    const sh = this.theme?.cardShape;
    const layout = this.theme?.homeLayout;
    return (sh === 'circle' || sh === 'hexagon') && !['image-strip', 'fullscreen', 'hero-start', 'promo-categories', 'h-scroll', 'bento'].includes(layout || '');
  }
  get navVisible(): boolean {
    return (this.theme?.navStyle || 'floating') !== 'hidden' && (this.theme?.nav?.position || 'bottom-left') !== 'hidden';
  }
  get saverShowContent(): boolean { return this.theme?.saverOverlay?.showContent !== false; }
  get headerColor(): string | undefined {
    return this.page === 'inter' ? this.theme?.intermediate?.headerColor
      : this.page === 'result' ? this.resultHeaderColor
      : this.theme?.headerColor;
  }
  get resultHeaderColor(): string | undefined {
    return this.theme?.result?.headerColor === 'transparent'
      ? 'transparent'
      : this.theme?.result?.headerColor;
  }
  get headerVisible(): boolean {
    if (this.page === 'saver') return false;
    if (this.page === 'inter') return this.theme?.intermediate?.showHeader !== false;
    if (this.page === 'result') {
      // Full-bleed templates carry their own header (promo panel / hero), so the
      // global top bar is suppressed — matches the kiosk render.
      if (this.resTpl === 'promo-map-rank' || this.resTpl === 'finder-detail') return false;
      return this.theme?.result?.showHeader !== false;
    }
    return this.theme?.showHeader !== false;
  }
  get backgroundForPage(): string | undefined {
    const bg = this.page === 'inter' ? this.theme?.intermediate?.background
      : this.page === 'result' ? this.theme?.result?.background
      : this.theme?.background;
    const image = this.page === 'inter' ? this.theme?.intermediate?.backgroundImage
      : this.page === 'result' ? this.theme?.result?.backgroundImage
      : this.theme?.backgroundImage;
    if (!image) return bg;
    // Background framing (pan + zoom) for home and intermediate pages.
    let framed = false, pos = 'center', size = 'cover';
    if (this.page === 'home' && (this.theme?.bgImageZoom != null || this.theme?.bgImageX != null || this.theme?.bgImageY != null)) {
      framed = true; pos = `${this.theme?.bgImageX ?? 50}% ${this.theme?.bgImageY ?? 50}%`; size = `${this.theme?.bgImageZoom ?? 100}%`;
    } else if (this.page === 'inter') {
      const i = this.theme?.intermediate;
      if (i?.bgImageZoom != null || i?.bgImageX != null || i?.bgImageY != null) {
        framed = true; pos = `${i?.bgImageX ?? 50}% ${i?.bgImageY ?? 50}%`; size = `${i?.bgImageZoom ?? 100}%`;
      }
    }
    return `linear-gradient(rgba(0,0,0,.28), rgba(0,0,0,.28)), url("${image}") ${pos}/${size} no-repeat, ${bg || '#000'}`;
  }
  get pageCaption(): string {
    return this.page === 'inter' ? 'Intermediate'
      : this.page === 'result' ? 'Result'
      : this.page === 'saver' ? 'Screensaver'
      : 'Home';
  }
  /* Cells with placeholder fallback (real data when present, labels otherwise). */
  /** Free item count: image-strip / bento / hero-list use theme.columns as "how many". */
  get cellCount(): number {
    const l = this.theme?.homeLayout, c = this.theme?.columns;
    if (c && (l === 'image-strip' || l === 'bento' || l === 'hero-list')) return c;
    // Horizontal scroll: show exactly as many cards as columns
    if (this.theme?.scrollMode === 'horizontal' && c) return c;
    // Vertical scroll: show more cards so user can test scrolling in preview.
    if (this.theme?.scrollMode === 'vertical') return c ? c * 4 : 12;
    // Grid layouts: show full rows that match the chosen column count.
    if (c) return Math.min(12, c * 2);
    return l === 'hero-list' ? 4 : 6;
  }
  get homeCells(): CardItem[] {
    const n = this.cellCount;
    const real = (this.home || []).slice(0, n);
    if (real.length) return real.map(c => ({ ...c, name: c.name || 'Item' }));
    return Array.from({ length: n }, (_, i) => ({ id: 'ph' + i, name: this.placeholderLabels[i % this.placeholderLabels.length] } as CardItem));
  }
  get intermediateSource(): CardItem[] {
    // Mirror the LCD runtime (IntermediateComponent.load): the intermediate page
    // shows the *opened* node's OWN children first, and only falls back to the
    // SHARED default intermediate list when that node has no custom subtree.
    const ownChildren = this.home?.[0]?.children || [];
    if (ownChildren.length) return ownChildren;
    return this.intermediate || [];
  }
  get interCells(): CardItem[] {
    // 'columns' shows ONE row matching the chosen column count (extra items
    // overflow via scroll). card-strip shows the visible-count too.
    const cols = this.theme?.intermediate?.columns;
    const n = (this.theme?.intermediateStyle === 'columns' || this.theme?.intermediateStyle === 'card-strip') && cols
      ? cols : 6;
    const real = this.intermediateSource.slice(0, n);
    if (real.length) return real.map(c => ({ ...c, name: c.name || 'Item' }));
    return Array.from({ length: n }, (_, i) => ({ id: 'ph' + i, name: this.placeholderLabels[i % this.placeholderLabels.length] } as CardItem));
  }
  get resultCells(): ResultProduct[] {
    const real = (this.result?.products || []).slice(0, 6);
    if (real.length) return real.map(p => ({ ...p, name: p.name || 'Product' }));
    return [0, 1, 2].map(i => ({ id: 'ph' + i, name: 'Product ' + (i + 1) } as ResultProduct));
  }
  get saverBadge(): string {
    const m = this.screensaver?.mode;
    return m === 'single-image' ? 'Single image' : m === 'video' ? 'Video' : 'Slideshow';
  }

  // Header style logic mirrors the LCD home component.
  get headerStyle(): string { return this.theme?.headerStyle || 'logo-only'; }
  get logoRight(): boolean { return this.theme?.logoPosition === 'right'; }
  get logoCenter(): boolean { return this.theme?.logoPosition === 'center'; }
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
  /* Fallback copy so headerStyle/custom-position changes are VISIBLE in contexts
     without header content (e.g. the theme wizard preview). Mirrors LCD defaults
     (title → content name, caption → 'Welcome'). */
  get titleText(): string { return this.header?.title || this.draftName || 'Newton Touch'; }
  get captionText(): string { return this.header?.caption || 'Welcome'; }

  /* Marker dot position — mirrors LCD ResultComponent (mapY/mapX %, default 30/25);
     a content-level 'dot' annotation overrides the per-product marker position. */
  get markerTop(): string {
    const r = this.result?.route;
    if (r?.kind === 'dot' && r.y != null) return r.y + '%';
    const f = this.found; return (f && f.mapY != null ? f.mapY : 30) + '%';
  }
  get markerLeft(): string {
    const r = this.result?.route;
    if (r?.kind === 'dot' && r.x != null) return r.x + '%';
    const f = this.found; return (f && f.mapX != null ? f.mapX : 25) + '%';
  }
  get markerVisible(): boolean { return this.result?.route?.kind !== 'none'; }
  get markerColor(): string | undefined { return this.result?.route?.color || this.theme?.result?.pathColor || this.theme?.result?.accent; }
  /* Route annotation (ResultContent.route) — mirrors LCD ResultComponent. */
  get routeColor(): string | undefined { return this.result?.route?.color || this.theme?.result?.pathColor; }
  get routeX(): string | null { const v = this.result?.route?.x; return v != null ? v + '%' : null; }
  get routeY(): string | null { const v = this.result?.route?.y; return v != null ? v + '%' : null; }
  get routeW(): string | null { const v = this.result?.route?.w; return v != null ? v + '%' : null; }
}
