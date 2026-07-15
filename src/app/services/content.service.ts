import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import type { LayoutJson, AppMode, ThemeTokens, CardItem, ResultProduct, EslLink, EslBlinkBy, Screensaver, FieldSource, ResultContent, MediaContent, CustomCanvasContent, ProductPromoContent } from '@contract/layout';
import { ThemeService } from './theme.service';
import { ImageStoreService } from './image-store.service';
import { bakeryGlowSampleDraft, supermarket2SampleDraft, furnitureSampleDraft, BAKERY_GLOW_SAMPLE_ID, BEAUTY_GLOW_SAMPLE_ID, FRESH_MARKET_SAMPLE_ID, SUPERMARKET2_SAMPLE_ID, FURNITURE_SAMPLE_ID } from './sample-content';

export interface ContentDraft {
  id: string;
  name: string;
  themeId: string;
  themeName: string;
  themeTokens: ThemeTokens;
  appMode: AppMode;
  fieldSource?: FieldSource;   // Category mode: 'category' (category1–4) or 'etc' (etc0–3)
  /** Category mode: case transform applied to API-sourced (locked) article names. */
  articleCase?: 'asis' | 'upper' | 'lower' | 'camel' | 'capital';
  /** Category mode: which article fields the LCD re-fetches from the API at
   *  startup (matched by articleId). Default ['name']. Empty = no live refresh. */
  liveRefresh?: ('name' | 'price')[];
  /** Category mode: how many INTERMEDIATE levels to drill (0=L0 only … 3=L0+L1+L2+L3). */
  categoryLevelCount?: number;
  home: CardItem[];
  intermediate: CardItem[];
  result: ResultContent;
  /** Drill-down authoring mode: 'common' = one shared intermediate page for every
   *  home card; 'individual' = each home card gets its own sub-tree. UI hint only —
   *  the deployed layout encodes this via CardItem.children. */
  drillMode?: 'common' | 'individual';
  /** Result authoring mode: 'common' = one shared product list; 'individual' =
   *  per-leaf products on the drill tree (requires drillMode 'individual'). */
  resultMode?: 'common' | 'individual';
  /** Skip-intermediate result authoring (themes with includeIntermediate=false,
   *  Home → Result directly): 'common' (default) = the ONE shared `result` page;
   *  'per-item' = each home card owns its own FULL Result page (map/promo/products)
   *  in `itemResults`. Distinct from `resultMode` above, which only swaps the
   *  PRODUCT list per drill-tree leaf. Compiled to LayoutJson.resultMode by build(). */
  itemResultMode?: 'common' | 'per-item';
  /** Per-home-card Result pages, keyed by CardItem.id — edited (and kept) even
   *  while itemResultMode is 'common' so switching modes never destroys data;
   *  only deployed when itemResultMode is 'per-item'. */
  itemResults?: { [cardId: string]: ResultContent };
  eslLinks?: EslLink[];
  eslBlinkBy?: EslBlinkBy;
  /** Prototype+ESL LED blink appearance: colour (hex) + duration in seconds. */
  ledColour?: string;
  ledDuration?: string;
  /** Per-content text/data for template sections (moved OUT of the theme so the
   *  theme stays style-only). Merged into the deployed theme at buildPayload. */
  templateData?: {
    floors?: string[]; youAreHereLabel?: string; timerSeconds?: number;       // promo-map-rank
    breadcrumbLabels?: string[]; findItLabel?: string; findAllLabel?: string; heroImage?: string; // finder-detail
    promptPrefix?: string; stepLabels?: string[];                              // finder-select
    /** finder-select fast-lookup index (moved out of the theme — depends on the
     *  drill levels / content). 'alpha' = A–Z; 'number' = min/max/interval. */
    indexMode?: 'alpha' | 'number'; indexNumberMin?: number; indexNumberMax?: number; indexNumberInterval?: number;
    fsSortOrder?: 'none' | 'az' | 'za';
    /** brand-rail: per-drill-level headline messages (index 0 = L1). A blank
     *  level inherits the nearest shallower level's message. */
    brandRailMessages?: string[];
  };
  screensaver: Screensaver;
  /** Media mode only (appMode 'media'): the single image/video to play full-screen. */
  media?: MediaContent;
  /** Custom Canvas mode: freeform 1920x540 composition. */
  customCanvas?: CustomCanvasContent;
  /** Product Promo mode: guided retail promo composition. */
  productPromo?: ProductPromoContent;
  /** Per-deploy header content — fields shown depend on theme.headerStyle.
   *  logoScale is a size multiplier for the header logo (1 = default). */
  header?: { title?: string; caption?: string; logo?: string; logoScale?: number };
  status: 'draft' | 'complete';
  /** Last builder step the user was on — restored when the draft is reopened
   *  so editing resumes where it stopped. Optional (older drafts start at 0). */
  lastStep?: number;
  deployedTo?: string;
  deployedAt?: number;
  updatedAt: number;
}

