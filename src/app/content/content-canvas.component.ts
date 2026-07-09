import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter } from '@ionic/angular/standalone';
import { unzipSync } from 'fflate';
import { ContentService, ContentDraft } from '../services/content.service';
import { ImagePickerService } from '../services/image-picker.service';
import type { CanvasElement, CanvasElementKind, CanvasShapeKind, CustomCanvasContent, ProductPromoContent, ProductPromoPreset } from '@contract/layout';

type CanvasLike = CustomCanvasContent | ProductPromoContent;

@Component({
  selector: 'app-content-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter],
  template: `
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start"><ion-button class="ghost-action" (click)="back()" aria-label="Back">‹</ion-button></ion-buttons>
    <ion-title>{{ isPromo ? 'Product Promo' : 'Custom Canvas' }}</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="wrap" *ngIf="draft">
    <div class="preview-dock">
      <div class="stage-head">
        <div>
          <strong>{{ isPromo ? 'Product promo preview' : 'Custom layout preview' }}</strong>
          <span>LCD canvas · 1920 x 540</span>
        </div>
        <button class="add-main" (click)="showAddPanel=!showAddPanel">{{ showAddPanel ? 'Close' : '+ Add element' }}</button>
      </div>

      <div #stageEl class="stage" [style.background]="canvas.background" (pointerdown)="selectCanvas()">
        <div *ngFor="let el of sortedElements; trackBy: trackElement"
             class="el"
             [class.sel]="selected?.id===el.id"
             [class.locked]="el.locked"
             [ngClass]="['kind-' + el.kind, 'shape-' + (el.shape || 'rect')]"
             [style.left.%]="el.x"
             [style.top.%]="el.y"
             [style.width.%]="el.w"
             [style.height.%]="el.h"
             [style.z-index]="el.z"
             [style.opacity]="opacityValue(el)"
             [style.border-radius.px]="el.radius || 0"
             [style.border]="previewBorder(el)"
             [style.transform]="'rotate(' + (el.rotate || 0) + 'deg)'"
             (pointerdown)="startDrag($event, el)">
          <ng-container [ngSwitch]="el.kind">
            <div *ngSwitchCase="'text'" class="text-el"
                 [style.color]="el.color || '#ffffff'"
                 [style.font-size]="previewFontSize(el.fontSize || 42)"
                 [style.font-family]="el.fontFamily || 'Inter, sans-serif'"
                 [style.font-weight]="el.bold ? 900 : 700"
                 [style.font-style]="el.italic ? 'italic' : 'normal'">{{ el.text || 'Text' }}</div>
            <div *ngSwitchCase="'shape'" class="shape-el" [style.background]="el.fill || '#FFCD00'" [style.clip-path]="el.shape==='custom' ? el.customShape : null">
              <span [style.color]="el.color || '#12002D'" [style.font-size]="previewFontSize(el.fontSize || 34)">{{ el.text }}</span>
            </div>
            <div *ngSwitchCase="'image'" class="media-el">
              <img *ngIf="el.src" [src]="el.src" [style.object-fit]="objectFit(el)" alt="" />
              <span *ngIf="!el.src">Upload image</span>
            </div>
            <div *ngSwitchCase="'video'" class="media-el">
              <video *ngIf="el.src"
                     [src]="el.src"
                     [style.object-fit]="objectFit(el)"
                     muted loop playsinline autoplay preload="auto"
                     (canplay)="kickVideo($event)"
                     (loadedmetadata)="kickVideo($event)"></video>
              <span *ngIf="!el.src">Upload video</span>
            </div>
            <div *ngSwitchCase="'spin'" class="media-el">
              <img *ngIf="el.frames?.length" [src]="spinFrame(el)" [style.object-fit]="objectFit(el)" alt="" />
              <span *ngIf="!el.frames?.length">360° — upload frames</span>
              <!-- Mirrors the LCD's interactivity badge so the preview matches the kiosk. -->
              <b class="spin-mini" *ngIf="el.frames?.length">360°</b>
            </div>
          </ng-container>
        </div>
      </div>

      <div class="element-rail" *ngIf="sortedElements.length">
        <button *ngFor="let el of sortedElements" [class.sel]="selected?.id===el.id" (click)="select(el)">
          <span>{{ elementName(el) }}</span>
          <small>{{ el.locked ? 'Locked' : el.kind }}</small>
        </button>
      </div>
    </div>

    <div class="tool-card" *ngIf="showAddPanel">
      <ng-container *ngIf="!isPromo; else promoTools">
        <div class="tool-title">Add to canvas</div>
        <div class="toolbar">
          <button (click)="addText()">Text</button>
          <button (click)="addMedia('image')">Image</button>
          <button (click)="addMedia('video')">Video</button>
          <button (click)="addShape('starburst')">Offer shape</button>
          <button (click)="addShape('tag')">Tag</button>
          <button (click)="addShape('badge')">Badge</button>
          <button (click)="addShape('arrow')">Arrow</button>
          <button (click)="addShape('custom')">Custom shape</button>
        </div>
      </ng-container>

      <ng-template #promoTools>
        <div class="tool-title">Product promo layout</div>
        <div class="preset-grid">
          <button *ngFor="let p of promoPresets" [class.sel]="promo?.preset===p.id" (click)="applyPromoPreset(p.id)">{{ p.label }}</button>
        </div>
        <div class="tool-title compact">Add promo item</div>
        <div class="toolbar promo-toolbar">
          <button (click)="addProductMedia('image')">Product image</button>
          <button (click)="addProductMedia('video')">Product video</button>
          <button (click)="addProductSpin()">360° Spin</button>
          <button (click)="addPromoText()">Promo text</button>
          <button (click)="addShape('starburst')">Offer badge</button>
        </div>
      </ng-template>

      <label class="bg-field">Canvas background<input type="color" [ngModel]="toColor(canvas.background || (isPromo ? '#FFFFFF' : '#0A0A1A'))" (ngModelChange)="canvas.background=$event; saveSoon()" /></label>
    </div>

    <div class="panel" *ngIf="selected as el; else noSelection">
      <div class="panel-head">
        <div>
          <h3>Edit {{ elementName(el) }}</h3>
          <p>{{ controlHint(el) }}</p>
        </div>
        <button class="mini danger" (click)="remove(el)">Delete</button>
      </div>

      <div class="form-grid">
        <label *ngIf="el.kind==='text' || el.kind==='shape'">Text
          <textarea [(ngModel)]="el.text" (ngModelChange)="saveSoon()"></textarea>
        </label>

        <label *ngIf="el.kind==='text' || el.kind==='shape'">Text color
          <input type="color" [ngModel]="toColor(el.color || '#ffffff')" (ngModelChange)="el.color=$event; saveSoon()" />
        </label>

        <label *ngIf="el.kind==='shape'">Fill
          <input type="color" [ngModel]="toColor(el.fill || '#FFCD00')" (ngModelChange)="el.fill=$event; saveSoon()" />
        </label>

        <label *ngIf="el.kind==='shape'">Shape
          <select [(ngModel)]="el.shape" (ngModelChange)="saveSoon()">
            <option *ngFor="let s of shapes" [ngValue]="s">{{ s }}</option>
          </select>
        </label>

        <label *ngIf="el.shape==='custom'">Custom polygon
          <input [(ngModel)]="el.customShape" (ngModelChange)="saveSoon()" placeholder="polygon(0 0,100% 0,100% 100%,0 100%)" />
        </label>

        <label *ngIf="el.kind==='image' || el.kind==='video' || el.kind==='spin'">Media fit
          <select [(ngModel)]="el.fit" (ngModelChange)="saveSoon()">
            <option value="cover">Cover</option>
            <option value="fit">Fit</option>
            <option value="fill">Fill</option>
          </select>
        </label>

        <label>Border color
          <input type="color" [ngModel]="toColor(el.borderColor || '#000000')" (ngModelChange)="el.borderColor=$event; saveSoon()" />
        </label>

        <div class="upload-box" *ngIf="el.kind==='image'">
          <span>{{ el.src ? 'Image selected' : 'No image selected' }}</span>
          <button class="mini" (click)="replaceImage(el)">{{ el.src ? 'Replace image' : 'Upload image' }}</button>
        </div>

        <div class="upload-box" *ngIf="el.kind==='video'">
          <span>{{ el.src ? 'Video selected' : 'No video selected' }}</span>
          <button class="mini" (click)="replaceVideo(el)">{{ el.src ? 'Replace video' : 'Upload video' }}</button>
        </div>

        <div class="upload-box" *ngIf="el.kind==='spin'">
          <span>{{ spinImportNote || (el.frames?.length ? el.frames!.length + ' frames loaded' : 'No frames yet — zip of ordered turntable photos') }}</span>
          <button class="mini" [disabled]="importingSpin" (click)="importSpinFrames(el)">{{ importingSpin ? 'Importing…' : (el.frames?.length ? 'Replace .zip' : 'Upload .zip') }}</button>
        </div>
      </div>

      <div class="slider-grid">
        <label *ngIf="el.kind==='text' || el.kind==='shape'">Text size <strong>{{ el.fontSize || 42 }}</strong>
          <input type="range" min="18" max="120" [value]="el.fontSize || 42" (input)="el.fontSize=+$any($event.target).value; saveSoon()" />
        </label>
        <label>Width <strong>{{ el.w | number:'1.0-0' }}%</strong>
          <input type="range" min="4" max="100" [value]="el.w" (input)="el.w=+$any($event.target).value; clampElement(el); saveSoon()" />
        </label>
        <label>Height <strong>{{ el.h | number:'1.0-0' }}%</strong>
          <input type="range" min="4" max="100" [value]="el.h" (input)="el.h=+$any($event.target).value; clampElement(el); saveSoon()" />
        </label>
        <label>X position <strong>{{ el.x | number:'1.0-0' }}%</strong>
          <input type="range" min="0" max="100" [value]="el.x" (input)="el.x=+$any($event.target).value; clampElement(el); saveSoon()" />
        </label>
        <label>Y position <strong>{{ el.y | number:'1.0-0' }}%</strong>
          <input type="range" min="0" max="100" [value]="el.y" (input)="el.y=+$any($event.target).value; clampElement(el); saveSoon()" />
        </label>
        <label>Corner radius <strong>{{ el.radius || 0 }}</strong>
          <input type="range" min="0" max="80" [value]="el.radius || 0" (input)="el.radius=+$any($event.target).value; saveSoon()" />
        </label>
        <label>Border width <strong>{{ el.borderWidth || 0 }}</strong>
          <input type="range" min="0" max="24" [value]="el.borderWidth || 0" (input)="el.borderWidth=+$any($event.target).value; saveSoon()" />
        </label>
        <label>Rotate <strong>{{ el.rotate || 0 }}°</strong>
          <input type="range" min="-45" max="45" [value]="el.rotate || 0" (input)="el.rotate=+$any($event.target).value; saveSoon()" />
        </label>
        <label>Opacity <strong>{{ opacityPercent(el) }}%</strong>
          <input type="range" min="20" max="100" [value]="opacityPercent(el)" (input)="el.opacity=+$any($event.target).value / 100; saveSoon()" />
        </label>
        <label *ngIf="el.kind==='spin' && el.frames?.length">Preview angle <strong>{{ spinIdx + 1 }}/{{ el.frames!.length }}</strong>
          <input type="range" min="0" [max]="el.frames!.length - 1" [value]="spinIdx" (input)="spinIdx=+$any($event.target).value" />
        </label>
        <label *ngIf="el.kind==='spin'">Spin speed <strong>{{ spinNum(el, 'autoSpinFps', 15) }} fps</strong>
          <input type="range" min="4" max="30" [value]="spinNum(el, 'autoSpinFps', 15)" (input)="setSpinNum(el, 'autoSpinFps', +$any($event.target).value)" />
        </label>
        <label *ngIf="el.kind==='spin'">Drag sensitivity <strong>{{ spinNum(el, 'sensitivity', 8) }}</strong>
          <input type="range" min="2" max="30" [value]="spinNum(el, 'sensitivity', 8)" (input)="setSpinNum(el, 'sensitivity', +$any($event.target).value)" />
        </label>
      </div>

      <div class="toggles">
        <button [class.sel]="el.bold" *ngIf="el.kind==='text'" (click)="el.bold=!el.bold; saveSoon()">Bold</button>
        <button [class.sel]="el.italic" *ngIf="el.kind==='text'" (click)="el.italic=!el.italic; saveSoon()">Italic</button>
        <button [class.sel]="spinOn(el, 'autoSpin')" *ngIf="el.kind==='spin'" (click)="toggleSpin(el, 'autoSpin')">Auto-spin</button>
        <button [class.sel]="spinOn(el, 'dragToSpin')" *ngIf="el.kind==='spin'" (click)="toggleSpin(el, 'dragToSpin')">Drag to spin</button>
        <button [class.sel]="el.locked" (click)="el.locked=!el.locked; saveSoon()">{{ el.locked ? 'Unlock' : 'Lock' }}</button>
      </div>

      <div class="actions">
        <button (click)="sendBack(el)">Send back</button>
        <button (click)="bringFront(el)">Bring front</button>
      </div>
    </div>

    <ng-template #noSelection>
      <div class="panel empty">
        <h3>No element yet</h3>
        <p>Add a text, image, video, or shape to start designing.</p>
      </div>
    </ng-template>
  </div>
</ion-content>

<ion-footer class="foot">
  <button class="btn-o" (click)="preview()">Preview</button>
  <button class="btn-y" [disabled]="!canvas.elements.length" (click)="saveAndDeploy()">Save & Deploy →</button>
</ion-footer>
`,
  styles: [`
    ion-toolbar { --background: linear-gradient(135deg,#2F006D,#001973); --color:#fff; --min-height:68px; }
    ion-title { font-weight:900; font-size:24px; }
    .ghost-action { font-size:32px; --color:#fff; }
    .wrap { padding:14px 14px 96px; background:#f6f7fb; min-height:100%; }
    .preview-dock {
      position:sticky;
      top:0;
      z-index:10;
      margin:-14px -14px 12px;
      padding:12px 14px;
      background:rgba(246,247,251,.96);
      box-shadow:0 12px 26px rgba(15,23,42,.12);
    }
    .stage-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .stage-head strong { display:block; color:#101828; font-size:14px; font-weight:900; }
    .stage-head span { display:block; color:#667085; font-size:11px; font-weight:800; margin-top:2px; }
    button { font-family:inherit; cursor:pointer; }
    .add-main,.toolbar button,.preset-grid button,.mini,.actions button,.toggles button,.element-rail button {
      border:1.5px solid rgba(47,0,109,.16);
      background:#fff;
      color:#2F006D;
      border-radius:14px;
      padding:10px;
      font-weight:900;
    }
    .add-main { background:#FFCD00; color:#12002D; border:0; min-width:120px; }
    .stage { position:relative; width:100%; height:0; padding-top:28.125%; overflow:hidden; border-radius:16px; box-shadow:0 16px 34px rgba(15,23,42,.16); touch-action:none; container-type: inline-size; }
    .el { position:absolute; box-sizing:border-box; overflow:hidden; border:1.5px solid transparent; touch-action:none; }
    .el.sel { outline:2px solid #FFCD00; outline-offset:0; box-shadow:0 0 0 2px rgba(47,0,109,.72); }
    .el.locked:after { content:'Locked'; position:absolute; right:4px; top:4px; background:rgba(0,0,0,.55); color:#fff; font-size:10px; padding:2px 5px; border-radius:999px; }
    .media-el,.el img,.el video { width:100%; height:100%; display:block; }
    .media-el { display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.16); color:#fff; font-weight:900; text-align:center; }
    .media-el span { padding:4px 6px; border-radius:999px; background:rgba(0,0,0,.28); font-size:12px; }
    .spin-mini { position:absolute; top:3px; right:3px; padding:1px 6px; border-radius:999px; background:rgba(0,0,0,.55); color:#fff; font-size:9px; font-weight:900; letter-spacing:.04em; }
    .text-el { width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; line-height:1.05; white-space:pre-wrap; padding:4px; text-shadow:0 2px 8px rgba(0,0,0,.28); box-sizing:border-box; }
    .shape-el { width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; font-weight:900; padding:8px; box-sizing:border-box; line-height:1.05; }
    .shape-pill .shape-el { border-radius:999px; }
    .shape-circle .shape-el { border-radius:999px; }
    .shape-starburst .shape-el { clip-path:polygon(50% 0,61% 28%,91% 10%,75% 40%,100% 50%,75% 60%,91% 90%,61% 72%,50% 100%,39% 72%,9% 90%,25% 60%,0 50%,25% 40%,9% 10%,39% 28%); }
    .shape-tag .shape-el { clip-path:polygon(0 0,86% 0,100% 50%,86% 100%,0 100%); }
    .shape-badge .shape-el { clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%); }
    .shape-arrow .shape-el { clip-path:polygon(0 22%,68% 22%,68% 0,100% 50%,68% 100%,68% 78%,0 78%); }
    .element-rail { margin-top:10px; overflow-x:auto; white-space:nowrap; -webkit-overflow-scrolling:touch; }
    .element-rail button { display:inline-flex; flex-direction:column; align-items:flex-start; min-width:112px; margin-right:8px; padding:8px 10px; text-align:left; }
    .element-rail button.sel { background:#2F006D; color:#fff; border-color:#2F006D; }
    .element-rail small { color:#98a2b3; font-size:10px; margin-top:2px; text-transform:uppercase; letter-spacing:.06em; }
    .tool-card,.panel { background:#fff; border:1px solid #e4e7ec; border-radius:18px; box-shadow:0 12px 28px rgba(15,23,42,.07); }
    .tool-card { padding:12px; margin-bottom:12px; }
    .tool-title { color:#667085; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.08em; margin:0 2px 10px; }
    .tool-title.compact { margin-top:12px; }
    .toolbar { display:grid; grid-template-columns:repeat(2,1fr); grid-column-gap:8px; grid-row-gap:8px; }
    .preset-grid { display:grid; grid-template-columns:repeat(2,1fr); grid-column-gap:8px; grid-row-gap:8px; }
    .preset-grid .sel,.toggles .sel { background:#2F006D; color:#fff; }
    .bg-field { display:grid; grid-template-columns:1fr 52px; align-items:center; grid-column-gap:10px; margin:12px 2px 0; color:#475467; font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.06em; }
    .bg-field input { width:52px; height:38px; padding:3px; border:1.5px solid #d0d5dd; border-radius:12px; background:#fff; }
    .panel { padding:14px; }
    .panel-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
    .panel h3 { margin:0; font-size:18px; color:#101828; }
    .panel p { margin:4px 0 0; color:#667085; font-size:12px; line-height:1.35; }
    .form-grid,.slider-grid { display:grid; grid-template-columns:1fr; grid-row-gap:12px; }
    label { display:grid; grid-row-gap:6px; color:#475467; font-size:12px; font-weight:800; }
    label strong { float:right; color:#2F006D; }
    input,select,textarea { width:100%; border:1.5px solid #d0d5dd; border-radius:12px; padding:9px 10px; font:inherit; box-sizing:border-box; background:#fff; }
    textarea { min-height:72px; resize:vertical; }
    input[type=color] { height:42px; padding:4px; }
    input[type=range] { padding:0; accent-color:#2F006D; }
    .upload-box { display:flex; align-items:center; justify-content:space-between; border:1.5px dashed #d0d5dd; border-radius:14px; padding:12px; color:#667085; font-weight:800; }
    .mini { padding:8px 12px; }
    .toggles,.actions { display:grid; grid-template-columns:repeat(3,1fr); grid-column-gap:8px; grid-row-gap:8px; margin-top:12px; }
    .actions { grid-template-columns:repeat(2,1fr); }
    .danger { color:#dc2626; border-color:rgba(220,38,38,.28); }
    .empty { color:#667085; font-size:13px; }
    .foot { display:grid; grid-template-columns:35% 1fr; grid-column-gap:10px; padding:12px 14px 18px; background:rgba(255,255,255,.94); border-top:1px solid #e4e7ec; }
    .btn-o,.btn-y { min-height:54px; border-radius:16px; font-weight:900; font-size:15px; }
    .btn-o { background:#fff; color:#2F006D; border:1.5px solid #2F006D; }
    .btn-y { background:#FFCD00; color:#12002D; border:0; }
    .btn-y[disabled] { background:#e4e7ec; color:#98a2b3; }
    @media (min-width:720px) {
      .toolbar { grid-template-columns:repeat(4,1fr); }
      .form-grid,.slider-grid { grid-template-columns:repeat(2,1fr); grid-column-gap:12px; }
    }
  `],
})
export class ContentCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('stageEl') stageEl?: ElementRef<HTMLElement>;
  draft?: ContentDraft;
  selectedId = '';
  showAddPanel = false;
  /** 360° spin authoring state: preview frame index + zip import progress. */
  spinIdx = 0;
  importingSpin = false;
  spinImportNote = '';
  /** Frame-count / resolution caps protect the px30 LCD (decoded frames live in RAM). */
  private static readonly SPIN_MAX_FRAMES = 36;
  private static readonly SPIN_MAX_EDGE = 1000;
  dragging?: { id: string; sx: number; sy: number; ox: number; oy: number };
  saveTimer?: ReturnType<typeof setTimeout>;
  /** Rendered height (px) of the 1920x540 preview stage. Text is sized relative
   *  to this so the mobile preview matches the LCD, which sizes text in vh of its
   *  540px-tall viewport (LCD: fontSize/5.4 vh == fontSize/540 * viewportH px). */
  private stageH = 0;
  private stageObserver?: ResizeObserver;
  shapes: CanvasShapeKind[] = ['rect', 'pill', 'circle', 'starburst', 'tag', 'badge', 'arrow', 'custom'];
  promoPresets: { id: ProductPromoPreset; label: string }[] = [
    { id: 'product-only', label: 'Only product' },
    { id: 'text-product', label: 'Text + product' },
    { id: 'product-text', label: 'Product + text' },
    { id: 'text-product-text', label: 'Text + product + text' },
  ];

  constructor(private content: ContentService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    const el = this.stageEl?.nativeElement;
    if (!el) return;
    const measure = () => { this.stageH = el.clientHeight; this.cdr.detectChanges(); };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      this.stageObserver = new ResizeObserver(() => measure());
      this.stageObserver.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.stageObserver?.disconnect();
    clearTimeout(this.saveTimer);
  }

  /** Preview font-size that matches the LCD renderer's vh sizing: on the LCD a
   *  text element is `fontSize/5.4` vh of its 540px stage; here we express the
   *  same physical proportion against the actual preview stage height. */
  previewFontSize(fontSize: number): string {
    const h = this.stageH || (this.stageEl?.nativeElement.clientHeight ?? 0);
    return (fontSize / 540 * h) + 'px';
  }

  /** Border for the preview, scaled from authored px (1920x540 stage) to the
   *  rendered stage — same scaling as text so the preview matches the LCD. */
  previewBorder(el: CanvasElement): string | null {
    const bw = el.borderWidth || 0;
    if (bw <= 0) return null;
    const h = this.stageH || (this.stageEl?.nativeElement.clientHeight ?? 0);
    return (bw / 540 * h) + 'px solid ' + (el.borderColor || '#000000');
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.draft = (await this.content.list()).find((d) => d.id === id);
    if (!this.draft) { this.router.navigateByUrl('/tabs/content'); return; }
    if (this.isPromo && !this.draft.productPromo) this.draft.productPromo = { preset: 'product-only', background: '#FFFFFF', elements: [] };
    if (!this.isPromo && !this.draft.customCanvas) this.draft.customCanvas = { background: '#0A0A1A', elements: [] };
    if (this.isPromo && !this.canvas.elements.length) this.applyPromoPreset('product-only');
    if (!this.selected && this.sortedElements[0]) this.select(this.sortedElements[0]);
  }

  get isPromo(): boolean { return this.draft?.appMode === 'product-promo'; }
  get promo(): ProductPromoContent | undefined { return this.draft?.productPromo; }
  get canvas(): CanvasLike {
    return (this.isPromo ? this.draft?.productPromo : this.draft?.customCanvas) || { background: this.isPromo ? '#FFFFFF' : '#0A0A1A', elements: [] };
  }
  get sortedElements(): CanvasElement[] { return [...this.canvas.elements].sort((a, b) => a.z - b.z); }
  get selected(): CanvasElement | undefined { return this.canvas.elements.find((e) => e.id === this.selectedId); }

  objectFit(el: CanvasElement): string { return el.fit === 'fit' ? 'contain' : el.fit === 'fill' ? 'fill' : 'cover'; }
  opacityValue(el: CanvasElement): number { return el.opacity === undefined || el.opacity === null ? 1 : el.opacity; }
  opacityPercent(el: CanvasElement): number { return Math.round(this.opacityValue(el) * 100); }
  
  trackElement = (_: number, el: CanvasElement): string => el.id;

  elementName(el: CanvasElement): string {
    if (el.kind === 'shape') return `${el.shape || 'rect'} shape`;
    if (el.kind === 'text') return (el.text || 'Text').slice(0, 22);
    if (el.kind === 'spin') return '360° Spin';
    return el.kind === 'image' ? 'Image' : 'Video';
  }
  controlHint(el: CanvasElement): string {
    if (el.kind === 'image') return 'Upload an image, choose fit behavior, then drag or resize it on the canvas.';
    if (el.kind === 'video') return 'Upload a video, choose fit behavior, then drag or resize it on the canvas.';
    if (el.kind === 'spin') return 'Upload a zip of ordered turntable photos. On the display it auto-spins and shoppers can drag to rotate.';
    if (el.kind === 'shape') return 'Use this for offer badges, tags, arrows, and retail promotion callouts.';
    return 'Edit the message, size, style, and placement directly from here.';
  }
  toColor(v: string): string { return /^#[0-9a-fA-F]{6}$/.test(v || '') ? v : '#ffffff'; }
  nextZ(): number { return Math.max(0, ...this.canvas.elements.map((e) => e.z || 0)) + 1; }
  makeId(): string { return 'el_' + Date.now() + '_' + Math.floor(Math.random() * 1000); }
  add(el: Partial<CanvasElement>): void {
    const full: CanvasElement = { id: this.makeId(), kind: 'text', x: 35, y: 25, w: 30, h: 24, z: this.nextZ(), opacity: 1, ...el } as CanvasElement;
    this.canvas.elements.push(full);
    this.select(full);
    this.showAddPanel = false;
    this.saveSoon();
  }
  addText(): void { this.add({ kind: 'text', text: 'Big retail message', color: '#ffffff', fontSize: 30, bold: true, x: 6, y: 24, w: 44, h: 18 }); }
  addPromoText(): void { this.add({ kind: 'text', text: 'LIMITED OFFER', color: '#12002D', fontSize: 28, bold: true, x: 60, y: 24, w: 34, h: 18 }); }
  addShape(shape: CanvasShapeKind): void { this.add({ kind: 'shape', shape, text: shape === 'starburst' ? 'SALE' : '', fill: '#FFCD00', color: '#12002D', x: 62, y: 16, w: 18, h: 30, fontSize: 34, radius: shape === 'rect' ? 12 : 0 }); }
  addMedia(kind: Extract<CanvasElementKind, 'image' | 'video'>): void {
    this.add({ kind, text: kind === 'image' ? 'Upload image' : 'Upload video', fit: 'cover', x: 44, y: 12, w: 30, h: 70, radius: 18 });
  }
  addProductMedia(kind: Extract<CanvasElementKind, 'image' | 'video'>): void {
    this.add({ kind, text: kind === 'image' ? 'Upload product image' : 'Upload product video', fit: 'cover', x: 38, y: 10, w: 24, h: 80, radius: 22 });
  }
  addProductSpin(): void {
    this.add({ kind: 'spin', text: 'Upload 360° frames', fit: 'cover', x: 38, y: 10, w: 24, h: 80, radius: 22, frames: [], spin: { autoSpin: true, autoSpinFps: 15, dragToSpin: true, sensitivity: 8, loop: true } });
  }
  async replaceImage(el: CanvasElement): Promise<void> { const src = await this.picker.pick('image/*'); if (src) { el.src = src; this.saveSoon(); } }
  async replaceVideo(el: CanvasElement): Promise<void> { const src = await this.picker.pickRaw('video/*'); if (src) { el.src = src; this.saveSoon(); } }

  // ----- 360° Product Spin (Product Promo) -----

  /** Stage preview frame: the scrubbed angle for the selected element, frame 0 otherwise. */
  spinFrame(el: CanvasElement): string {
    const f = el.frames || [];
    if (!f.length) return '';
    return f[this.selected?.id === el.id ? Math.min(this.spinIdx, f.length - 1) : 0];
  }
  spinOn(el: CanvasElement, k: 'autoSpin' | 'dragToSpin'): boolean { return el.spin?.[k] !== false; }
  toggleSpin(el: CanvasElement, k: 'autoSpin' | 'dragToSpin'): void {
    const s = el.spin = el.spin || {};
    s[k] = s[k] === false;   // was off → on; was on/unset → off
    this.saveSoon();
  }
  spinNum(el: CanvasElement, k: 'autoSpinFps' | 'sensitivity', d: number): number {
    const v = el.spin?.[k];
    return typeof v === 'number' && v > 0 ? v : d;
  }
  setSpinNum(el: CanvasElement, k: 'autoSpinFps' | 'sensitivity', v: number): void {
    const s = el.spin = el.spin || {};
    s[k] = v;
    this.saveSoon();
  }

  /** Import a .zip of ordered turntable photos: unzip → natural-sort by name →
   *  sample down to SPIN_MAX_FRAMES (even angular coverage) → downscale each to
   *  SPIN_MAX_EDGE. Caps keep the decoded set inside the px30's memory budget. */
  async importSpinFrames(el: CanvasElement): Promise<void> {
    if (this.importingSpin) return;
    const bytes = await this.picker.pickBytes('.zip,application/zip');
    if (!bytes) return;
    this.importingSpin = true;
    this.spinImportNote = 'Unpacking…';
    try {
      const entries = unzipSync(bytes);
      const names = Object.keys(entries)
        .filter((n) => /\.(jpe?g|png|webp)$/i.test(n) && !n.startsWith('__MACOSX') && !/(^|\/)\./.test(n) && entries[n].length > 0)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      if (!names.length) { this.spinImportNote = 'No images found in that zip'; return; }
      const cap = ContentCanvasComponent.SPIN_MAX_FRAMES;
      const picked = names.length <= cap
        ? names
        : Array.from({ length: cap }, (_, i) => names[Math.round((i * (names.length - 1)) / (cap - 1))]);
      const frames: string[] = [];
      for (let i = 0; i < picked.length; i++) {
        this.spinImportNote = 'Processing ' + (i + 1) + '/' + picked.length + '…';
        const raw = await this.bytesToDataUrl(entries[picked[i]], picked[i]);
        frames.push(await this.picker.compress(raw, ContentCanvasComponent.SPIN_MAX_EDGE));
      }
      el.frames = frames;
      this.spinIdx = 0;
      this.spinImportNote = '';
      this.saveSoon();
    } catch {
      this.spinImportNote = 'Could not read that zip';
    } finally {
      this.importingSpin = false;
    }
  }

  private bytesToDataUrl(bytes: Uint8Array, name: string): Promise<string> {
    const mime = /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg';
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read failed')));
      reader.onerror = () => reject(new Error('read failed'));
      // slice() re-backs the view with a plain ArrayBuffer — keeps newer TS libs
      // (Uint8Array<ArrayBufferLike> vs BlobPart) happy across toolchains.
      reader.readAsDataURL(new Blob([bytes.slice().buffer], { type: mime }));
    });
  }
  kickVideo(ev: Event): void {
    const v = ev.target as HTMLVideoElement;
    v.muted = true;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay/decode race */ });
  }
  select(el: CanvasElement): void { this.selectedId = el.id; this.spinIdx = 0; }
  selectCanvas(): void { if (!this.selected && this.sortedElements[0]) this.select(this.sortedElements[0]); }

  startDrag(ev: PointerEvent, el: CanvasElement): void {
    ev.stopPropagation();
    this.select(el);
    if (el.locked) return;
    this.dragging = { id: el.id, sx: ev.clientX, sy: ev.clientY, ox: el.x, oy: el.y };
    const move = (e: PointerEvent) => this.drag(e);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      this.dragging = undefined;
      this.saveSoon();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  drag(ev: PointerEvent): void {
    if (!this.dragging) return;
    const el = this.canvas.elements.find((e) => e.id === this.dragging!.id);
    if (!el) return;
    const stage = document.querySelector('.stage') as HTMLElement | null;
    const rect = stage?.getBoundingClientRect();
    if (!rect) return;
    el.x = this.clamp(0, 100 - el.w, this.dragging.ox + ((ev.clientX - this.dragging.sx) / rect.width) * 100);
    el.y = this.clamp(0, 100 - el.h, this.dragging.oy + ((ev.clientY - this.dragging.sy) / rect.height) * 100);
  }
  clamp(min: number, max: number, value: number): number { return Math.max(min, Math.min(max, value)); }
  clampElement(el: CanvasElement): void {
    el.w = this.clamp(4, 100, el.w);
    el.h = this.clamp(4, 100, el.h);
    el.x = this.clamp(0, 100 - el.w, el.x);
    el.y = this.clamp(0, 100 - el.h, el.y);
  }
  bringFront(el: CanvasElement): void { el.z = this.nextZ(); this.saveSoon(); }
  sendBack(el: CanvasElement): void {
    const others = this.canvas.elements.filter((e) => e.id !== el.id).map((e) => e.z || 0);
    el.z = others.length ? Math.max(0, Math.min(...others) - 1) : 0;
    this.saveSoon();
  }
  remove(el: CanvasElement): void {
    this.canvas.elements = this.canvas.elements.filter((e) => e.id !== el.id);
    this.selectedId = this.sortedElements[0]?.id || '';
    this.saveSoon();
  }

  applyPromoPreset(preset: ProductPromoPreset): void {
    if (!this.draft) return;
    // White canvas by default; preset text colors are dark so they stay readable on it.
    const base = { background: '#FFFFFF' };
    const product: CanvasElement = { id: this.makeId(), kind: 'image', text: 'Upload product', fit: 'cover', x: 39, y: 10, w: 22, h: 80, z: 2, radius: 24 };
    const left: CanvasElement = { id: this.makeId(), kind: 'text', text: 'NEW ARRIVAL', x: 6, y: 22, w: 30, h: 18, z: 3, color: '#2F006D', fontSize: 30, bold: true };
    const right: CanvasElement = { id: this.makeId(), kind: 'text', text: 'LIMITED OFFER', x: 64, y: 24, w: 30, h: 18, z: 3, color: '#12002D', fontSize: 28, bold: true };
    const elements = preset === 'product-only' ? [product]
      : preset === 'text-product' ? [left, product]
      : preset === 'product-text' ? [product, right]
      : [left, product, right];
    this.draft.productPromo = { preset, ...base, elements };
    this.selectedId = product.id;
    this.showAddPanel = false;
    this.saveSoon();
  }

  saveSoon(): void {
    if (!this.draft) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.content.save(this.draft!), 250);
  }
  async saveNow(): Promise<void> { if (this.draft) await this.content.save(this.draft); }
  async preview(): Promise<void> { this.showAddPanel = false; await this.saveNow(); }
  async saveAndDeploy(): Promise<void> { await this.saveNow(); if (this.draft) this.router.navigateByUrl('/deploy/' + this.draft.id); }
  back(): void { this.router.navigateByUrl('/tabs/content'); }
}
