/**
 * theme-combo-shots.mjs — screenshot EVERY theme combo from the wizard preview.
 *
 * Full cross-product sweep — no dimension is ever held at a single baseline:
 *
 *   HOME (layout × shape × content × textPos)           =  12×4×5×4  =   960
 *   HOME + size   (size × layout × shape)               =   4×12×4   =   192
 *   HOME + surface (surface × layout × shape × content) =  5×12×4×5  = 1,200
 *   HOME + align  (align × layout × shape)              =   3×12×4   =   144
 *   HOME + gap    (gap × layout × shape)                =   3×12×4   =   144
 *   HOME + align+gap (align × gap × layout × shape)     =  3×3×12×4  =   432
 *   INTERMEDIATE  (style × shape × itemSize)            =  11×4×3    =   132
 *   RESULT        (all 16 templates)                    =      16    =    16
 *   HEADER preset (preset × logoPos)                    =   5×4      =    20
 *   HEADER custom (logoPos × titlePos × captionPos)     =   4×4×4   =    64
 *   SCREENSAVER                                         =       1   =     1
 *
 *   TOTAL ≈ 3,305 screenshots  (~8–12 min headless, ~200ms/shot)
 *
 * Prereqs (run in apps/newtontouch-mobile):
 *   npm i -D playwright
 *   npx playwright install chromium
 *   ionic serve            # or: ng serve  (DEV build — needs window.ng)
 *
 * Run:
 *   node tools/theme-combo-shots.mjs
 *   BASE=http://localhost:8100 OUT=./combo-shots node tools/theme-combo-shots.mjs
 *   FILTER=surface_glass,inter_circular  node tools/theme-combo-shots.mjs
 *   HEADED=1 node tools/theme-combo-shots.mjs
 *
 * FILTER: comma-separated substrings — only combos whose id contains any one of them
 * are shot. Useful for spot-checking a subset while developing.
 */
import { chromium } from 'playwright';
import fs   from 'node:fs';
import path from 'node:path';

const BASE       = process.env.BASE || 'http://localhost:8100';
const OUT        = process.env.OUT  || path.resolve('./combo-shots');
const WIZARD_URL = `${BASE}/#/theme-wizard`;

// ── Full option lists ────────────────────────────────────────────────────────
const homeLayouts     = ['grid-2x3','grid-2x2','col-2','col-3','col-4','hero-list','fullscreen','image-strip','hero-start','promo-categories','h-scroll','bento'];
const shapes          = ['rect','pill','circle','hexagon'];
const contents        = ['image-text','image-only','icon-text','color-block','gradient'];
const textPos         = ['overlay-top','overlay-bottom','below','center'];
const sizes           = ['xs','small','normal','large'];
const surfaces        = ['flat','glass','raised','outlined','glow'];
const aligns          = ['left','center','right'];
const gaps            = ['tight','normal','loose'];
const intStyles       = ['pill-tabs','image-grid','hex-grid','circular','card-strip','fullscreen','center-tiles','side-rail','brand-grid','brand-rail','drill-stair'];
const resultTemplates = ['map-list','cards-map','dual-list','split-panel','list-only','map-full','card-grid','minimal','esl-focus','drill-stair','filter-list','map-filter-list','promo-list','catalog-grid','product-focus','hero-product'];
const headerPresets   = ['logo-only','title-only','logo+title','title+caption','logo+title+caption'];
const headerPositions = ['left','center','right','hidden'];
const itemSizes       = ['small','medium','large'];

// ── Build full cross-product combo list ──────────────────────────────────────
const combos = [];
const add = (id, pages, t) => combos.push({ id, pages, t });

// ── HOME: layout × shape × content × textPos ────────────────────────────────
// Every visual permutation of card appearance across every layout.
for (const homeLayout of homeLayouts)
  for (const cardShape of shapes)
    for (const cardContent of contents)
      for (const cardTextPos of textPos)
        add(
          `home__${homeLayout}__${cardShape}__${cardContent}__${cardTextPos}`,
          ['home'],
          { homeLayout, cardShape, cardContent, cardTextPos, cardSize: 'normal', cardSurface: 'flat', cardAlign: 'center', cardGap: 'normal' }
        );

