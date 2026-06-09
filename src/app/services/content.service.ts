import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import type { LayoutJson, AppMode, ThemeTokens, CardItem, ResultProduct, EslLink, EslBlinkBy, Screensaver, FieldSource, ResultContent } from '@contract/layout';
import { ThemeService } from './theme.service';
import { freshMarketSampleDraft, FRESH_MARKET_SAMPLE_ID } from './sample-content';

export interface ContentDraft {
  id: string;
  name: string;
  themeId: string;
  themeName: string;
  themeTokens: ThemeTokens;
  appMode: AppMode;
  fieldSource?: FieldSource;   // Category mode: 'category' (category1–4) or 'etc' (etc0–3)
  home: CardItem[];
  intermediate: CardItem[];
  result: ResultContent;
  eslLinks?: EslLink[];
  eslBlinkBy?: EslBlinkBy;
  screensaver: Screensaver;
  /** Per-deploy header content — fields shown depend on theme.headerStyle. */
  header?: { title?: string; caption?: string; logo?: string };
  status: 'draft' | 'complete';
  deployedTo?: string;
  deployedAt?: number;
  updatedAt: number;
}

const KEY = 'nt.content';
/** Set once after seeding built-in sample drafts — deleting a sample never resurrects it. */
const SEED_FLAG = 'nt.content.samplesSeeded';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private cache: ContentDraft[] = [];
  /** Emits when the draft list changes (save / remove) so list views refresh
   *  immediately regardless of Ionic view-lifecycle timing. */
  readonly changed = new Subject<void>();

  async list(): Promise<ContentDraft[]> {
    if (!this.cache.length) {
      const { value } = await Preferences.get({ key: KEY });
      const raw: ContentDraft[] = value ? JSON.parse(value) : [];
      // Normalize stored theme tokens on read (mk()-style merge onto defaults +
      // enum coercion) so drafts saved by an older app version always deploy a
      // full, current-shape ThemeTokens — previews and the LCD stay in lockstep.
      this.cache = raw.map((d) => ({ ...d, themeTokens: ThemeService.normalize(d.themeTokens || {}) }));
      await this.seedSamplesOnce();
    }
    return this.cache;
  }

  /** Seed the built-in "Fresh Market – Sample" draft exactly once (first run).
   *  Guarded by SEED_FLAG so a user deleting the sample never sees it return. */
  private async seedSamplesOnce(): Promise<void> {
    const { value: seeded } = await Preferences.get({ key: SEED_FLAG });
    if (seeded) return;
    if (!this.cache.some((d) => d.id === FRESH_MARKET_SAMPLE_ID)) {
      const theme = ThemeService.predefined().find((t) => t.id === 'pre_fresh_market');
      if (theme) {
        this.cache = [...this.cache, freshMarketSampleDraft(theme)];
        await Preferences.set({ key: KEY, value: JSON.stringify(this.cache) });
      }
    }
    await Preferences.set({ key: SEED_FLAG, value: '1' });
  }

  async save(d: ContentDraft): Promise<void> {
    await this.list();
    d.updatedAt = Date.now();
    const i = this.cache.findIndex((c) => c.id === d.id);
    // Replace cache reference (don't mutate in place) so list consumers see a new
    // array identity and Angular re-renders without a manual refresh.
    const next = [...this.cache];
    if (i >= 0) next[i] = d; else next.push(d);
    this.cache = next;
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
    this.changed.next();
  }

  /** Delete a content draft. */
  async remove(id: string): Promise<void> {
    await this.list();
    // New array reference (not in-place mutation) so list consumers re-render.
    const next = this.cache.filter((c) => c.id !== id);
    this.cache = next;
    await Preferences.set({ key: KEY, value: JSON.stringify(next) });
    this.changed.next();
  }

  /** Compile a draft into the deployable layout.json (the contract LCD renders). */
  build(d: ContentDraft): LayoutJson {
    // Map coordinates are RELATIVE percentages (0–100) per the contract — clamp
    // free-typed values so an out-of-range number can never push the marker
    // off the map on the 1920-wide kiosk.
    const clampPct = (v?: number): number | undefined =>
      v == null || isNaN(Number(v)) ? undefined : Math.min(100, Math.max(0, Number(v)));
    const result: ResultContent = {
      ...d.result,
      products: (d.result?.products || []).map((p) => ({ ...p, mapX: clampPct(p.mapX), mapY: clampPct(p.mapY) })),
    };
    const payload: LayoutJson = {
      schemaVersion: 1,
      contentName: d.name,
      appMode: d.appMode,
      theme: d.themeTokens,
      home: d.home,
      intermediate: d.intermediate,
      result,
      screensaver: d.screensaver,
    };
    if (d.header && (d.header.title || d.header.caption)) payload.header = { ...d.header };
    if (d.appMode === 'prototype-esl') {
      payload.eslLinks = d.eslLinks ?? [];
      payload.eslBlinkBy = d.eslBlinkBy ?? 'article';
    }
    if (d.appMode === 'category' && d.fieldSource) payload.fieldSource = d.fieldSource;
    return payload;
  }

  /** Structure-only export (JSON manifest, NO media — image refs kept, re-attach on import). */
  exportStructure(d: ContentDraft): string {
    const strip = (items: CardItem[]): CardItem[] =>
      items.map((c) => ({ ...c, image: c.image ? '«ref»' : undefined, children: c.children ? strip(c.children) : undefined }));
    const manifest = {
      kind: 'solumcontent', version: 1, name: d.name, appMode: d.appMode, themeId: d.themeId,
      home: strip(d.home), intermediate: strip(d.intermediate),
      result: {
        mapImage: d.result.mapImage ? '«ref»' : undefined,
        promoImage: d.result.promoImage ? '«ref»' : undefined,
        products: d.result.products.map((p) => ({ ...p, image: p.image ? '«ref»' : undefined })),
      },
      eslLinks: d.eslLinks, eslBlinkBy: d.eslBlinkBy,
      note: 'Media excluded by design — re-attach images/video on import (Category mode re-fetches from API).',
    };
    return JSON.stringify(manifest, null, 2);
  }
}
