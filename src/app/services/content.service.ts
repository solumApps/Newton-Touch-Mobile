import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { LayoutJson, AppMode, ThemeTokens, CardItem, ResultProduct, EslLink, EslBlinkBy, Screensaver, FieldSource } from '@contract/layout';

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
  result: { mapImage?: string; products: ResultProduct[] };
  eslLinks?: EslLink[];
  eslBlinkBy?: EslBlinkBy;
  screensaver: Screensaver;
  status: 'draft' | 'complete';
  deployedTo?: string;
  deployedAt?: number;
  updatedAt: number;
}

const KEY = 'nt.content';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private cache: ContentDraft[] = [];

  async list(): Promise<ContentDraft[]> {
    if (!this.cache.length) {
      const { value } = await Preferences.get({ key: KEY });
      this.cache = value ? JSON.parse(value) : [];
    }
    return this.cache;
  }

  async save(d: ContentDraft): Promise<void> {
    await this.list();
    d.updatedAt = Date.now();
    const i = this.cache.findIndex((c) => c.id === d.id);
    if (i >= 0) this.cache[i] = d; else this.cache.push(d);
    await Preferences.set({ key: KEY, value: JSON.stringify(this.cache) });
  }

  /** Compile a draft into the deployable layout.json (the contract LCD renders). */
  build(d: ContentDraft): LayoutJson {
    const payload: LayoutJson = {
      schemaVersion: 1,
      contentName: d.name,
      appMode: d.appMode,
      theme: d.themeTokens,
      home: d.home,
      intermediate: d.intermediate,
      result: d.result,
      screensaver: d.screensaver,
    };
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
      result: { products: d.result.products.map((p) => ({ ...p, image: p.image ? '«ref»' : undefined })) },
      eslLinks: d.eslLinks, eslBlinkBy: d.eslBlinkBy,
      note: 'Media excluded by design — re-attach images/video on import (Category mode re-fetches from API).',
    };
    return JSON.stringify(manifest, null, 2);
  }
}