// ── HOME + SIZE: size × layout × shape ──────────────────────────────────────
// Card size interacts with both layout density and shape rendering.
for (const cardSize of sizes)
  for (const homeLayout of homeLayouts)
    for (const cardShape of shapes)
      add(
        `size__${cardSize}__${homeLayout}__${cardShape}`,
        ['home'],
        { homeLayout, cardShape, cardSize, cardContent: 'image-text', cardTextPos: 'below', cardSurface: 'flat', cardAlign: 'center', cardGap: 'normal' }
      );

// ── HOME + SURFACE: surface × layout × shape × content ──────────────────────
// Surface style changes card chrome — must validate across all layout/shape/content combos.
for (const cardSurface of surfaces)
  for (const homeLayout of homeLayouts)
    for (const cardShape of shapes)
      for (const cardContent of contents)
        add(
          `surface__${cardSurface}__${homeLayout}__${cardShape}__${cardContent}`,
          ['home'],
          { homeLayout, cardShape, cardContent, cardSurface, cardTextPos: 'below', cardSize: 'normal', cardAlign: 'center', cardGap: 'normal' }
        );

// ── HOME + ALIGN: align × layout × shape ────────────────────────────────────
for (const cardAlign of aligns)
  for (const homeLayout of homeLayouts)
    for (const cardShape of shapes)
      add(
        `align__${cardAlign}__${homeLayout}__${cardShape}`,
        ['home'],
        { homeLayout, cardShape, cardAlign, cardContent: 'image-text', cardTextPos: 'below', cardSize: 'normal', cardSurface: 'flat', cardGap: 'normal' }
      );

// ── HOME + GAP: gap × layout × shape ────────────────────────────────────────
for (const cardGap of gaps)
  for (const homeLayout of homeLayouts)
    for (const cardShape of shapes)
      add(
        `gap__${cardGap}__${homeLayout}__${cardShape}`,
        ['home'],
        { homeLayout, cardShape, cardGap, cardContent: 'image-text', cardTextPos: 'below', cardSize: 'normal', cardSurface: 'flat', cardAlign: 'center' }
      );

// ── HOME + ALIGN × GAP: align × gap × layout × shape ────────────────────────
// Full interaction of spacing options.
for (const cardAlign of aligns)
  for (const cardGap of gaps)
    for (const homeLayout of homeLayouts)
      for (const cardShape of shapes)
        add(
          `aligngap__${cardAlign}__${cardGap}__${homeLayout}__${cardShape}`,
          ['home'],
          { homeLayout, cardShape, cardAlign, cardGap, cardContent: 'image-text', cardTextPos: 'below', cardSize: 'normal', cardSurface: 'flat' }
        );

// ── INTERMEDIATE: style × shape × itemSize ──────────────────────────────────
// Every intermediate layout style with every card shape and item size.
for (const intermediateStyle of intStyles)
  for (const cardShape of shapes)
    for (const itemSize of itemSizes)
      add(
        `inter__${intermediateStyle}__${cardShape}__${itemSize}`,
        ['inter'],
        { includeIntermediate: true, intermediateStyle, intermediate: { cardShape, itemSize } }
      );

// ── RESULT: all templates ────────────────────────────────────────────────────
for (const resultTemplate of resultTemplates)
  add(`result__${resultTemplate}`, ['result'], { resultTemplate });

// ── HEADER preset: preset × logoPos ─────────────────────────────────────────
for (const headerStyle of headerPresets)
  for (const logoPos of headerPositions)
    add(
      `header__preset__${headerStyle}__logo-${logoPos}`,
      ['home'],
      { showHeader: true, headerLayout: 'preset', headerStyle, logoPos }
    );

// ── HEADER custom: logoPos × titlePos × captionPos ──────────────────────────
for (const logoPos of headerPositions)
  for (const titlePos of headerPositions)
    for (const captionPos of headerPositions)
      add(
        `header__custom__logo-${logoPos}__title-${titlePos}__caption-${captionPos}`,
        ['home'],
        { showHeader: true, headerLayout: 'custom', logoPos, titlePos, captionPos }
      );

// ── SCREENSAVER ──────────────────────────────────────────────────────────────
add('saver__slideshow', ['saver'], {});

