import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonLabel, IonRadioGroup, IonRadio, IonList, IonListHeader } from '@ionic/angular/standalone';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { ContentService, ContentDraft } from '../services/content.service';
import type { AppMode } from '@contract/layout';

/**
 * CC-1 (pick theme) + CC-2 (pick mode) + name → creates a ContentDraft and saves.
 * Per-mode data entry (Category fetch/map · Prototype builders · +ESL id-map) and
 * Deploy are the next screens; this establishes the produce→draft loop.
 */
@Component({
  selector: 'app-content-create',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput],
  styles: [`
    .wrap{padding:14px 16px 24px}
    .lbl{font-size:10px;font-weight:700;color:var(--nt-text-2);text-transform:uppercase;letter-spacing:.5px;margin:16px 0 6px}
    .tc{display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer}
    .tc .sw{width:34px;height:34px;border-radius:7px;flex-shrink:0}
    .tc .nm{font-size:13px;font-weight:700;color:var(--nt-text)}
    .tc .ds{font-size:10px;color:var(--nt-muted)}
    .tc .tick{margin-left:auto;color:var(--nt-purple);font-weight:800}
    .mode{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;cursor:pointer}
    .mode .ic{font-size:22px;flex-shrink:0}
    .mode .nm{font-size:13px;font-weight:700;color:var(--nt-text)}
    .mode .ds{font-size:10px;color:var(--nt-muted);line-height:1.4}
    .mode .tick{margin-left:auto;color:var(--nt-purple);font-weight:800}
  `],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="cancel()">Cancel</ion-button></ion-buttons>
      <ion-title>New Content</ion-title>
    </ion-toolbar></ion-header>
    <ion-content>
      <div class="wrap">
        <ion-item><ion-input label="CONTENT NAME" labelPlacement="stacked" [(ngModel)]="name" placeholder="e.g. Holiday Campaign"></ion-input></ion-item>

        <div class="lbl">Step 1 · Select theme</div>
        <div class="crd tc" [class.sel]="t.id===themeId" *ngFor="let t of themes" (click)="themeId=t.id">
          <div class="sw" [style.background]="t.tokens.background"></div>
          <div><div class="nm">{{ t.name }}</div><div class="ds">{{ t.tokens.homeLayout }} · {{ t.tokens.cardStyle }}</div></div>
          <span class="tick" *ngIf="t.id===themeId">✓</span>
        </div>

        <div class="lbl">Step 2 · App mode</div>
        <div class="crd mode" [class.sel]="mode===m.id" *ngFor="let m of modes" (click)="mode=m.id">
          <div class="ic">{{ m.icon }}</div>
          <div><div class="nm">{{ m.nm }}</div><div class="ds">{{ m.ds }}</div></div>
          <span class="tick" *ngIf="mode===m.id">✓</span>
        </div>

        <button class="btn-y" style="margin-top:16px" [disabled]="!themeId || !name" (click)="next()">
          Continue to {{ mode === 'category' ? 'Fetch Products' : 'Builder' }} →
        </button>
      </div>
    </ion-content>
  `,
})
export class ContentCreateComponent implements OnInit {
  name = '';
  themeId = '';
  mode: AppMode = 'category';
  themes: SavedTheme[] = [];
  modes: { id: AppMode; icon: string; nm: string; ds: string }[] = [
    { id: 'category', icon: '🛒', nm: 'Category', ds: 'Live API products + uploaded images' },
    { id: 'prototype', icon: '✏️', nm: 'Prototype', ds: 'Fully static, build by hand' },
    { id: 'prototype-esl', icon: '🏷️', nm: 'Prototype + ESL', ds: 'Static + blink ESL tag at result' },
  ];

  constructor(private themeSvc: ThemeService, private content: ContentService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.themes = [...ThemeService.predefined(), ...(await this.themeSvc.list())];
    const pre = this.route.snapshot.queryParamMap.get('theme');
    if (pre && this.themes.some((t) => t.id === pre)) this.themeId = pre;
  }

  async next(): Promise<void> {
    const theme = this.themes.find((t) => t.id === this.themeId)!;
    const draft: ContentDraft = {
      id: 'cnt_' + Date.now(),
      name: this.name,
      themeId: theme.id,
      themeName: theme.name,
      themeTokens: theme.tokens,
      appMode: this.mode,
      home: [],
      intermediate: [],
      result: { products: [] },
      screensaver: { mode: 'slideshow', media: [], secondsPerSlide: 5, loop: true, idleTimeoutSec: 60, ctaText: 'Touch screen to begin' },
      status: 'draft',
      updatedAt: Date.now(),
    };
    await this.content.save(draft);
    this.router.navigateByUrl('/content-builder/' + draft.id);
  }

  cancel(): void { this.router.navigateByUrl('/tabs/content'); }
}
