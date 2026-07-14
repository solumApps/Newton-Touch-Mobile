import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { ThemeTokens, CardItem, ResultProduct, Screensaver, CardTextPos } from '@contract/layout';
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
           [style.--nt-promo-copy-text-scale]="promoCopyScaleNum"
           [style.--nt-promo-card-text-scale]="promoCardScaleNum"
           [style.--nt-inter-text-scale]="interScaleNum"
           [style.--nt-result-text-scale]="resultScaleNum"
           [style.--nt-card-text-case]="cardCase"
           [style.--nt-header-text-case]="headerCase"
           [style.--nt-nav-btn-size]="navBtnSize"
           [style.--nt-card-scale]="cardSizeScaleNum"
           [style.--nt-card-align]="cardAlignCss"
           [style.--nt-int-card-align]="interCardAlignCss"
           [style.--nt-font]="theme?.typography?.fontFamily"
           [style.--nt-base-text]="theme?.typography?.baseTextColor"
           [style.--nt-header-text]="headerTextColor"
           [style.--nt-int-header-text]="theme?.intermediate?.headerTextColor || '#FFFFFF'"
           [style.--nt-fs-prompt-text]="theme?.intermediate?.promptTextColor || theme?.intermediate?.headerTextColor || theme?.headerTextColor || '#FFFFFF'"
           [style.--nt-res-header-text]="'#FFFFFF'"
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
           [style.--nt-res-bg]="theme?.result?.background"
           [style.--nt-res-accent]="theme?.result?.accent"
           [style.--nt-res-popular-text]="theme?.result?.popularText"
           [style.--nt-res-text]="theme?.result?.cardText"
           [style.--nt-res-header]="theme?.result?.headerColor"
           [style.--prm-panel]="resTpl==='promo-map-rank' ? theme?.result?.panelColor : 'transparent'"
           [style.--prm-subpanel]="theme?.result?.subPanelColor"
           [style.--prm-secondary-text]="theme?.result?.secondaryTextColor"
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
             [style.--nt-logo-scale]="header?.logoScale || null"
             [style.background]="isTransparentHeader ? 'transparent' : headerColor">
          <ng-container *ngIf="!isCustomHeader">
            <img *ngIf="showLogo" [src]="header?.logo || 'assets/solum-logo-white.svg'" alt="Logo" class="brand-logo" />
            <div class="brand-text" *ngIf="showTitle || showHeaderCaption">
              <span class="title" *ngIf="showTitle">{{ titleText }}</span>
              <span class="caption" *ngIf="showHeaderCaption">{{ captionText }}</span>
            </div>
            <div class="crumb" *ngIf="page==='inter' && interTracklistVisible">{{ interTrackText }}</div>
            <div class="ctx" *ngIf="page==='result' && resultTracklistVisible">{{ resultTrackText }}<span *ngIf="found?.aisle"> — Aisle {{ found?.aisle }}</span></div>
          </ng-container>
          <ng-container *ngIf="isCustomHeader">
            <div class="hzone left">
              <img *ngIf="logoPos==='left'" [src]="header?.logo || 'assets/solum-logo-white.svg'" alt="Logo" class="brand-logo" />
              <span class="title" *ngIf="titlePos==='left'">{{ titleText }}</span>
              <span class="caption" *ngIf="captionPos==='left'">{{ captionText }}</span>
            </div>
            <div class="hzone center">
              <img *ngIf="logoPos==='center'" [src]="header?.logo || 'assets/solum-logo-white.svg'" alt="Logo" class="brand-logo" />
              <span class="title" *ngIf="titlePos==='center'">{{ titleText }}</span>
              <span class="caption" *ngIf="captionPos==='center'">{{ captionText }}</span>
            </div>
            <div class="hzone right">
              <img *ngIf="logoPos==='right'" [src]="header?.logo || 'assets/solum-logo-white.svg'" alt="Logo" class="brand-logo" />
              <span class="title" *ngIf="titlePos==='right'">{{ titleText }}</span>
              <span class="caption" *ngIf="captionPos==='right'">{{ captionText }}</span>
              <span class="crumb" *ngIf="page==='inter' && interTracklistVisible">{{ interTrackText }}</span>
              <span class="ctx" *ngIf="page==='result' && resultTracklistVisible">{{ resultTrackText }}</span>
            </div>
          </ng-container>
        </div>

        <!-- HOME (LCD markup: .cards.layout-*) -->
        <ng-container *ngSwitchCase="'home'">
        <div class="body fs-body" *ngIf="theme?.homeLayout==='finder-select'" [style.--prm-panel]="theme?.intermediate?.heroColor || '#172033'" [style.--prm-accent]="theme?.intermediate?.accent || null" [style.--nt-int-bg]="homeCardAreaBackground" [style.--int-gap]="cardGapPx" [style.--nt-int-scale]="theme?.intermediate?.itemSizeScale || 1">
          <div class="fs-hero" [style.background]="theme?.intermediate?.heroColor || null">
            <div class="fs-hero-title">{{ titleText || 'Product Finder' }}</div>
            <div class="fs-steps">
              <div class="fs-step" *ngFor="let s of homeFinderSteps; let i=index" [class.current]="i===0" [class.todo]="i>0"><span class="fs-step-lbl">{{ s }}</span><span class="fs-step-val">-</span><span class="fs-step-dot" *ngIf="i===0"></span></div>
            </div>
          </div>
          <div class="fs-main" [style.background]="homeCardAreaBackground">
            <div class="fs-top fs-prompt-{{theme?.intermediate?.fsPromptPos||'center'}}">
              <div class="fs-prompt" *ngIf="theme?.intermediate?.fsShowPrompt!==false">{{ (theme?.intermediate?.promptPrefix || 'TOUCH YOUR') }} CATEGORY</div>
            </div>
          <div class="fs-cards content-{{theme?.intermediate?.fsCardContent||'text-only'}} shape-{{theme?.intermediate?.fsCardShape||'rect'}} textpos-{{finderTextPosClass}} textalign-{{finderTextAlignClass}}">
              <div class="fs-card" *ngFor="let c of finderHomeCells; let i = index" (click)="selectIntermediateBranchById(c.id)" [class.cps-selected]="c.id===activeIntermediateHomeItem?.id || (!activeIntermediateHomeItem && i===0)">
                <div class="fs-card-img" *ngIf="(theme?.intermediate?.fsCardContent||'text-only')!=='text-only'" [class.no-img]="!c.image && !finderUsePh" [style.background-image]="c.image ? 'url('+c.image+')' : (finderUsePh ? phImg(i) : null)" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null"></div>
                <span class="fs-card-nm" *ngIf="(theme?.intermediate?.fsCardContent||'text-only')!=='image-only'">{{ c.name }}</span>
              </div>
            </div>
            <div class="fs-index-row">
              <div class="fs-index fs-alpha-index" aria-label="Finder A to Z filter">
                <button type="button" class="fs-letter fs-all available" [class.active]="!activeFinderHomeLetter" (click)="selectFinderHomeLetter('')">All</button>
                <button type="button" class="fs-letter" *ngFor="let letter of finderAlphabet" [class.available]="finderHomeLetters.has(letter)" [class.active]="letter===activeFinderHomeLetter" [disabled]="!finderHomeLetters.has(letter)" (click)="selectFinderHomeLetter(letter)">{{ letter }}</button>
              </div>
            </div>
          </div>
        </div>
        <div *ngIf="theme?.homeLayout!=='finder-select'" class="cards layout-{{theme?.homeLayout}} card-size-{{theme?.cardSize||'normal'}} align-{{theme?.cardAlign||'center'}} valign-{{theme?.cardVAlign||'middle'}} gap-{{theme?.cardGap||'normal'}} htext-{{theme?.cardTextPos||'center'}} ovl-{{theme?.cardOverlayStyle||'gradient'}} oshape-{{theme?.cardOverlayShape||''}}" [class.shape]="shapeCard" [class.shape-hex]="shapeCard && theme?.cardShape==='hexagon'"
             [class.txt-shadow]="theme?.cardTextShadow"
             [style.--nt-overlay-base]="theme?.overlayColor || 'rgba(0,0,0,0.6)'"
             [class.has-cols]="cols !== undefined" [style.--cols]="cols" [style.--card-gap]="cardGapPx" [class.cols-1]="cols === 1" [class.cols-2]="cols === 2" [class.cols-3]="cols === 3" [class.cols-4]="cols === 4" [class.cols-5]="cols === 5"
             [class.scroll-vertical]="theme?.scrollMode==='vertical'" [class.scroll-horizontal]="theme?.scrollMode==='horizontal'" [class.no-overlay]="theme?.cardTextOverlay === false || theme?.cardOverlayStyle === 'none'">
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
                 [class.has-img]="!!c.image || (usePh && theme?.cardContent !== 'icon-text')" [class.cps-selected]="i===activeIntermediateHomeIndex" *ngFor="let c of homeCells; let i = index" (click)="selectIntermediateBranch(i)">
              <div class="img" *ngIf="theme?.cardContent !== 'text-only'" [class.placeholder]="!c.image && !usePh" [style.background-image]="c.image ? 'url('+c.image+')' : (usePh ? phImg(i) : null)" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null" [style.background-color]="(!c.image && !usePh) ? theme?.accent : null"></div>
              <div class="meta" *ngIf="theme?.cardContent !== 'image-only'"><span class="name">{{ c.name }}</span><span class="price" *ngIf="c.price">{{ c.price }}<span class="unit" *ngIf="c.unit"> / {{ c.unit }}</span></span></div>
            </div>
          </div>
          <!-- h-scroll: single horizontally-scrolling rail -->
          <div class="h-scroll-rail" *ngIf="theme?.homeLayout==='h-scroll'">
            <div class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                 [class.has-img]="!!c.image || (usePh && theme?.cardContent !== 'icon-text')" [class.cps-selected]="i===activeIntermediateHomeIndex" *ngFor="let c of homeCells; let i = index" (click)="selectIntermediateBranch(i)">
              <div class="img" [class.placeholder]="!c.image && !usePh" [style.background-image]="c.image ? 'url('+c.image+')' : (usePh ? phImg(i) : null)" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null" [style.background-color]="(!c.image && !usePh) ? theme?.accent : null"></div>
              <div class="meta"><span class="name">{{ c.name }}</span><span class="price" *ngIf="c.price">{{ c.price }}<span class="unit" *ngIf="c.unit"> / {{ c.unit }}</span></span></div>
            </div>
          </div>
          <!-- all other layouts -->
          <ng-container *ngIf="theme?.homeLayout!=='h-scroll' && theme?.homeLayout!=='promo-categories'">
            <div class="card shape-{{theme?.cardShape}} content-{{theme?.cardContent}} pos-{{theme?.cardTextPos}}"
                 [class.featured]="i===0" [class.has-img]="!!c.image || (usePh && theme?.cardContent !== 'icon-text')" [class.cps-selected]="i===activeIntermediateHomeIndex" *ngFor="let c of homeCells; let i = index" (click)="selectIntermediateBranch(i)">
              <div class="img" [class.placeholder]="!c.image && !usePh" [style.background-image]="c.image ? 'url('+c.image+')' : (usePh ? phImg(i) : null)" [style.background-size]="fitSize(c.imageFit)" [style.background-repeat]="c.imageFit ? 'no-repeat' : null" [style.background-color]="(!c.image && !usePh) ? theme?.accent : null"></div>
              <div class="meta"><span class="name">{{ c.name }}</span><span class="price" *ngIf="c.price">{{ c.price }}<span class="unit" *ngIf="c.unit"> / {{ c.unit }}</span></span></div>
            </div>
          </ng-container>
        </div>
        </ng-container>

        <!-- INTERMEDIATE (LCD markup: .body.int-*) -->
        <ng-container *ngSwitchCase="'inter'">
          <!-- finder-select: hero progress rail + selection cards + index strip -->
          <div class="body fs-body" *ngIf="theme?.intermediateStyle==='finder-select'" [style.--prm-panel]="theme?.intermediate?.heroColor || '#172033'" [style.--prm-accent]="theme?.intermediate?.accent || null" [style.--nt-int-bg]="intermediateCardAreaBackground" [style.--int-gap]="theme?.intermediate?.gapNum != null ? theme?.intermediate?.gapNum + 'px' : null" [style.--nt-int-scale]="theme?.intermediate?.itemSizeScale || 1">
            <div class="fs-hero" [style.background]="theme?.intermediate?.heroColor || null">
              <div class="fs-hero-title">{{ titleText || 'Product Finder' }}</div>
              <div class="fs-home"><span class="fs-home-ic">&#8962;</span> Home</div>
              <div class="fs-steps">
                <div class="fs-step" *ngFor="let s of fsStepRows" [class.done]="s.state==='done'" [class.current]="s.state==='current'">
                  <span class="fs-step-lbl">{{ s.label }}</span>
                  <span class="fs-step-val">{{ s.value }}</span>
                  <span class="fs-step-ic" *ngIf="s.state==='done'">&#10003;</span>
                  <span class="fs-step-dot" *ngIf="s.state==='current'"></span>
                </div>
              </div>
            </div>
            <div class="fs-main" [style.background]="intermediateCardAreaBackground">
              <div class="fs-top fs-back-{{theme?.intermediate?.fsBackPos||'left'}} fs-prompt-{{theme?.intermediate?.fsPromptPos||'center'}}">
                <button type="button" class="fs-back" *ngIf="theme?.intermediate?.fsShowBack!==false">&#8592;</button>
                <div class="fs-prompt" *ngIf="theme?.intermediate?.fsShowPrompt!==false">{{ (theme?.intermediate?.promptPrefix || 'TOUCH YOUR') }} YEAR</div>
              </div>
              <div class="fs-cards content-{{theme?.intermediate?.fsCardContent||'text-only'}} shape-{{theme?.intermediate?.fsCardShape||'rect'}} textpos-{{finderTextPosClass}} textalign-{{finderTextAlignClass}}">
                <div class="fs-card" *ngFor="let it of finderInterCells; let i = index">
                  <div class="fs-card-img" *ngIf="(theme?.intermediate?.fsCardContent||'text-only')!=='text-only'" [class.no-img]="!it.image && !finderUsePh" [style.background-image]="it.image ? 'url('+it.image+')' : (finderUsePh ? phImg(i) : null)" [style.background-size]="fitSize(it.imageFit)" [style.background-repeat]="it.imageFit ? 'no-repeat' : null"></div>
                  <span class="fs-card-nm" *ngIf="(theme?.intermediate?.fsCardContent||'text-only')!=='image-only'">{{ it.name }}</span>
                </div>
              </div>
              <div class="fs-index-row">
                <div class="fs-index fs-alpha-index" aria-label="Finder A to Z filter">
                  <button type="button" class="fs-letter fs-all available" [class.active]="!activeFinderInterLetter" (click)="selectFinderInterLetter('')">All</button>
                  <button type="button" class="fs-letter" *ngFor="let letter of finderAlphabet" [class.available]="finderInterLetters.has(letter)" [class.active]="letter===activeFinderInterLetter" [disabled]="!finderInterLetters.has(letter)" (click)="selectFinderInterLetter(letter)">{{ letter }}</button>
                </div>
              </div>
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
            <div class="body int-{{theme?.intermediateStyle}} int-size-{{theme?.intermediate?.itemSize||'medium'}} int-shape-{{theme?.intermediate?.cardShape||'rect'}} int-align-{{$any(theme?.intermediateStyle)==='side-rail' ? 'left' : (theme?.intermediateStyle==='columns' ? 'center' : (theme?.intermediate?.align||'center'))}} int-textalign-{{theme?.intermediate?.textAlign||'center'}} int-valign-{{theme?.intermediate?.valign||'middle'}} int-gap-{{theme?.intermediate?.gap||'normal'}} int-content-{{theme?.intermediate?.content||'image-text'}} int-textpos-{{theme?.intermediate?.textPos||'overlay-bottom'}} int-brm-{{theme?.intermediate?.brandRailMessagePos||'right'}} int-brmv-{{theme?.intermediate?.brandRailMessageAlign||'center'}} ovl-{{theme?.intermediate?.overlayStyle||'gradient'}} oshape-{{theme?.intermediate?.overlayShape||''}}"
                 [style.--nt-overlay-base]="theme?.overlayColor || 'rgba(0,0,0,0.6)'"
                 [class.txt-shadow]="theme?.intermediate?.textShadow"
                 [class.scroll-vertical]="interScrollMode==='vertical'" [class.scroll-horizontal]="interScrollMode==='horizontal'" [class.int-single-col]="theme?.intermediateStyle==='columns' && (theme?.intermediate?.columns || 3)===1" [class.int-scroll-peek]="interColumnsScrollPeek" [class.int-strip-few]="theme?.intermediateStyle==='card-strip' && interStripRenderedCount<=3" [class.no-overlay]="theme?.intermediate?.textOverlay === false || theme?.intermediate?.overlayStyle === 'none'" [class.cols-2]="interVisibleColumns === 2" [class.cols-3]="interVisibleColumns === 3" [class.cols-4]="interVisibleColumns === 4" [class.cols-5]="interVisibleColumns === 5" [style.--int-cols]="interVisibleColumns" [style.--int-strip-card-width]="interStripCardWidth" [style.--nt-int-scale]="theme?.intermediate?.itemSizeScale || 1" [style.--int-brm-bg]="theme?.intermediate?.brandRailMessageBgColor || null" [style.--int-brm-text]="theme?.intermediate?.brandRailMessageTextColor || null" [style.--card-gap]="theme?.intermediate?.gapNum != null ? (theme?.intermediate?.gapNum + 'px') : null">
              <div class="item" *ngFor="let it of interCells; let i = index" [class.open]="i===0" [class.has-img]="!!it.image || interUsePh">
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
            <div class="scol" *ngFor="let col of drillFilterColumns">
              <div class="scol-label">{{ col.label }}</div>
              <div class="scol-items">
                <div class="scol-item" *ngFor="let it of col.items; let i = index" [class.picked]="i===col.pickedIndex">{{ it.name }}</div>
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
                  <div class="fimg" [class.no-img]="!p.image && !resUsePh" [style.background-image]="p.image ? 'url('+p.image+')' : (resUsePh ? phImg(i) : null)" [style.background-size]="fitSize(p.imageFit)" [style.background-repeat]="p.imageFit ? 'no-repeat' : null"></div>
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
                <div class="fimg" [class.no-img]="!p.image && !resUsePh" [style.background-image]="p.image ? 'url('+p.image+')' : (resUsePh ? phImg(i) : null)" [style.background-size]="fitSize(p.imageFit)" [style.background-repeat]="p.imageFit ? 'no-repeat' : null"></div>
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
                <div class="fimg" [class.no-img]="!p.image && !resUsePh" [style.background-image]="p.image ? 'url('+p.image+')' : (resUsePh ? phImg(i) : null)" [style.background-size]="fitSize(p.imageFit)" [style.background-repeat]="p.imageFit ? 'no-repeat' : null"></div>
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
              <div class="prod" [class.found]="isFound(i)" *ngFor="let p of promoResultCells; let i = index" (click)="selectResult(i)">
                <div class="img" [class.no-img]="!p.image && !resUsePh" [style.background-image]="p.image ? 'url('+p.image+')' : (resUsePh ? phImg(i) : null)" [style.background-size]="fitSize(p.imageFit)" [style.background-repeat]="p.imageFit ? 'no-repeat' : null"></div>
                <div class="info">
                  <div class="nm">{{ p.name }}<span class="price" *ngIf="p.price"> · {{ p.price }}</span></div>
                  <div class="loc" *ngIf="p.aisle">ZONE {{ p.aisle }}</div>
                </div>
              </div>
            </div>
            <div class="selected-tags">
              <div class="tag" *ngFor="let p of resultCells.slice(0,4)">#{{ resultTag(p) }}</div>
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
            <div class="focus-image" *ngIf="resUsePh" [style.background-image]="found?.image ? 'url('+found?.image+')' : phImg(activeResultIndex)" [style.background-size]="fitSize(found?.imageFit)" [style.background-repeat]="found?.imageFit ? 'no-repeat' : null"></div>
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
              <div class="hp-img" *ngIf="resUsePh" [style.background-image]="found?.image ? 'url('+found?.image+')' : phImg(activeResultIndex)" [style.background-size]="fitSize(found?.imageFit)" [style.background-repeat]="found?.imageFit ? 'no-repeat' : null"></div>
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
              <div class="fd-products">
                <div class="fd-prod" [class.found]="i===0" *ngFor="let p of finderCells; let i=index">
                  <div class="fd-prod-top"><div class="fd-prod-nm">{{ p.name }}</div><div class="fd-price"><span class="fd-sale-badge" *ngIf="theme?.result?.showSaleBadge!==false && p.onSale">SALE</span><span class="fd-orig" *ngIf="p.onSale && p.salePrice">{{ p.price }}</span><span class="fd-now" [class.sale]="p.onSale && p.salePrice">{{ (p.onSale && p.salePrice) ? p.salePrice : (p.price || '$58.88') }}</span></div></div>
                  <div class="fd-specs" *ngIf="p.specs?.length"><span class="fd-spec" *ngFor="let s of p.specs">{{ s.label }} &middot; {{ s.value }}</span></div>
                </div>
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
            <div class="result-tools" *ngIf="resTpl==='map-list'">
              <div class="res-sort">
                <button type="button" class="active">Popular</button>
                <button type="button">A-Z</button>
                <button type="button">Z-A</button>
              </div>
            </div>
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
                 [style.color]="theme?.nav?.backColor || '#fff'" [style.background]="theme?.nav?.backBg || '#0f172a'">
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
                 [style.color]="theme?.nav?.homeColor || '#fff'" [style.background]="theme?.nav?.homeBg || '#0f172a'">
              <ng-container *ngIf="navMode !== 'text'">
                <span class="fb-ic" *ngIf="homeIconHtml" [innerHTML]="homeIconHtml"></span>
                <img class="fb-img" *ngIf="homeIconCustom" [src]="homeIconCustom" alt="" />
                <ng-container *ngIf="!homeIconHtml && !homeIconCustom">&#8962;</ng-container>
              </ng-container>
              <span class="fb-lbl" *ngIf="navMode !== 'icon'">{{ navHomeLabel }}</span>
            </div>
          </ng-template>
          <div class="nav nav-pos-{{navGroupedPosition}}"
               *ngIf="!navSplit && navGroupedPosition !== 'hidden'">
            <ng-container *ngTemplateOutlet="backBtn"></ng-container>
            <ng-container *ngTemplateOutlet="homeBtn"></ng-container>
          </div>
          <ng-container *ngIf="navSplit">
            <div class="nav nav-single nav-pos-{{navBackPosition}}" *ngIf="navBackPosition !== 'hidden'">
              <ng-container *ngTemplateOutlet="backBtn"></ng-container>
            </div>
            <div class="nav nav-single nav-pos-{{navHomePosition}}" *ngIf="navHomePosition !== 'hidden'">
              <ng-container *ngTemplateOutlet="homeBtn"></ng-container>
            </div>
          </ng-container>
        </ng-container>

        <!-- SCREENSAVER (studio mock — no LCD equivalent layout) -->
        <div *ngSwitchCase="'saver'" class="stage saver saver-{{screensaver?.mode || 'slideshow'}}">
          <div class="ss-media">
            <!-- VIDEO: play the clip full-bleed, fall back to a colored plate -->
            <ng-container *ngIf="screensaver?.mode === 'video'">
              <video class="ss-video" *ngIf="saverFirstMedia" [src]="saverFirstMedia" muted autoplay loop playsinline></video>
              <div class="ss-ph" *ngIf="!saverFirstMedia" [style.background]="theme?.headerColor || '#2F006D'"></div>
            </ng-container>
            <!-- IMAGE (single-image + slideshow) -->
            <ng-container *ngIf="screensaver?.mode !== 'video'">
              <ng-container *ngIf="saverImages.length > 0; else saverPlaceholders">
                <span class="ss-slide" *ngFor="let m of saverImages" [style.background-image]="'url('+m+')'"></span>
              </ng-container>
              <ng-template #saverPlaceholders>
                <span class="ss-slide" [style.background]="theme?.headerColor || '#2F006D'"></span>
                <span class="ss-slide" [style.background]="theme?.accent || '#FFCD00'"></span>
                <span class="ss-slide" [style.background]="theme?.background || '#0F172A'"></span>
              </ng-template>
            </ng-container>
          </div>
          <span class="ss-play" *ngIf="screensaver?.mode === 'video'">&#9654;</span>
          <div class="ss-dots" *ngIf="screensaver?.mode === 'slideshow' && saverRaw.length > 1">
            <i *ngFor="let m of saverRaw; let i = index" [class.on]="i === 0"></i>
          </div>
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
  @Input() forceSharedIntermediate = false;
  @Input() intermediateCreatePreview = false;
  @Input() result?: { mapImage?: string; promoImage?: string; products: ResultProduct[]; route?: { kind?: 'line' | 'dot' | 'none'; x?: number; y?: number; w?: number; color?: string } };
  @Input() screensaver?: Screensaver;
  @Input() header?: { title?: string; caption?: string; logo?: string; logoScale?: number };
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
  private readonly themeLabelSets: { match: RegExp; home: string[]; result: string[] }[] = [
    { match: /electro|volt|electronics/i, home: ['Phones', 'Laptops', 'Audio', 'Gaming', 'Smart Home', 'Accessories'], result: ['Noise Cancelling Headphones', 'UltraBook 14', 'Smart Watch', 'Gaming Controller', 'Wireless Charger', 'Bluetooth Speaker'] },
    { match: /bakery|bread|fresh market/i, home: ['Bread', 'Pastries', 'Cakes', 'Cookies', 'Coffee', 'Offers'], result: ['Sourdough Loaf', 'Butter Croissant', 'Chocolate Cake', 'Cookie Box', 'Cold Brew', 'Fresh Muffins'] },
    { match: /tool|hardware|drive finder/i, home: ['Bolts', 'Nuts', 'Screws', 'Drill Bits', 'Hand Tools', 'Adhesives'], result: ['Eye Bolt M6', 'Hex Nut Set', 'Screw Bolt 8mm', 'Drill Bit Kit', 'Tape Measure', 'Epoxy Pack'] },
    { match: /dairy|fresh/i, home: ['Milk', 'Yogurt', 'Cheese', 'Butter', 'Cream', 'Desserts'], result: ['Organic Milk 1L', 'Greek Yogurt', 'Cheddar Block', 'Salted Butter', 'Fresh Cream', 'Pudding Cups'] },
    { match: /beauty|skin|cosmetic/i, home: ['Shampoo', 'Conditioner', 'Treatment', 'Styling', 'Vegan', 'Color Care'], result: ['Repair Shampoo', 'Silk Conditioner', 'Hair Serum', 'Styling Cream', 'Vegan Wash', 'Color Mask'] },
  ];

  /** Dummy preview images: when the card content shows an image but the cell has
   *  none (theme wizard placeholders), render a colored sample so the user sees
   *  how Image+Text actually looks. */
  get usePh(): boolean {
    const cc = this.theme?.cardContent;
    return this.page === 'home' && (cc === 'image-text' || cc === 'image-only');
  }
  /** Intermediate: dummy images for styles whose selected card content shows an image. */
  get interUsePh(): boolean {
    if (this.page !== 'inter') return false;
    const style = this.theme?.intermediateStyle || '';
    if (style === 'finder-select') return false;
    if (!this.imageContent(this.theme?.intermediate?.content || 'image-text')) return false;
    return ['columns', 'image-grid', 'card-strip', 'side-rail', 'brand-grid', 'brand-rail', 'circular', 'fullscreen'].includes(style);
  }
  get finderUsePh(): boolean {
    if (!((this.page === 'inter' && this.theme?.intermediateStyle === 'finder-select') || (this.page === 'home' && this.theme?.homeLayout === 'finder-select'))) return false;
    return this.imageContent(this.theme?.intermediate?.fsCardContent || 'text-only');
  }
  get finderTextPosClass(): CardTextPos {
    const shape = this.theme?.intermediate?.fsCardShape || 'rect';
    return shape === 'circle' || shape === 'hexagon'
      ? 'below'
      : (this.theme?.intermediate?.fsTextPos || 'center');
  }
  get finderTextAlignClass(): 'left' | 'center' | 'right' {
    const shape = this.theme?.intermediate?.fsCardShape || 'rect';
    return shape === 'circle' || shape === 'hexagon'
      ? 'center'
      : (this.theme?.intermediate?.fsTextAlign || 'center');
  }
  homeFinderSteps = ['Category 1', 'Category 2', 'Category 3', 'Category 4'];
  /** Result: dummy product images (unless content is text-only). */
  get resUsePh(): boolean {
    return this.page === 'result' && this.theme?.result?.content !== 'text-only';
  }
  private static readonly PH_FILLS = ['%2386EFAC', '%23FDE68A', '%23FCA5A5', '%23A5B4FC', '%2367E8F9', '%23F9A8D4'];
  phImg(i: number): string {
    const c = ContentPreviewStripComponent.PH_FILLS[i % ContentPreviewStripComponent.PH_FILLS.length];
    return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 100'%3E%3Crect width='160' height='100' fill='${c}'/%3E%3Cpolygon points='0,100 160,18 160,100' fill='rgba(255,255,255,0.22)'/%3E%3C/svg%3E")`;
  }
  private previewLabels(kind: 'home' | 'result' = 'home'): string[] {
    const key = `${this.draftName || ''} ${this.theme?.saverOverlay?.title || ''}`;
    const set = this.themeLabelSets.find((s) => s.match.test(key));
    return set ? set[kind] : this.placeholderLabels;
  }

  private imageContent(content?: string): boolean {
    return content === 'image-text' || content === 'image-only';
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
    if (this.page === 'inter') {
      cls.push('nt-inter');
      if (this.intermediateCreatePreview) {
        cls.push('force-shared-intermediate');
        cls.push(this.intermediateSource.length > 3 ? 'shared-intermediate-scroll' : 'shared-intermediate-few');
      }
    }
    else if (this.page === 'result') {
      cls.push('nt-result', 'res-' + this.resTpl);
      const rk = this.result?.route?.kind;
      if (rk) cls.push('route-kind-' + rk);
      if (this.theme?.result?.content === 'text-only') cls.push('res-content-text-only');
      if (this.theme?.result?.textPos) cls.push('res-textpos-' + this.theme.result.textPos);
      if (this.theme?.result?.cardShape) cls.push('res-shape-' + this.theme.result.cardShape);
      if (this.resTpl === 'map-filter-list' && this.theme?.result?.filterPos) cls.push('res-filter-pos-' + this.theme.result.filterPos);
      if (!this.fixedResultTemplate) {
        cls.push(`scroll-${this.resultScrollMode}`);
      }
    } else if (this.page === 'home') {
      cls.push('nt-home');
      if (this.theme?.homeLayout === 'finder-select') cls.push('nt-inter');
    }
    return cls;
  }
  get resTpl(): string { return this.theme?.resultTemplate || 'map-list'; }
  get fixedResultTemplate(): boolean {
    return ['promo-list', 'product-focus', 'hero-product', 'promo-map-rank', 'finder-detail'].includes(this.resTpl);
  }
  get specialResult(): boolean {
    return ['drill-stair', 'drill-filter', 'filter-list', 'map-filter-list', 'promo-list', 'product-focus', 'hero-product', 'shelf', 'promo-map-rank', 'finder-detail'].includes(this.resTpl);
  }
  /** finder-detail preview breadcrumb chips (custom labels + sample values). */
  get breadcrumbPreview(): { label: string; value: string }[] {
    const labels = this.theme?.result?.breadcrumbLabels?.length ? this.theme.result.breadcrumbLabels : ['Manufacturer', 'Model', 'Year'];
    const vals = ['Mercedes-Benz', 'S Class', '2021'];
    return labels.slice(0, 3).map((label, i) => ({ label, value: vals[i] || '—' }));
  }
  /** drill-filter result preview: one breadcrumb column per real hierarchy level. */
  get drillFilterColumns(): { label: string; items: CardItem[]; pickedIndex: number }[] {
    const fallback = this.homeCells.slice(0, 3);
    const roots = (this.home || []).length ? this.home : fallback;
    const labels = this.theme?.result?.breadcrumbLabels || [];
    const out: { label: string; items: CardItem[]; pickedIndex: number }[] = [];
    let levelItems = roots;
    let picked: CardItem | undefined;

    for (let level = 0; levelItems.length && level < 6; level++) {
      const items = levelItems.map((c) => ({ ...c, name: c.name || 'Item' }));
      picked = items.find((c) => c.children?.length || c.products?.length) || items[0];
      const pickedIndex = Math.max(0, items.findIndex((c) => c.id === picked?.id));
      out.push({
        label: labels[level] || (level === 0 ? 'Category' : (out[level - 1]?.items[out[level - 1].pickedIndex]?.name || `Level ${level + 1}`)),
        items,
        pickedIndex,
      });
      levelItems = picked.children || [];
    }

    return out.length ? out : [{ label: 'Category', items: fallback, pickedIndex: 0 }];
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
  private localIntermediateHomeIndex = 0;
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
  get branchNavItems(): CardItem[] {
    return (this.home || []).filter((c) => (c.children?.length || c.products?.length));
  }

  get activeIntermediateHomeIndex(): number {
    const n = this.branchNavItems.length;
    if (!n) return 0;
    return Math.max(0, Math.min(n - 1, Math.trunc(this.localIntermediateHomeIndex || 0)));
  }
  selectIntermediateBranch(i: number): void {
    const n = this.branchNavItems.length;
    if (!n) return;
    this.localIntermediateHomeIndex = (Math.trunc(i) + n) % n;
    this.localResultIndex = 0;
    this.selectedResultIndexChange.emit(0);
  }
  get activeIntermediateHomeItem(): CardItem | undefined {
    return this.branchNavItems[this.activeIntermediateHomeIndex];
  }
  selectIntermediateBranchById(id?: string): void {
    const idx = this.branchNavItems.findIndex((c) => c.id === id);
    if (idx >= 0) this.selectIntermediateBranch(idx);
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
  get interCardAlignCss(): string { return this.theme?.intermediate?.textAlign === 'left' ? 'left' : this.theme?.intermediate?.textAlign === 'right' ? 'right' : 'center'; }
  get interScrollMode(): 'vertical' | 'horizontal' {
    const style = this.theme?.intermediateStyle;
    if (style === 'card-strip' || style === 'brand-rail') return 'horizontal';
    return (this.theme?.intermediate?.scrollMode || this.theme?.scrollMode) === 'vertical' ? 'vertical' : 'horizontal';
  }
  get resultScrollMode(): 'vertical' | 'horizontal' {
    return this.theme?.scrollMode === 'horizontal' ? 'horizontal' : 'vertical';
  }
  get interVisibleColumns(): number {
    const cols = Math.max(1, this.theme?.intermediate?.columns || 3);
    if (this.theme?.intermediateStyle === 'columns') {
      return Math.min(5, cols);
    }
    return cols;
  }
  get interColumnsScrollPeek(): boolean {
    if (this.theme?.intermediateStyle !== 'columns' || this.interScrollMode !== 'horizontal') return false;
    return true;
  }
  get interStripRenderedCount(): number {
    return this.interCells.length;
  }
  get interStripCardWidth(): string {
    if (this.interStripRenderedCount <= 3) {
      return '25%';
    }
    return `${100 / this.interStripRenderedCount}%`;
  }
  get cardGapPx(): string | null {
    const n = this.theme?.cardGapNum;
    return typeof n === 'number' ? n + 'px' : null;
  }
  get cardScaleNum(): number {
    const n = this.theme?.typography?.cardTextScaleNum;
    if (typeof n === 'number' && n > 0) return n;
    const s = this.theme?.typography?.cardTextScale;
    return s ? textScaleNum(s) : 1;
  }
  get headerScaleNum(): number {
    const n = this.theme?.typography?.headerTextScaleNum;
    if (typeof n === 'number' && n > 0) return n;
    const s = this.theme?.typography?.headerTextScale;
    return s ? textScaleNum(s) : 1;
  }
  get promoCopyScaleNum(): number { const n = this.theme?.typography?.promoCopyTextScaleNum; return typeof n === 'number' && n > 0 ? n : 1; }
  get promoCardScaleNum(): number { const n = this.theme?.typography?.promoCardTextScaleNum; return typeof n === 'number' && n > 0 ? n : this.cardScaleNum; }
  get interScaleNum(): number { const n = this.theme?.typography?.intermediateTextScaleNum; return typeof n === 'number' && n > 0 ? n : this.cardScaleNum; }
  get resultScaleNum(): number { const n = this.theme?.typography?.resultTextScaleNum; return typeof n === 'number' && n > 0 ? n : 1; }
  get cardCase(): string { return textCaseCss(this.theme?.typography?.cardTextCase); }
  get headerCase(): string { return textCaseCss(this.theme?.typography?.headerTextCase); }
  get navBtnSize(): number { return navBtnSizeNum(this.theme?.nav?.size); }
  get navSplit(): boolean {
    if (this.page === 'inter') return this.theme?.intermediate?.navSplit ?? this.theme?.nav?.split ?? false;
    if (this.page === 'result') return this.theme?.result?.navSplit ?? this.theme?.nav?.split ?? false;
    return this.theme?.nav?.split ?? false;
  }
  get navGroupedPosition(): string {
    if (this.page === 'inter') return this.theme?.intermediate?.navPosition || this.theme?.nav?.position || 'bottom-left';
    if (this.page === 'result') return this.theme?.result?.navPosition || this.theme?.nav?.position || 'bottom-left';
    return this.theme?.nav?.position || 'bottom-left';
  }
  get navBackPosition(): string {
    if (this.page === 'inter') return this.theme?.intermediate?.navBackPosition || this.theme?.nav?.backPosition || 'bottom-left';
    if (this.page === 'result') return this.theme?.result?.navBackPosition || this.theme?.nav?.backPosition || 'bottom-left';
    return this.theme?.nav?.backPosition || 'bottom-left';
  }
  get navHomePosition(): string {
    if (this.page === 'inter') return this.theme?.intermediate?.navHomePosition || this.theme?.nav?.homePosition || 'bottom-right';
    if (this.page === 'result') return this.theme?.result?.navHomePosition || this.theme?.nav?.homePosition || 'bottom-right';
    return this.theme?.nav?.homePosition || 'bottom-right';
  }
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
  get headerTextColor(): string {
    if (this.page === 'inter') return (this.theme?.intermediate?.headerTextColor || '#FFFFFF');
    // Result header text is always white.
    if (this.page === 'result') return '#FFFFFF';
    return this.theme?.headerTextColor || '#FFFFFF';
  }
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
    if (this.theme?.homeLayout === 'finder-select') return false;
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
  get homeCardAreaBackground(): string | null {
    return this.theme?.backgroundImage ? 'transparent' : (this.theme?.background || null);
  }
  get intermediateCardAreaBackground(): string | null {
    return this.theme?.intermediate?.backgroundImage ? 'transparent' : (this.theme?.intermediate?.background || null);
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
    // Horizontal and vertical scroll: show more cards so user can test scrolling in preview.
    if (this.theme?.scrollMode === 'horizontal' || this.theme?.scrollMode === 'vertical') return c ? c * 4 : 12;
    // Grid layouts: show full rows that match the chosen column count.
    if (c) return Math.min(12, c * 2);
    return l === 'hero-list' ? 4 : 6;
  }
  get homeCells(): CardItem[] {
    const n = this.cellCount;
    const real = (this.home || []).slice(0, n);
    if (real.length) return real.map(c => ({ ...c, name: c.name || 'Item' }));
    const labels = this.previewLabels('home');
    return Array.from({ length: n }, (_, i) => ({ id: 'ph' + i, name: labels[i % labels.length] } as CardItem));
  }
  readonly finderAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  private selectedFinderHomeLetter = '';
  private selectedFinderInterLetter = '';
  private finderSort<T extends { name?: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base', numeric: true }));
  }
  private filterFinderByLetter(items: CardItem[], letter: string): CardItem[] {
    if (!letter) return items;
    return items.filter((item) => (item.name || '').trim().charAt(0).toUpperCase() === letter);
  }
  get finderHomeAllCells(): CardItem[] {
    return this.finderSort(this.homeCells);
  }
  get finderHomeCells(): CardItem[] {
    return this.filterFinderByLetter(this.finderHomeAllCells, this.activeFinderHomeLetter);
  }
  private finderLettersFor(items: CardItem[]): Set<string> {
    return new Set(items.map((item) => (item.name || '').trim().charAt(0).toUpperCase()).filter((letter) => /^[A-Z]$/.test(letter)));
  }
  get finderHomeLetters(): Set<string> {
    return this.finderLettersFor(this.finderHomeAllCells);
  }
  get finderInterLetters(): Set<string> {
    return this.finderLettersFor(this.finderInterAllCells);
  }
  get activeFinderHomeLetter(): string {
    return this.finderHomeLetters.has(this.selectedFinderHomeLetter) ? this.selectedFinderHomeLetter : '';
  }
  get activeFinderInterLetter(): string {
    return this.finderInterLetters.has(this.selectedFinderInterLetter) ? this.selectedFinderInterLetter : '';
  }
  selectFinderHomeLetter(letter: string): void {
    if (!letter || this.finderHomeLetters.has(letter)) this.selectedFinderHomeLetter = letter;
  }
  selectFinderInterLetter(letter: string): void {
    if (!letter || this.finderInterLetters.has(letter)) this.selectedFinderInterLetter = letter;
  }
  get intermediateSource(): CardItem[] {
    if (this.forceSharedIntermediate) return this.intermediate || [];
    // Mirror the LCD runtime (IntermediateComponent.load): the intermediate page
    // shows the *opened* node's OWN children first, and only falls back to the
    // SHARED default intermediate list when that node has no custom subtree.
    const selectedBranch = this.branchNavItems[this.activeIntermediateHomeIndex] || this.home?.[0];
    const ownChildren = selectedBranch?.children || [];
    if (ownChildren.length) return ownChildren;
    return this.intermediate || [];
  }
  /** finder-select progress rows: Category labels (left) + selected values
   *  (right). Real step labels/values win; otherwise reasonable fallbacks (#5). */
  get fsStepRows(): { label: string; value: string; state: 'done' | 'current' | 'todo' }[] {
    const labels = (this.theme?.intermediate?.stepLabels && this.theme.intermediate.stepLabels.length)
      ? this.theme.intermediate.stepLabels.slice(0, 4)
      : ['Category 1', 'Category 2', 'Category 3', 'Category 4'];
    const cells = this.interCells;
    const sample = ['Bosch', 'X5 Series', '2021', 'Premium'];
    return labels.map((label, i) => ({
      label,
      value: cells[i]?.name || sample[i] || '—',
      state: i < labels.length - 1 ? 'done' : 'current',
    }));
  }
  /** finder-select fast-lookup values retained for older callers; the preview
   *  now renders an A-Z letter strip for both Home and Intermediate. */
  get fsIndexValues(): string[] {
    return ['All', ...this.finderAlphabet];
  }
  get finderInterAllCells(): CardItem[] {
    return this.finderSort(this.interCells);
  }
  get finderInterCells(): CardItem[] {
    return this.filterFinderByLetter(this.finderInterAllCells, this.activeFinderInterLetter);
  }
  get interCells(): CardItem[] {
    // Builder shared-intermediate previews render every item, with a 3-card
    // viewport; items after the third are available by horizontal scroll.
    const rawCols = this.theme?.intermediate?.columns;
    const cols = this.theme?.intermediateStyle === 'columns' ? this.interVisibleColumns : rawCols;
    const source = this.intermediateSource;
    if (this.intermediateCreatePreview) {
      const real = source.map(c => ({ ...c, name: c.name || 'Item' }));
      if (real.length) return real;
      const minCount = this.interScrollMode === 'vertical' ? (cols || 3) : 3;
      const dummy = Array.from({ length: Math.max(0, minCount - real.length) }, (_, i) => ({
        id: 'inter-shared-ph' + i,
        name: this.previewLabels('home')[(real.length + i) % this.previewLabels('home').length]
      } as CardItem));
      return [...real, ...dummy];
    }
    // 'columns' shows ONE row matching the chosen column count (extra items
    // overflow via scroll). card-strip shows the visible-count too.
    if (this.interScrollMode === 'vertical') {
      const cardCount = cols ? cols * 4 : 12;
      const real = source.slice(0, cardCount).map(c => ({ ...c, name: c.name || 'Item' }));
      const dummy = Array.from({ length: cardCount - real.length }, (_, i) => ({
        id: 'inter-scroll-ph' + i,
        name: this.previewLabels('home')[(real.length + i) % this.previewLabels('home').length]
      } as CardItem));
      return [...real, ...dummy];
    }
    if (this.theme?.intermediateStyle === 'columns') {
      const baseCount = cols || 3;
      const cardCount = this.interColumnsScrollPeek ? baseCount + 3 : baseCount;
      const real = source.slice(0, cardCount).map(c => ({ ...c, name: c.name || 'Item' }));
      const dummy = Array.from({ length: cardCount - real.length }, (_, i) => ({
        id: 'inter-scroll-ph' + i,
        name: this.previewLabels('home')[(real.length + i) % this.previewLabels('home').length]
      } as CardItem));
      return [...real, ...dummy];
    }
    const n = this.theme?.intermediateStyle === 'card-strip'
      ? (cols || 3)
      : 6;
    const real = source.slice(0, n);
    if (real.length) return real.map(c => ({ ...c, name: c.name || 'Item' }));
    const labels = this.previewLabels('home');
    return Array.from({ length: n }, (_, i) => ({ id: 'ph' + i, name: labels[i % labels.length] } as CardItem));
  }
  get resultCells(): ResultProduct[] {
    const branchProducts = this.intermediateSource.flatMap((c) => c.products || []);
    const real = this.resTpl === 'finder-detail'
      ? (this.result?.products || [])
      : (branchProducts.length ? branchProducts : (this.result?.products || [])).slice(0, 6);
    if (real.length) return real.map(p => ({ ...p, name: p.name || 'Product' }));
    const labels = this.previewLabels('result');
    const count = this.resTpl === 'catalog-grid' ? 6 : 3;
    return Array.from({ length: count }, (_, i) => ({ id: 'ph' + i, name: labels[i % labels.length] } as ResultProduct));
  }
  get promoResultCells(): ResultProduct[] {
    const branchProducts = this.intermediateSource.flatMap((c) => c.products || []);
    const real = branchProducts.length ? branchProducts : (this.result?.products || []);
    if (real.length) return real.map(p => ({ ...p, name: p.name || 'Product' }));
    const labels = this.previewLabels('result');
    return Array.from({ length: 8 }, (_, i) => ({ id: 'promo-ph' + i, name: labels[i % labels.length] } as ResultProduct));
  }
  /** Raw uploaded screensaver media (first 3), regardless of mode. */
  get saverRaw(): string[] { return (this.screensaver?.media || []).slice(0, 3); }
  /** Slides to render: single-image → first only; slideshow → up to 3 (padded so the
   *  crossfade never shows a blank slot); video handled separately by the template. */
  get saverImages(): string[] {
    const raw = this.saverRaw;
    if (this.screensaver?.mode === 'single-image') return raw.slice(0, 1);
    if (raw.length === 2) return [raw[0], raw[1], raw[1]];
    return raw;
  }
  get saverFirstMedia(): string { return (this.screensaver?.media || [])[0] || ''; }
  get saverBadge(): string {
    const m = this.screensaver?.mode;
    return m === 'single-image' ? 'Single image' : m === 'video' ? 'Video' : 'Slideshow';
  }
  resultTag(p: ResultProduct): string {
    return p.shelf || p.aisle || p.zone || p.name || 'Product';
  }

  // Header style logic — per-page aware
  get headerStyle(): string {
    if (this.page === 'inter') return this.theme?.intermediate?.headerStyle || 'logo-only';
    if (this.page === 'result') return '#FFFFFF'; // Result always uses white
    return this.theme?.headerStyle || 'logo-only';
  }
  get logoRight(): boolean {
    if (this.page === 'inter') return false; // Intermediate uses headerLayout mode
    return this.theme?.logoPosition === 'right';
  }
  get logoCenter(): boolean {
    if (this.page === 'inter') return false; // Intermediate uses headerLayout mode
    return this.theme?.logoPosition === 'center';
  }
  get isTransparentHeader(): boolean {
    if (this.page === 'inter') return !!this.theme?.intermediate?.transparentHeader;
    if (this.page === 'result') return !!this.theme?.result?.transparentHeader;
    return !!this.theme?.transparentHeader;
  }
  get isCustomHeader(): boolean {
    if (this.page === 'inter') return (this.theme?.intermediate?.headerLayout || 'preset') === 'custom';
    return (this.theme?.headerLayout || 'preset') === 'custom';
  }
  get logoPos(): string {
    if (this.page === 'inter') return this.theme?.intermediate?.logoPos || 'left';
    return this.theme?.logoPos || 'left';
  }
  get titlePos(): string {
    if (this.page === 'inter') return this.theme?.intermediate?.titlePos || 'center';
    return this.theme?.titlePos || 'center';
  }
  get captionPos(): string {
    if (this.page === 'inter') return this.theme?.intermediate?.captionPos || 'center';
    return this.theme?.captionPos || 'center';
  }
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
  get interTracklistVisible(): boolean { return this.theme?.intermediate?.showTracklist !== false; }
  get resultTracklistVisible(): boolean { return this.theme?.result?.showTracklist !== false; }
  get interTrackText(): string {
    const values = this.previewTrackValues;
    return values.length ? values.join(' › ') : this.titleText;
  }
  get resultTrackText(): string {
    const values = this.previewTrackValues;
    if (values.length) return values.join(' › ');
    return this.found?.name || 'Result';
  }
  private get previewTrackValues(): string[] {
    if (this.theme?.intermediateStyle === 'finder-select') {
      const stepValues = this.fsStepRows.map((s) => s.value).filter((v) => !!v && v !== '-');
      if (stepValues.length) return stepValues.slice(0, 4);
    }
    const picked = this.drillFilterColumns
      .map((col) => col.items[col.pickedIndex]?.name || '')
      .filter(Boolean);
    if (picked.length) return picked.slice(0, 4);
    return this.interCells.slice(0, 4).map((it) => it.name).filter(Boolean);
  }

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
  get markerColor(): string | undefined { return this.found?.markerColor || this.result?.route?.color || this.theme?.result?.pathColor || this.theme?.result?.accent; }
  /* Route annotation (ResultContent.route) — mirrors LCD ResultComponent. */
  get routeColor(): string | undefined { return this.result?.route?.color || this.theme?.result?.pathColor; }
  get routeX(): string | null { const v = this.result?.route?.x; return v != null ? v + '%' : null; }
  get routeY(): string | null { const v = this.result?.route?.y; return v != null ? v + '%' : null; }
  get routeW(): string | null { const v = this.result?.route?.w; return v != null ? v + '%' : null; }
}
