/**
 * theme-combo-shots.mjs — screenshot every theme combo from the wizard preview.
 *
 * What it does:
 *   - Opens the theme wizard, and for each combo sets the theme tokens directly
 *     (via Angular dev-mode window.ng — fast, no clicking), jumps to the Review
 *     step (which renders Home/Intermediate/Result/Screensaver side by side),
 *     and screenshots the requested page preview(s) into ./combo-shots/.
 *   - Writes manifest.json + manifest.csv mapping every screenshot → its combo.
 *
 * Prereqs (run in apps/newtontouch-mobile):
 *   npm i -D playwright
 *   npx playwright install chromium
 *   ionic serve            # or: ng serve   (dev build, NOT --configuration production)
 *
 * Run:
 *   node tools/theme-combo-shots.mjs
 *   BASE=http://localhost:8100 OUT=./combo-shots node tools/theme-combo-shots.mjs
 *
 * NOTE: the wizard preview uses PLACEHOLDER image blocks (no real photos). It
 * validates every layout/shape/content/size/surface/intermediate/result/header
 * combo. Real dummy-image rendering happens in content creation (separate harness).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8100';
const OUT = process.env.OUT || path.resolve('./combo-shots');
const WIZARD_URL = `${BASE}/#/theme-wizard`;   // app uses hash routing

// ---- combo option lists (edit to widen/narrow the sweep) ----
const homeLayouts = ['grid-2x3', 'grid-2x2', 'col-2', 'col-3', 'col-4', 'hero-list', 'fullscreen', 'image-strip', 'hero-start', 'promo-categories', 'h-scroll', 'bento'];
const shapes = ['rect', 'pill', 'circle', 'hexagon'];
const contents = ['image-text', 'image-only', 'icon-text', 'color-block', 'gradient'];
const textPos = ['overlay-top', 'overlay-bottom', 'below', 'center'];
const sizes = ['xs', 'small', 'normal', 'large'];
const surfaces = ['flat', 'glass', 'raised', 'outlined', 'glow'];
const aligns = ['left', 'center', 'right'];
const gaps = ['tight', 'normal', 'loose'];
const intStyles = ['pill-tabs', 'image-grid', 'hex-grid', 'circular', 'card-strip', 'fullscreen', 'center-tiles', 'side-rail', 'brand-grid', 'brand-rail', 'drill-stair'];
const intImageStyles = ['image-grid', 'card-strip', 'side-rail', 'brand-grid', 'brand-rail']; // shape matters here
const resultTemplates = ['map-list', 'cards-map', 'dual-list', 'split-panel', 'list-only', 'map-full', 'card-grid', 'minimal', 'esl-focus', 'drill-stair', 'filter-list', 'map-filter-list', 'promo-list', 'catalog-grid', 'product-focus', 'hero-product'];
const headerPresets = ['logo-only', 'title-only', 'logo+title', 'title+caption', 'logo+title+caption'];
const headerPositions = ['left', 'center', 'right', 'hidden'];

// ---- build the combo list (each = { id, pages:[...], t:{...partial tokens} }) ----
const combos = [];
const add = (id, pages, t) => combos.push({ id, pages, t });

// A) every home layout (baseline rect / image-text / below)
for (const homeLayout of homeLayouts)
  add(`home_layout_${homeLayout}`, ['home'], { homeLayout, cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'below' });

// B) shape × content × text-position (the combos most prone to bugs) on a 2x2 grid
for (const cardShape of shapes)
  for (const cardContent of contents)
    for (const cardTextPos of textPos)
      add(`home_${cardShape}_${cardContent}_${cardTextPos}`, ['home'],
        { homeLayout: 'grid-2x2', cardShape, cardContent, cardTextPos });

// C) sizes across the size-sensitive layouts (+ a shape grid)
for (const cardSize of sizes)
  for (const homeLayout of ['grid-2x3', 'col-4', 'h-scroll'])
    add(`size_${cardSize}_${homeLayout}`, ['home'], { homeLayout, cardSize, cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'below' });
for (const cardSize of sizes)
  add(`size_${cardSize}_circle`, ['home'], { homeLayout: 'grid-2x2', cardSize, cardShape: 'circle', cardContent: 'image-text', cardTextPos: 'below' });

// D) surfaces × (rect/circle)
for (const cardSurface of surfaces)
  for (const cardShape of ['rect', 'circle'])
    add(`surface_${cardSurface}_${cardShape}`, ['home'], { homeLayout: 'grid-2x2', cardSurface, cardShape, cardContent: 'image-text', cardTextPos: 'below' });

// E) alignment × gap on column / h-scroll
for (const cardAlign of aligns)
  for (const homeLayout of ['col-4', 'h-scroll'])
    add(`align_${cardAlign}_${homeLayout}`, ['home'], { homeLayout, cardAlign, cardShape: 'rect', cardContent: 'image-text' });
for (const cardGap of gaps)
  add(`gap_${cardGap}_col4`, ['home'], { homeLayout: 'col-4', cardGap, cardShape: 'rect', cardContent: 'image-text' });

// F) intermediate styles (+ shape on image styles)
for (const intermediateStyle of intStyles)
  add(`inter_${intermediateStyle}`, ['inter'], { includeIntermediate: true, intermediateStyle });
for (const intermediateStyle of intImageStyles)
  for (const sh of shapes)
    add(`inter_${intermediateStyle}_${sh}`, ['inter'], { includeIntermediate: true, intermediateStyle, intermediate: { cardShape: sh } });
for (const itemSize of ['small', 'medium', 'large'])
  add(`inter_size_${itemSize}`, ['inter'], { includeIntermediate: true, intermediateStyle: 'image-grid', intermediate: { itemSize } });

// G) result templates
for (const resultTemplate of resultTemplates)
  add(`result_${resultTemplate}`, ['result'], { resultTemplate });

// H) header — presets + a few custom layouts
for (const headerStyle of headerPresets)
  add(`header_preset_${headerStyle}`, ['home'], { showHeader: true, headerLayout: 'preset', headerStyle });
for (const logoPos of headerPositions)
  for (const titlePos of ['center', 'left'])
    add(`header_custom_logo-${logoPos}_title-${titlePos}`, ['home'],
      { showHeader: true, headerLayout: 'custom', logoPos, titlePos, captionPos: 'right' });

// ---- apply a token patch + jump to the Review step, in the page ----
async function applyCombo(page, t) {
  await page.evaluate((t) => {
    const ng = window.ng;
    const el = document.querySelector('app-theme-wizard');
    const cmp = ng.getComponent(el);
    const nested = ['intermediate', 'result', 'typography', 'nav', 'animation'];
    for (const [k, v] of Object.entries(t)) {
      if (nested.includes(k) && v && typeof v === 'object') Object.assign(cmp.t[k], v);
      else cmp.t[k] = v;
    }
    cmp.stepIndex = cmp.visibleSteps.length - 1; // Review step renders all pages
    ng.applyChanges(cmp);
  }, t);
  await page.waitForSelector('.slider .slide .prev', { timeout: 5000 });
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  // Set HEADED=1 to watch the browser; default headless.
  const browser = await chromium.launch({ headless: !process.env.HEADED, slowMo: process.env.HEADED ? 200 : 0 });
  const page = await browser.newPage({ viewport: { width: 760, height: 1400 }, deviceScaleFactor: 2 });

  console.log('Opening', WIZARD_URL);
  await page.goto(WIZARD_URL, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('app-theme-wizard', { timeout: 30000, state: 'attached' });
  } catch (e) {
    // dump what the page actually shows so we can diagnose
    fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: path.join(OUT, '_debug.png'), fullPage: true }).catch(() => {});
    const url = page.url();
    const body = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 300) : '(no body)').catch(() => '');
    const tags = await page.evaluate(() => Array.from(document.querySelectorAll('app-root *')).slice(0, 8).map(e => e.tagName.toLowerCase())).catch(() => []);
    console.error('\nCould not find <app-theme-wizard>.');
    console.error('  final URL :', url);
    console.error('  top tags  :', tags.join(', '));
    console.error('  body text :', JSON.stringify(body));
    console.error('  saved screenshot →', path.join(OUT, '_debug.png'));
    console.error('Send me those 4 lines + _debug.png.');
    await browser.close();
    process.exit(1);
  }
  // sanity: dev-mode ng must be present
  const hasNg = await page.evaluate(() => !!(window.ng && window.ng.getComponent));
  if (!hasNg) { console.error('window.ng not found — run a DEV build (ng serve / ionic serve), not production.'); await browser.close(); process.exit(1); }

  const manifest = [];
  // FILTER=substr1,substr2 → only shoot combos whose id contains one of them.
  const FILTER = (process.env.FILTER || '').split(',').map(s => s.trim()).filter(Boolean);
  let i = 0;
  for (const combo of combos) {
    i++;
    if (FILTER.length && !FILTER.some(f => combo.id.includes(f))) continue;
    try {
      await applyCombo(page, combo.t);
      await page.waitForTimeout(180); // let render settle
      const slides = await page.$$('.slider .slide');
      for (const slide of slides) {
        const cap = (await slide.$eval('.slide-cap', e => e.textContent.trim()).catch(() => 'page')).toLowerCase();
        const want = combo.pages.some(p => cap.includes(p === 'inter' ? 'inter' : p));
        if (!want) continue;
        const prev = await slide.$('.prev');
        if (!prev) continue;
        const file = `${String(i).padStart(3, '0')}_${combo.id}__${cap.replace(/\s+/g, '-')}.png`;
        await prev.screenshot({ path: path.join(OUT, file) });
        manifest.push({ file, combo: combo.id, page: cap, tokens: JSON.stringify(combo.t) });
        console.log('✓', file);
      }
    } catch (e) {
      console.warn('✗', combo.id, '-', e.message);
      manifest.push({ file: '', combo: combo.id, page: 'ERROR', tokens: JSON.stringify(combo.t), error: e.message });
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const csv = ['file,combo,page,tokens']
    .concat(manifest.map(m => `"${m.file}","${m.combo}","${m.page}","${(m.tokens || '').replace(/"/g, "'")}"`))
    .join('\n');
  fs.writeFileSync(path.join(OUT, 'manifest.csv'), csv);

  console.log(`\nDone. ${manifest.length} shots → ${OUT}`);
  console.log('Open manifest.csv to see each screenshot’s combo. Flag bad ones, send me their rows.');
  await browser.close();
}

run();