const KEY = 'nt.content';
/** Legacy Fresh Market seed flag. Kept only so older installs can migrate cleanly. */
const SEED_FLAG = 'nt.content.samplesSeeded';
/** Versioned so the built-in samples can be refreshed once without touching user drafts. */
const BAKERY_SEED_FLAG = 'nt.content.bundledSamplesSeeded.v4';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private cache: ContentDraft[] = [];
  /** Emits when the draft list changes (save / remove) so list views refresh
   *  immediately regardless of Ionic view-lifecycle timing. */
  readonly changed = new Subject<void>();

  constructor(private images: ImageStoreService) {}

  async list(): Promise<ContentDraft[]> {
    if (!this.cache.length) {
      const { value } = await Preferences.get({ key: KEY });
      const raw: ContentDraft[] = value ? JSON.parse(value) : [];
      // Normalize stored theme tokens on read (mk()-style merge onto defaults +
      // enum coercion) so drafts saved by an older app version always deploy a
      // full, current-shape ThemeTokens — previews and the LCD stay in lockstep.
      // Then resolve idb: media refs back to data URIs EAGERLY so every consumer
      // (builder, previews, deploy/externalizeImages) keeps seeing plain data URIs.
      this.cache = await Promise.all(
        raw.map((d) => this.mapMedia({ ...d, themeTokens: ThemeService.normalize(d.themeTokens || {}) }, (v) => this.resolveRef(v))),
      );
      await this.seedSamplesOnce();
    }
    return this.cache;
  }

  // ---- Media externalization (QuotaExceededError fix) ----
  // Preferences is localStorage-backed (~5 MB) — base64 media must NOT live in
  // the nt.content JSON. On persist, every `data:` URI in a draft is swapped for
  // an `idb:<id>` ref (blob goes to IndexedDB via ImageStoreService); on read the
  // refs are resolved back, so the in-memory cache always holds real data URIs.
  // Drafts saved by older app versions hold raw data URIs in Preferences — they
  // load unchanged and get externalized automatically on their next save.

  private async externalizeRef(v: string): Promise<string> {
    return v.startsWith('data:') ? 'idb:' + (await this.images.put(v, 'c')) : v;
  }

  private async resolveRef(v: string): Promise<string> {
    if (!v.startsWith('idb:')) return v;
    const data = await this.images.get(v.slice(4));
    if (data === undefined) console.warn(`[nt-content] Missing image blob ${v} — was it gc'd externally?`);
    return data ?? v;
  }

  /** Deep-walk every media-bearing field of a draft, mapping each ref through `fn`.
   *  Walked: home/intermediate card trees (incl. nested children), result
   *  map/promo/product images, per-item result pages (itemResults), screensaver
   *  media, header logo, and the draft's themeTokens backgroundImages
   *  (root + intermediate + result sub-themes). */
  private async mapMedia(d: ContentDraft, fn: (v: string) => Promise<string>): Promise<ContentDraft> {
    const val = async (v?: string): Promise<string | undefined> => (v ? await fn(v) : v);
    const cards = async (items?: CardItem[]): Promise<CardItem[] | undefined> =>
      items ? Promise.all(items.map(async (c) => ({
        ...c,
        image: await val(c.image),
        children: await cards(c.children),
        // Leaf-level result products (Individual result mode) carry images too.
        products: c.products ? await Promise.all(c.products.map(async (p) => ({ ...p, image: await val(p.image) }))) : c.products,
      }))) : items;
    // ResultContent media walk — shared by the common result AND each per-item
    // result page (itemResults values carry mapImage/promoImage/product images too).
    const resultMedia = async (r?: ResultContent): Promise<ResultContent> => ({
      ...(r || { products: [] }),
      mapImage: await val(r?.mapImage),
      promoImage: await val(r?.promoImage),
      products: await Promise.all((r?.products || []).map(async (p) => ({ ...p, image: await val(p.image) }))),
    });
    const itemResults = d.itemResults
      ? Object.fromEntries(await Promise.all(Object.entries(d.itemResults).map(async ([id, r]) => [id, await resultMedia(r)] as const)))
      : d.itemResults;
    const canvasMedia = async <T extends CustomCanvasContent | ProductPromoContent | undefined>(canvas: T): Promise<T> => {
      if (!canvas) return canvas;
      return {
        ...canvas,
        elements: await Promise.all((canvas.elements || []).map(async (el) => ({
          ...el,
          src: await val(el.src),
          // 360° spin frames: each frame is externalized/resolved like a src.
          frames: el.frames ? await Promise.all(el.frames.map((f) => fn(f))) : el.frames,
        }))),
      } as T;
    };
    const t = d.themeTokens;
    return {
      ...d,
      themeTokens: {
        ...t,
        backgroundImage: await val(t.backgroundImage),
        intermediate: { ...t.intermediate, backgroundImage: await val(t.intermediate?.backgroundImage) },
        result: { ...t.result, backgroundImage: await val(t.result?.backgroundImage) },
        // Custom nav-button icons may be data URIs — externalize/resolve like other media.
        nav: t.nav ? { ...t.nav, backIcon: await val(t.nav.backIcon), homeIcon: await val(t.nav.homeIcon) } : t.nav,
      },
      home: (await cards(d.home)) ?? [],
      intermediate: (await cards(d.intermediate)) ?? [],
      result: await resultMedia(d.result),
      itemResults,
      screensaver: { ...d.screensaver, media: await Promise.all((d.screensaver?.media || []).map((m) => fn(m))) },
      header: d.header ? { ...d.header, logo: await val(d.header.logo) } : d.header,
      // Media mode (appMode 'media'): the single image/video data URI is large
      // (esp. video) — externalize it to IndexedDB so it never bloats the
      // Preferences-backed drafts blob and blows the storage quota.
      media: d.media && d.media.url ? { ...d.media, url: await fn(d.media.url) } : d.media,
      customCanvas: await canvasMedia(d.customCanvas),
      productPromo: await canvasMedia(d.productPromo),
    };
  }

  /** Persist drafts with media externalized to IndexedDB, then gc orphaned blobs.
   *  A quota error logs loudly instead of crashing the caller — the in-memory
   *  cache stays correct either way. */
  private async persist(next: ContentDraft[]): Promise<void> {
    const live = new Set<string>();
    const collect = async (v: string): Promise<string> => {
      const r = await this.externalizeRef(v);
      if (r.startsWith('idb:')) live.add(r.slice(4));
      return r;
    };
    const stored = await Promise.all(next.map((d) => this.mapMedia(d, collect)));
    try {
      await Preferences.set({ key: KEY, value: JSON.stringify(stored) });
    } catch (e) {
      console.error('[nt-content] Failed to persist drafts (storage quota exceeded?) — changes are in memory only this session.', e);
    }
    await this.images.gc(live, 'c');
  }

  /** Replace older samples with the current Bakery Glow sample.
   *  Guarded so a user deleting the Bakery sample never sees it return. */
  private async seedSamplesOnce(): Promise<void> {
    const { value: bakerySeeded } = await Preferences.get({ key: BAKERY_SEED_FLAG });
    if (bakerySeeded) return;
    const legacyNames = new Set(['Fresh Market – Sample', 'Fresh Market - Sample', 'Fresh Market - sample', 'Beauty Glow - Sample', 'Supermarket2 - Sample', 'Furniture - Sample']);
    const withoutLegacySample = this.cache.filter((d) =>
      d.id !== FRESH_MARKET_SAMPLE_ID && d.id !== BEAUTY_GLOW_SAMPLE_ID && d.id !== BAKERY_GLOW_SAMPLE_ID && d.id !== SUPERMARKET2_SAMPLE_ID && d.id !== FURNITURE_SAMPLE_ID && !legacyNames.has(d.name));
    let next = withoutLegacySample;
    const themes = ThemeService.predefined();
    const bakery = themes.find((t) => t.id === 'pre_fresh_market');
    const supermarket2 = themes.find((t) => t.id === 'pre_supermarket2');
    const furniture = themes.find((t) => t.id === 'pre_furniture');
    next = [
      ...(supermarket2 ? [supermarket2SampleDraft(supermarket2)] : []),
      ...(furniture ? [furnitureSampleDraft(furniture)] : []),
      ...(bakery ? [bakeryGlowSampleDraft(bakery)] : []),
      ...next,
    ];
    if (next !== this.cache) {
      this.cache = next;
      await this.persist(this.cache);
    }
    await Preferences.set({ key: BAKERY_SEED_FLAG, value: '1' });
    await Preferences.set({ key: SEED_FLAG, value: '1' });
  }

  /** True if another content draft already uses this name (case-insensitive,
   *  trimmed). Pass the current draft id to exclude it when renaming/re-saving. */
  async nameExists(name: string, exceptId?: string): Promise<boolean> {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    const target = norm(name);
    if (!target) return false;
    return (await this.list()).some((c) => c.id !== exceptId && norm(c.name) === target);
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
    await this.persist(next);
    this.changed.next();
  }

  /** Delete a content draft. */
  async remove(id: string): Promise<void> {
    await this.list();
    // New array reference (not in-place mutation) so list consumers re-render.
    const next = this.cache.filter((c) => c.id !== id);
    this.cache = next;
    await this.persist(next);
    this.changed.next();
  }

  /** Compile a draft into the deployable layout.json (the contract LCD renders).
   *  `creds` (optional) are embedded as `liveApi` for Category mode so the LCD can
   *  refresh article values from the SOLUM API at startup. */
  build(d: ContentDraft, creds?: { serverUrl: string; token: string; companyId: string; storeId: string }): LayoutJson {
    // Map coordinates are RELATIVE percentages (0–100) per the contract — clamp
    // free-typed values so an out-of-range number can never push the marker
    // off the map on the 1920-wide kiosk.
    const clampPct = (v?: number): number | undefined =>
      v == null || isNaN(Number(v)) ? undefined : Math.min(100, Math.max(0, Number(v)));
    const clampResult = (r?: ResultContent): ResultContent => ({
      ...(r || { products: [] }),
      products: (r?.products || []).map((p) => ({ ...p, mapX: clampPct(p.mapX), mapY: clampPct(p.mapY) })),
    });
    const result: ResultContent = clampResult(d.result);
    // Merge per-content template text/data into a CLONED theme (theme itself stays
    // style-only and gets overwritten on re-sync, so the data lives on the draft).
    const theme: ThemeTokens = { ...d.themeTokens, result: { ...d.themeTokens.result }, intermediate: { ...d.themeTokens.intermediate } };
    const td = d.templateData;
    if (td) {
      const r: any = theme.result, im: any = theme.intermediate;
      if (td.floors) r.floors = td.floors;
      if (td.youAreHereLabel != null) r.youAreHereLabel = td.youAreHereLabel;
      if (td.timerSeconds != null) r.timerSeconds = td.timerSeconds;
      if (td.breadcrumbLabels) r.breadcrumbLabels = td.breadcrumbLabels;
      if (td.findItLabel != null) r.findItLabel = td.findItLabel;
      if (td.findAllLabel != null) r.findAllLabel = td.findAllLabel;
      if (td.heroImage != null) r.heroImage = td.heroImage;
      if (td.promptPrefix != null) im.promptPrefix = td.promptPrefix;
      if (td.stepLabels) im.stepLabels = td.stepLabels;
      if (td.indexMode != null) im.indexMode = td.indexMode;
      if (td.indexNumberMin != null) im.indexNumberMin = td.indexNumberMin;
      if (td.indexNumberMax != null) im.indexNumberMax = td.indexNumberMax;
      if (td.indexNumberInterval != null) im.indexNumberInterval = td.indexNumberInterval;
      if (td.fsSortOrder != null) im.fsSortOrder = td.fsSortOrder;
      if (td.brandRailMessages && td.brandRailMessages.some((m) => m && m.trim())) {
        im.brandRailMessages = td.brandRailMessages;
        // Base fallback (single-value readers + L1) = first non-empty level.
        const base = td.brandRailMessages.find((m) => m && m.trim());
        if (base) im.brandRailMessageText = base;
      }
    }
    // finder-select: the finder shows one progress step PER DRILL LEVEL (home +
    // intermediate levels = "Category depth"). Emit exactly that many labels,
    // filling blanks with the generic default so the step count always matches.
    if (theme.intermediateStyle === 'finder-select') {
      const levelCount = Math.min(3, Math.max(1, d.categoryLevelCount ?? 1)); // mirrors protoLevelCount
      const count = levelCount + 1;
      const raw = td?.stepLabels || [];
      (theme.intermediate as any).stepLabels = Array.from({ length: count }, (_, i) => (raw[i] && raw[i].trim()) ? raw[i].trim() : 'Category ' + (i + 1));
    }
    const payload: LayoutJson = {
      schemaVersion: 1,
      contentName: d.name,
      appMode: d.appMode,
      theme,
      home: d.home,
      intermediate: d.intermediate,
      result,
      screensaver: d.screensaver,
    };
    // Per-item result pages (skip-intermediate themes only): deploy itemResults
    // with the same mapX/mapY clamping as the common result, restricted to ids
    // that still exist as home cards. The draft keeps BOTH structures; only the
    // active mode reaches the kiosk ('common' stays the absent/default encoding).
    if (d.themeTokens.includeIntermediate === false && d.itemResultMode === 'per-item' && d.itemResults) {
      const entries = Object.entries(d.itemResults).filter(([id]) => d.home.some((c) => c.id === id));
      if (entries.length) {
        payload.resultMode = 'per-item';
        payload.itemResults = Object.fromEntries(entries.map(([id, r]) => [id, clampResult(r)]));
      }
    }
    // Include the header whenever ANY field is set — a logo-only header was
    // previously dropped here, so the deployed LCD never showed the custom logo.
    if (d.header && (d.header.title || d.header.caption || d.header.logo || (d.header.logoScale != null && d.header.logoScale !== 1))) payload.header = { ...d.header };
    if (d.appMode === 'prototype-esl') {
      payload.eslLinks = d.eslLinks ?? [];
      payload.eslBlinkBy = d.eslBlinkBy ?? 'article';
    }
    if (d.appMode === 'category' && d.fieldSource) payload.fieldSource = d.fieldSource;
    // Category live data: the LCD logs in itself (encrypted creds travel in the
    // separate serverConfig message) and fetches the API — so NO creds/token here.
    // Only the article-case + refresh preference ride along.
    if (d.appMode === 'category') {
      const refresh = d.liveRefresh?.length ? d.liveRefresh : ['name'] as ('name' | 'price')[];
      payload.liveApi = { refresh, articleCase: d.articleCase || 'asis' };
    }
    if (d.appMode === 'media' && d.media) payload.media = d.media;
    if (d.appMode === 'custom-canvas' && d.customCanvas) payload.customCanvas = d.customCanvas;
    if (d.appMode === 'product-promo' && d.productPromo) payload.productPromo = d.productPromo;
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
        route: d.result.route,
      },
      // Per-item result pages (skip-intermediate themes) — media refs stripped like the shared result.
      itemResultMode: d.itemResultMode,
      itemResults: d.itemResults
        ? Object.fromEntries(Object.entries(d.itemResults).map(([id, r]) => [id, {
            mapImage: r.mapImage ? '«ref»' : undefined,
            promoImage: r.promoImage ? '«ref»' : undefined,
            products: (r.products || []).map((p) => ({ ...p, image: p.image ? '«ref»' : undefined })),
            route: r.route,
          }]))
        : undefined,
      eslLinks: d.eslLinks, eslBlinkBy: d.eslBlinkBy,
      customCanvas: d.customCanvas ? { ...d.customCanvas, elements: d.customCanvas.elements.map((el) => ({ ...el, src: el.src ? '«ref»' : undefined, frames: el.frames?.length ? el.frames.map(() => '«ref»') : undefined })) } : undefined,
      productPromo: d.productPromo ? { ...d.productPromo, elements: d.productPromo.elements.map((el) => ({ ...el, src: el.src ? '«ref»' : undefined, frames: el.frames?.length ? el.frames.map(() => '«ref»') : undefined })) } : undefined,
      note: 'Media excluded by design — re-attach images/video on import (Category mode re-fetches from API).',
    };
    return JSON.stringify(manifest, null, 2);
  }
}