// ── Apply tokens + jump to Review step ──────────────────────────────────────
async function applyCombo(page, t) {
  await page.evaluate((t) => {
    const ng  = window.ng;
    const el  = document.querySelector('app-theme-wizard');
    const cmp = ng.getComponent(el);
    const nested = ['intermediate','result','typography','nav','animation'];
    for (const [k, v] of Object.entries(t)) {
      if (nested.includes(k) && v && typeof v === 'object') Object.assign(cmp.t[k], v);
      else cmp.t[k] = v;
    }
    cmp.stepIndex = cmp.visibleSteps.length - 1; // Review step renders all pages
    ng.applyChanges(cmp);
  }, t);
  await page.waitForSelector('.slider .slide .prev', { timeout: 5000 });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  fs.mkdirSync(OUT, { recursive: true });

  const FILTER = (process.env.FILTER || '').split(',').map(s => s.trim()).filter(Boolean);
  const filtered = FILTER.length
    ? combos.filter(c => FILTER.some(f => c.id.includes(f)))
    : combos;

  console.log(`Total combos: ${combos.length}  |  Running: ${filtered.length}${FILTER.length ? `  (FILTER: ${FILTER.join(',')})` : ''}`);
  console.log(`Output → ${OUT}\n`);

  const browser = await chromium.launch({ headless: !process.env.HEADED, slowMo: process.env.HEADED ? 200 : 0 });
  const page    = await browser.newPage({ viewport: { width: 760, height: 1400 }, deviceScaleFactor: 2 });

  console.log('Opening', WIZARD_URL);
  await page.goto(WIZARD_URL, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForSelector('app-theme-wizard', { timeout: 30000, state: 'attached' });
  } catch {
    fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: path.join(OUT, '_debug.png'), fullPage: true }).catch(() => {});
    const url  = page.url();
    const body = await page.evaluate(() => document.body?.innerText.slice(0, 300) ?? '(no body)').catch(() => '');
    const tags = await page.evaluate(() => Array.from(document.querySelectorAll('app-root *')).slice(0,8).map(e=>e.tagName.toLowerCase())).catch(()=>[]);
    console.error('\nCould not find <app-theme-wizard>.');
    console.error('  final URL :', url);
    console.error('  top tags  :', tags.join(', '));
    console.error('  body text :', JSON.stringify(body));
    console.error('  saved screenshot →', path.join(OUT, '_debug.png'));
    await browser.close(); process.exit(1);
  }

  const hasNg = await page.evaluate(() => !!(window.ng && window.ng.getComponent));
  if (!hasNg) {
    console.error('window.ng not found — run a DEV build (ng serve / ionic serve), not production.');
    await browser.close(); process.exit(1);
  }

  const manifest = [];
  let i = 0;

  for (const combo of filtered) {
    i++;
    try {
      await applyCombo(page, combo.t);
      await page.waitForTimeout(180);
      const slides = await page.$$('.slider .slide');
      for (const slide of slides) {
        const cap  = (await slide.$eval('.slide-cap', e => e.textContent.trim()).catch(() => 'page')).toLowerCase();
        const want = combo.pages.some(p => cap.includes(p === 'inter' ? 'inter' : p));
        if (!want) continue;
        const prev = await slide.$('.prev');
        if (!prev) continue;
        const file = `${String(i).padStart(4,'0')}_${combo.id}__${cap.replace(/\s+/g,'-')}.png`;
        await prev.screenshot({ path: path.join(OUT, file) });
        manifest.push({ file, combo: combo.id, page: cap, tokens: JSON.stringify(combo.t) });
        console.log('✓', file);
      }
    } catch (e) {
      console.warn('✗', combo.id, '-', e.message);
      manifest.push({ file: '', combo: combo.id, page: 'ERROR', tokens: JSON.stringify(combo.t), error: e.message });
    }

    // progress every 100 combos
    if (i % 100 === 0) console.log(`  … ${i}/${filtered.length} combos processed`);
  }

  fs.writeFileSync(path.join(OUT,'manifest.json'), JSON.stringify(manifest, null, 2));
  const csv = ['file,combo,page,tokens']
    .concat(manifest.map(m => `"${m.file}","${m.combo}","${m.page}","${(m.tokens||'').replace(/"/g,"'")}"` ))
    .join('\n');
  fs.writeFileSync(path.join(OUT,'manifest.csv'), csv);

  const errors = manifest.filter(m => m.error).length;
  console.log(`\nDone. ${manifest.length} shots (${errors} errors) → ${OUT}`);
  console.log('Open manifest.csv to review. Flag bad combos by combo id and share with the team.');
  await browser.close();
}

run();
