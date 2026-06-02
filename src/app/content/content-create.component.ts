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
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonLabel, IonRadioGroup, IonRadio, IonList, IonListHeader],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="cancel()">Cancel</ion-button></ion-buttons>
      <ion-title>New Content</ion-title>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <ion-item><ion-input label="Content name" labelPlacement="stacked" [(ngModel)]="name" placeholder="e.g. Holiday Campaign"></ion-input></ion-item>

      <ion-list>
        <ion-list-header><ion-label>Step 1 · Select theme</ion-label></ion-list-header>
        <ion-radio-group [(ngModel)]="themeId">
          <ion-item *ngFor="let t of themes"><ion-label>{{ t.name }}<p>{{ t.tokens.homeLayout }} · {{ t.tokens.cardStyle }}</p></ion-label>
            <ion-radio slot="end" [value]="t.id"></ion-radio></ion-item>
        </ion-radio-group>
      </ion-list>

      <ion-list>
        <ion-list-header><ion-label>Step 2 · App mode</ion-label></ion-list-header>
        <ion-radio-group [(ngModel)]="mode">
          <ion-item><ion-label>Category<p>Live API products + uploaded images</p></ion-label><ion-radio slot="end" value="category"></ion-radio></ion-item>
          <ion-item><ion-label>Prototype<p>Fully static, build by hand</p></ion-label><ion-radio slot="end" value="prototype"></ion-radio></ion-item>
          <ion-item><ion-label>Prototype + ESL<p>Static + blink ESL tag at result</p></ion-label><ion-radio slot="end" value="prototype-esl"></ion-radio></ion-item>
        </ion-radio-group>
      </ion-list>

      <ion-button expand="block" [disabled]="!themeId || !name" (click)="next()">
        Continue to {{ mode === 'category' ? 'Fetch Products' : 'Builder' }} →
      </ion-button>
    </ion-content>
  `,
})
export class ContentCreateComponent implements OnInit {
  name = '';
  themeId = '';
  mode: AppMode = 'category';
  themes: SavedTheme[] = [];

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
