import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonProgressBar } from '@ionic/angular/standalone';
import { ColorPickerComponent } from '../shared/color-picker.component';
import { ThemeService, SavedTheme } from '../services/theme.service';
import type { ThemeTokens, HomeLayout, CardStyle, IntermediateStyle, ResultTemplate, TransitionType, AnimSpeed, LoaderStyle, LogoPosition } from '@contract/layout';

/**
 * 10-step visual theme wizard (B4–B13). Each step edits part of the ThemeTokens
 * draft with a persistent live LCD preview. Color rows use <app-color-picker>
 * (presets + wheel + hex). Save → My Themes.
 */
@Component({
  selector: 'app-theme-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerComponent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonProgressBar],
  styles: [`
    .prev{border-radius:8px;overflow:hidden;height:96px;display:flex;flex-direction:column;margin-bottom:12px}
    .prev .hdr{font-family:'Barlow Condensed';font-weight:900;color:#fff;font-size:13px;padding:5px 9px}
    .prev .grid{flex:1;display:flex;padding:6px}
    .prev .c{flex:1;margin:0 3px;border-radius:4px;display:flex;align-items:flex-end;padding:3px;font-size:9px;font-weight:800}
    .step-title{font-size:15px;font-weight:800;color:#0F172A;margin:4px 0 10px}
    .opts{display:flex;flex-wrap:wrap}
    .opt{border:1.5px solid #E2E8F0;border-radius:8px;padding:8px 12px;margin:0 8px 8px 0;font-size:12px;cursor:pointer;background:#fff;color:#475569}
    .opt.sel{border-color:#2F006D;background:#F8F5FF;color:#2F006D;font-weight:700}
    .seg{display:flex;flex-wrap:wrap}
    table.sum{width:100%;border-collapse:collapse;font-size:12px}
    table.sum td{padding:4px 0;border-top:1px solid #F1F5F9}
    table.sum td:first-child{color:#94A3B8;width:48%}
  `],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="cancel()">Cancel</ion-button></ion-buttons>
      <ion-title>{{ name || 'New Theme' }} · {{ step }}/{{ STEPS }}</ion-title>
      <ion-buttons slot="end"><ion-button strong="true" (click)="save()">Save</ion-button></ion-buttons>
    </ion-toolbar><ion-progress-bar [value]="step / STEPS"></ion-progress-bar></ion-header>

    <ion-content class="ion-padding">
      <!-- live preview -->
      <div class="prev" [style.background]="t.background">
        <div class="hdr" [style.background]="t.headerColor">NEWTON TOUCH</div>
        <div class="grid">
          <div class="c" [style.background]="t.cardBackground" [style.color]="t.cardText" [style.border]="'2px solid ' + t.accent">A</div>
          <div class="c" [style.background]="t.cardBackground" [style.color]="t.cardText">B</div>
          <div class="c" [style.background]="t.cardBackground" [style.color]="t.cardText">C</div>
        </div>
      </div>

      <ng-container [ngSwitch]="step">
        <!-- 1 · Home Layout (B4) -->
        <div *ngSwitchCase="1"><div class="step-title">1 · Home Layout</div>
          <div class="opts"><div class="opt" *ngFor="let o of homeLayouts" [class.sel]="t.homeLayout===o" (click)="t.homeLayout=o">{{ o }}</div></div>
          <div class="step-title" style="font-size:12px;margin-top:14px">Intermediate page</div>
          <div class="seg">
            <div class="opt" [class.sel]="t.includeIntermediate" (click)="t.includeIntermediate=true">Include</div>
            <div class="opt" [class.sel]="!t.includeIntermediate" (click)="t.includeIntermediate=false">Skip (Home → Result)</div>
          </div>
          <p style="font-size:11px;color:#94A3B8">Skip if this app doesn't drill down — a Home tap goes straight to the Result page.</p>
        </div>
        <!-- 2 · Card Style (B5) -->
        <div *ngSwitchCase="2"><div class="step-title">2 · Card Style</div>
          <div class="opts"><div class="opt" *ngFor="let o of cardStyles" [class.sel]="t.cardStyle===o" (click)="t.cardStyle=o">{{ o }}</div></div>
        </div>
        <!-- 3 · Colors & Branding (B6) -->
        <div *ngSwitchCase="3"><div class="step-title">3 · Colors &amp; Branding</div>
          <app-color-picker label="Header" hint="top bar" [value]="t.headerColor" (valueChange)="t.headerColor=$event"></app-color-picker>
          <app-color-picker label="Card area background" [value]="t.background" (valueChange)="t.background=$event" [presets]="bgPresets"></app-color-picker>
          <app-color-picker label="Card background" [value]="t.cardBackground" (valueChange)="t.cardBackground=$event" [presets]="cardPresets"></app-color-picker>
          <app-color-picker label="Card text" [value]="t.cardText" (valueChange)="t.cardText=$event" [presets]="textPresets"></app-color-picker>
          <app-color-picker label="Accent / highlight" [value]="t.accent" (valueChange)="t.accent=$event"></app-color-picker>
          <div class="step-title" style="font-size:12px">Logo position</div>
          <div class="seg"><div class="opt" *ngFor="let o of logoPositions" [class.sel]="t.logoPosition===o" (click)="t.logoPosition=o">{{ o }}</div></div>
        </div>
        <!-- 4 · Intermediate Style (B7) -->
        <div *ngSwitchCase="4"><div class="step-title">4 · Intermediate Style</div>
          <div class="opts"><div class="opt" *ngFor="let o of intStyles" [class.sel]="t.intermediateStyle===o" (click)="t.intermediateStyle=o">{{ o }}</div></div>
        </div>
        <!-- 5 · Intermediate Colors (B8) -->
        <div *ngSwitchCase="5"><div class="step-title">5 · Intermediate Colors</div>
          <app-color-picker label="Header / breadcrumb" [value]="t.intermediate.headerColor" (valueChange)="t.intermediate.headerColor=$event"></app-color-picker>
          <app-color-picker label="Page background" [value]="t.intermediate.background" (valueChange)="t.intermediate.background=$event" [presets]="bgPresets"></app-color-picker>
          <app-color-picker label="Row / card background" [value]="t.intermediate.cardBackground" (valueChange)="t.intermediate.cardBackground=$event" [presets]="cardPresets"></app-color-picker>
          <app-color-picker label="Card text" [value]="t.intermediate.cardText" (valueChange)="t.intermediate.cardText=$event" [presets]="textPresets"></app-color-picker>
          <app-color-picker label="Accent / active highlight" [value]="t.intermediate.accent" (valueChange)="t.intermediate.accent=$event"></app-color-picker>
          <div class="step-title" style="font-size:12px">Sub-item size</div>
          <div class="seg"><div class="opt" *ngFor="let o of sizes" [class.sel]="t.intermediate.itemSize===o" (click)="t.intermediate.itemSize=o">{{ o }}</div></div>
        </div>
        <!-- 6 · Result Template (B9) -->
        <div *ngSwitchCase="6"><div class="step-title">6 · Result Template</div>
          <div class="opts"><div class="opt" *ngFor="let o of resultTemplates" [class.sel]="t.resultTemplate===o" (click)="t.resultTemplate=o">{{ o }}</div></div>
        </div>
        <!-- 7 · Result Colors & Path (B10) -->
        <div *ngSwitchCase="7"><div class="step-title">7 · Result Colors &amp; Path</div>
          <app-color-picker label="Header" [value]="t.result.headerColor" (valueChange)="t.result.headerColor=$event"></app-color-picker>
          <app-color-picker label="Page background" [value]="t.result.background" (valueChange)="t.result.background=$event" [presets]="bgPresets"></app-color-picker>
          <app-color-picker label="Product card background" [value]="t.result.cardBackground" (valueChange)="t.result.cardBackground=$event" [presets]="cardPresets"></app-color-picker>
          <app-color-picker label="Card text" [value]="t.result.cardText" (valueChange)="t.result.cardText=$event" [presets]="textPresets"></app-color-picker>
          <app-color-picker label="Accent / highlight" [value]="t.result.accent" (valueChange)="t.result.accent=$event"></app-color-picker>
          <app-color-picker label="Path routing color" [value]="t.result.pathColor" (valueChange)="t.result.pathColor=$event"></app-color-picker>
          <div class="step-title" style="font-size:12px">Path style</div>
          <div class="seg"><div class="opt" *ngFor="let o of pathStyles" [class.sel]="t.result.pathStyle===o" (click)="t.result.pathStyle=o">{{ o }}</div></div>
        </div>
        <!-- 8 · Animations & Loader (B12) -->
        <div *ngSwitchCase="8"><div class="step-title">8 · Animations &amp; Loader</div>
          <div class="step-title" style="font-size:12px">Page transition</div>
          <div class="seg"><div class="opt" *ngFor="let o of transitions" [class.sel]="t.animation.transition===o" (click)="t.animation.transition=o">{{ o }}</div></div>
          <div class="step-title" style="font-size:12px">Speed (applies to all pages)</div>
          <div class="seg"><div class="opt" *ngFor="let o of speeds" [class.sel]="t.animation.speed===o" (click)="t.animation.speed=o">{{ o }}</div></div>
          <div class="step-title" style="font-size:12px">Loader style</div>
          <div class="seg"><div class="opt" *ngFor="let o of loaders" [class.sel]="t.loader.style===o" (click)="t.loader.style=o">{{ o }}</div></div>
          <app-color-picker label="Loader color" [value]="t.loader.color" (valueChange)="t.loader.color=$event"></app-color-picker>
        </div>
        <!-- 9 · Screensaver mode (B11, visual default) -->
        <div *ngSwitchCase="9"><div class="step-title">9 · Screensaver</div>
          <p style="font-size:12px;color:#64748B">Screensaver media (images/video) is attached later in Content. The theme just notes the intended mode.</p>
          <div class="seg"><div class="opt" *ngFor="let o of saverModes" [class.sel]="saverMode===o" (click)="saverMode=o">{{ o }}</div></div>
        </div>
        <!-- 10 · Review & Save (B13) -->
        <div *ngSwitchCase="10"><div class="step-title">10 · Review &amp; Save</div>
          <ion-item><ion-input label="Theme name" labelPlacement="stacked" [(ngModel)]="name" placeholder="e.g. Holiday Dark"></ion-input></ion-item>
          <table class="sum">
            <tr><td>Home layout</td><td>{{ t.homeLayout }}</td></tr>
            <tr><td>Card style</td><td>{{ t.cardStyle }}</td></tr>
            <tr><td>Intermediate</td><td>{{ t.intermediateStyle }}</td></tr>
            <tr><td>Result</td><td>{{ t.resultTemplate }}</td></tr>
            <tr><td>Animation</td><td>{{ t.animation.transition }} · {{ t.animation.speed }}</td></tr>
            <tr><td>Loader</td><td>{{ t.loader.style }}</td></tr>
          </table>
        </div>
      </ng-container>

      <div style="display:flex;margin-top:18px">
        <ion-button fill="outline" [disabled]="step===1" (click)="prev()">‹ Back</ion-button>
        <div style="flex:1"></div>
        <ion-button *ngIf="step < STEPS" (click)="next()">Next ›</ion-button>
        <ion-button *ngIf="step === STEPS" (click)="save()">Save Theme</ion-button>
      </div>
    </ion-content>
  `,
})
export class ThemeWizardComponent implements OnInit {
  STEPS = 10;
  step = 1;
  name = '';
  id: string | null = null;
  t: ThemeTokens = ThemeService.defaultTokens();
  saverMode = 'slideshow';

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

  // Steps 4 (Intermediate Style) & 5 (Intermediate Colors) are skipped when intermediate is off.
  private hidden(s: number): boolean { return !this.t.includeIntermediate && (s === 4 || s === 5); }
  next(): void { let s = this.step; do { s++; } while (s < this.STEPS && this.hidden(s)); this.step = Math.min(s, this.STEPS); }
  prev(): void { let s = this.step; do { s--; } while (s > 1 && this.hidden(s)); this.step = Math.max(s, 1); }

  async save(): Promise<void> {
    const theme: SavedTheme = { id: this.id ?? 'thm_' + Date.now(), name: this.name || 'Untitled Theme', tokens: this.t, updatedAt: Date.now() };
    await this.themes.save(theme);
    this.router.navigateByUrl('/tabs/themes');
  }

  cancel(): void { this.router.navigateByUrl('/tabs/themes'); }
}
