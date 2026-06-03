import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter } from '@ionic/angular/standalone';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { ContentService, ContentDraft } from '../services/content.service';
import { SelectFieldComponent, SelectOption } from '../shared/select-field.component';
import type { AppMode } from '@contract/layout';

/** CC-1 (theme) + CC-2 (mode) + name → create draft → builder. Name auto-defaults so
 *  Continue is never silently blocked once theme + mode are chosen. */
@Component({
  selector: 'app-content-create',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, SelectFieldComponent],
  templateUrl: './content-create.component.html',
  styleUrls: ['./content-create.component.scss'],
})
export class ContentCreateComponent implements OnInit {
  name = '';
  themeId = '';
  mode: AppMode = 'category';
  themes: SavedTheme[] = [];

  modes: { id: AppMode; nm: string; ds: string }[] = [
    { id: 'category', nm: 'Category', ds: 'Live API products + uploaded images.' },
    { id: 'prototype', nm: 'Prototype', ds: 'Fully static — build every card by hand.' },
    { id: 'prototype-esl', nm: 'Prototype + ESL', ds: 'Static content plus an ESL tag blink at the Result page.' },
  ];

  constructor(private themeSvc: ThemeService, private content: ContentService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.refreshThemes();
    const pre = this.route.snapshot.queryParamMap.get('theme');
    if (pre && this.themes.some((t) => t.id === pre)) this.themeId = pre;
  }
  /** Ionic page reuse: re-read user themes whenever this page becomes active so
   *  freshly-saved themes show up without an app refresh. */
  async ionViewWillEnter(): Promise<void> { await this.refreshThemes(); }

  private async refreshThemes(): Promise<void> {
    this.themes = [...ThemeService.predefined(), ...(await this.themeSvc.list())];
  }

  get themeOpts(): SelectOption[] {
    return this.themes.map((t) => {
      const badge = t.predefined ? '★ Predefined' : '✎ My theme';
      return { value: t.id, label: t.name, sub: `${badge} · ${t.tokens.homeLayout} · ${t.tokens.cardShape} ${t.tokens.cardContent}` };
    });
  }
  get modeOpts(): SelectOption[] { return this.modes.map((m) => ({ value: m.id, label: m.nm, sub: m.ds })); }
  get selectedTheme(): SavedTheme | undefined { return this.themes.find((t) => t.id === this.themeId); }
  get selectedMode() { return this.modes.find((m) => m.id === this.mode); }

  async next(): Promise<void> {
    const theme = this.selectedTheme;
    if (!theme || !this.mode) return;
    const name = this.name.trim() || `${theme.name} content`;
    const draft: ContentDraft = {
      id: 'cnt_' + Date.now(),
      name,
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
