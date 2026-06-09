/**
 * content-combo-shots.mjs — screenshot the CONTENT-CREATION preview with REAL dummy
 * images + text, across theme combos. Complements theme-combo-shots.mjs (which uses
 * placeholder blocks). This one seeds a content draft (dummy cards/products/images),
 * opens the content builder, and screenshots the live preview strip per combo/page.
 *
 * Prereqs (in apps/newtontouch-mobile):
 *   npm i -D playwright && npx playwright install chromium
 *   ionic serve            # DEV build (needs window.ng)
 * Run:
 *   node tools/content-combo-shots.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8100';
const OUT = process.env.OUT || path.resolve('./content-shots');
const DRAFT_ID = 'shots_draft';

// labelled dummy images (SVG data URIs → distinguishable in shots)
const IMG = (label, color) => 'data:image/svg+xml;base64,' + Buffer.from(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><rect width='240' height='240' fill='${color}'/><text x='120' y='132' font-size='30' fill='#fff' text-anchor='middle' font-family='sans-serif'>${label}</text></svg>`
).toString('base64');

const COLORS = ['#7c3aed', '#0ea5e9', '#16a34a', '#d97706', '#db2777', '#0f766e'];
const NAMES = ['Bakery', 'Dairy', 'Produce', 'Meat', 'Frozen', 'Drinks'];

// A full, valid ThemeTokens baseline (mirrors the app defaults) — combos override fields.
function baseTokens() {
  return {
    headerColor: '#2F006D', background: 'linear-gradient(135deg,#2F006D,#001973)',
    cardBackground: 'rgba(255,255,255,0.15)', cardText: '#FFFFFF', accent: '#FFCD00',
    overlayColor: 'rgba(0,0,0,0.6)', cardSurface: 'flat', navStyle: 'floating',
    nav: { backColor: '#FFFFFF', backBg: 'rgba(0,0,0,0.35)', homeColor: '#FFFFFF', homeBg: 'rgba(0,0,0,0.35)', position: 'bottom-left', split: false, backPosition: 'bottom-left', homePosition: 'bottom-right' },
    logoPosition: 'left', homeLayout: 'grid-2x3', cardSize: 'normal', cardAlign: 'center', cardGap: 'normal',
    cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'below',
    showHeader: true, headerStyle: 'logo+title+caption', headerLayout: 'preset', logoPos: 'left', titlePos: 'center', captionPos: 'center',
    includeIntermediate: true, intermediateStyle: 'image-grid', resultTemplate: 'map-list',
    intermediate: { headerColor: 'rgba(0,0,0,0.45)', background: '#1A0036', cardBackground: 'rgba(255,255,255,0.08)', cardText: '#FFFFFF', accent: '#FFCD00', itemSize: 'medium', showHeader: true, cardShape: 'rect', align: 'center', gap: 'normal' },
    result: { headerColor: '#2F006D', background: '#0A0A1A', cardBackground: 'rgba(255,255,255,0.06)', cardText: '#FFFFFF', accent: '#FFCD00', pathColor: '#FFCD00', pathStyle: 'dashed', showHeader: true },
    animation: { transition: 'fade-slide', speed: 'normal', applyToAll: true },
    loader: { style: 'spinner', color: '#FFCD00' },
    typography: { fontFamily: "'Inter', sans-serif", textScale: 'normal', textFit: 'shrink', baseTextColor: '#FFFFFF' },
    saverOverlay: { showContent: true, title: 'Demo Store', subtitle: 'Touch to begin', position: 'center', textColor: '#FFFFFF', bgColor: 'transparent' },
  };
}

function baseDraft() {
  return {
    id: DRAFT_ID, name: 'Shots Draft', themeId: 'x', themeName: 'Shots', themeTokens: baseTokens(),
    appMode: 'prototype', fieldSource: 'etc',
    home: NAMES.map((n, i) => ({ id: 'c' + i, name: n, image: IMG(n, COLORS[i % COLORS.length]) })),
    intermediate: NAMES.map((n, i) => ({ id: 'i' + i, name: n + ' Sub', image: IMG(n[0], COLORS[i % COLORS.length]) })),
    result: {
      mapImage: IMG('MAP', '#cbd5e1'), promoImage: IMG('PROMO', '#111827'),
      products: NAMES.map((n, i) => ({ id: 'p' + i, name: n + ' Item', price: '$' + (i + 1) + '.99', image: IMG(n, COLORS[i % COLORS.length]), aisle: 'A' + (i + 1), shelf: '' + (i + 1) })),
    },
    screensaver: { mode: 'slideshow', media: [IMG('S1', '#111'), IMG('S2', '#333'), IMG('S3', '#555')], idleTimeoutSec: 60 },
    header: { title: 'Demo Store', caption: 'Welcome' },
    status: 'draft', updatedAt: Date.now(),
  };
}

// combos focused on REAL-IMAGE rendering
const combos = [];
const add = (id, pages, t) => combos.push({ id, pages, t });
for (const homeLayout of ['grid-2x3', 'grid-2x2', 'col-4', 'hero-list', 'image-strip', 'h-scroll', 'promo-categories', 'bento'])
  add(`home_${homeLayout}`, ['home'], { homeLayout });
for (const cardShape of ['rect', 'pill', 'circle', 'hexagon'])
  for (const cardTextPos of ['overlay-bottom', 'overlay-top', 'below', 'center'])
    add(`home_${cardShape}_imgtext_${cardTextPos}`, ['home'], { homeLayout: 'grid-2x2', cardShape, cardContent: 'image-text', cardTextPos });
for (const cardContent of ['image-text', 'image-only', 'icon-text'])
  add(`home_content_${cardContent}`, ['home'], { homeLayout: 'grid-2x3', cardContent });
for (const intermediateStyle of ['image-grid', 'card-strip', 'side-rail', 'brand-grid', 'brand-rail', 'circular'])
  for (const sh of ['rect', 'circle', 'hexagon'])
    add(`inter_${intermediateStyle}_${sh}`, ['inter'], { includeIntermediate: true, intermediateStyle, intermediate: { cardShape: sh } });
for (const resultTemplate of ['map-list', 'cards-map', 'card-grid', 'catalog-grid', 'product-focus', 'promo-list', 'hero-product', 'map-filter-list'])
  add(`result_${resultTemplate}`, ['result'], { resultTemplate });
add('saver_slideshow', ['saver'], {});

async function applyCombo(page, t, targetPage) {
  return page.evaluate(({ t, targetPage }) => {
    const ng = window.ng;
    const cmp = ng.getComponent(document.querySelector('app-content-builder'));
    if (!cmp) return false;
    const nested = ['intermediate', 'result', 'typography', 'nav', 'animation'];
    for (const [k, v] of Object.entries(t)) {
      if (nested.includes(k) && v && typeof v === 'object') Object.assign(cmp.draft.themeTokens[k], v);
      else cmp.draft.themeTokens[k] = v;
    }
    const idx = cmp.visibleSteps.findIndex(s => s.page === targetPage);
    if (idx >= 0) cmp.stepIndex = idx;
    ng.applyChanges(cmp);
    return true;
  }, { t, targetPage });
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 760, height: 1400 }, deviceScaleFactor: 2 });

  // 1) seed the draft into Capacitor Preferences (web = localStorage, key prefix 'CapacitorStorage.')
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((d) => localStorage.setItem('CapacitorStorage.nt.content', JSON.stringify([d])), baseDraft());

  // 2) open the content builder for that draft
  await page.goto(`${BASE}/content-builder/${DRAFT_ID}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('app-content-builder', { timeout: 15000 });
  const hasNg = await page.evaluate(() => !!(window.ng && window.ng.getComponent));
  if (!hasNg) { console.error('window.ng missing — use a DEV build (ionic serve).'); await browser.close(); process.exit(1); }
  await page.waitForSelector('app-content-preview-strip .prev', { timeout: 8000 });

  const manifest = [];
  let i = 0;
  for (const combo of combos) {
    i++;
    for (const pg of combo.pages) {
      try {
        const ok = await applyCombo(page, combo.t, pg);
        if (!ok) throw new Error('content-builder component not found');
        await page.waitForTimeout(220);
        const prev = await page.$('app-content-preview-strip .prev');
        if (!prev) throw new Error('preview strip not found');
        const file = `${String(i).padStart(3, '0')}_${combo.id}__${pg}.png`;
        await prev.screenshot({ path: path.join(OUT, file) });
        manifest.push({ file, combo: combo.id, page: pg, tokens: JSON.stringify(combo.t) });
        console.log('✓', file);
      } catch (e) {
        console.warn('✗', combo.id, pg, '-', e.message);
        manifest.push({ file: '', combo: combo.id, page: pg, tokens: JSON.stringify(combo.t), error: e.message });
      }
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT, 'manifest.csv'),
    ['file,combo,page,tokens'].concat(manifest.map(m => `"${m.file}","${m.combo}","${m.page}","${(m.tokens || '').replace(/"/g, "'")}"`)).join('\n'));
  console.log(`\nDone. ${manifest.length} shots → ${OUT}`);
  await browser.close();
}
run();
