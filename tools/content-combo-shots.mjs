/**
 * content-combo-shots.mjs — screenshot the CONTENT-CREATION preview with REAL dummy
 * images + text, across EVERY theme combo (full cross-product, no dimension fixed).
 *
 * Full cross-product sweep:
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
 * Prereqs (in apps/newtontouch-mobile):
 *   npm i -D playwright && npx playwright install chromium
 *   ionic serve            # DEV build (needs window.ng)
 *
 * Run:
 *   node tools/content-combo-shots.mjs
 *   BASE=http://localhost:8100 OUT=./content-shots node tools/content-combo-shots.mjs
 *   FILTER=surface_glass,inter_circular  node tools/content-combo-shots.mjs
 *   HEADED=1 node tools/content-combo-shots.mjs
 */
import { chromium } from 'playwright';
import fs   from 'node:fs';
import path from 'node:path';

const BASE     = process.env.BASE || 'http://localhost:8100';
const OUT      = process.env.OUT  || path.resolve('./content-shots');
const DRAFT_ID = 'shots_draft';

// ── Dummy image helpers ──────────────────────────────────────────────────────
const IMG = (color) =>
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
    `<rect width='240' height='240' fill='${color}'/></svg>`
  ).toString('base64');

const COLORS = ['#7c3aed','#0ea5e9','#16a34a','#d97706','#db2777','#0f766e'];
const NAMES  = ['Bakery','Dairy','Produce','Meat','Frozen','Drinks'];

// ── Full option lists (mirror theme-combo-shots.mjs exactly) ────────────────
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

// ── Baseline tokens ──────────────────────────────────────────────────────────
function baseTokens() {
  return {
    headerColor: '#2F006D', background: 'linear-gradient(135deg,#2F006D,#001973)',
    cardBackground: 'rgba(255,255,255,0.15)', cardText: '#FFFFFF', accent: '#FFCD00',
    overlayColor: 'rgba(0,0,0,0.6)', cardSurface: 'flat', navStyle: 'floating',
    nav: { backColor:'#FFFFFF', backBg:'rgba(0,0,0,0.35)', homeColor:'#FFFFFF', homeBg:'rgba(0,0,0,0.35)', position:'bottom-left', split:false, backPosition:'bottom-left', homePosition:'bottom-right' },
    logoPosition: 'left', homeLayout: 'grid-2x3', cardSize: 'normal', cardAlign: 'center', cardGap: 'normal',
    cardShape: 'rect', cardContent: 'image-text', cardTextPos: 'below',
    showHeader: true, headerStyle: 'logo+title+caption', headerLayout: 'preset', logoPos: 'left', titlePos: 'center', captionPos: 'center',
    includeIntermediate: true, intermediateStyle: 'image-grid', resultTemplate: 'map-list',
    intermediate: { headerColor:'rgba(0,0,0,0.45)', background:'#1A0036', cardBackground:'rgba(255,255,255,0.08)', cardText:'#FFFFFF', accent:'#FFCD00', itemSize:'medium', showHeader:true, cardShape:'rect', align:'center', gap:'normal' },
    result: { headerColor:'#2F006D', background:'#0A0A1A', cardBackground:'rgba(255,255,255,0.06)', cardText:'#FFFFFF', accent:'#FFCD00', pathColor:'#FFCD00', pathStyle:'dashed', showHeader:true },
    animation: { transition:'fade-slide', speed:'normal', applyToAll:true },
    loader: { style:'spinner', color:'#FFCD00' },
    typography: { fontFamily:"'Inter', sans-serif", textScale:'normal', textFit:'shrink', baseTextColor:'#FFFFFF' },
    saverOverlay: { showContent:true, title:'Demo Store', subtitle:'Touch to begin', position:'center', textColor:'#FFFFFF', bgColor:'transparent' },
  };
}

function baseDraft() {
  return {
    id: DRAFT_ID, name: 'Shots Draft', themeId: 'x', themeName: 'Shots', themeTokens: baseTokens(),
    appMode: 'prototype', fieldSource: 'etc',
    home: NAMES.map((n,i) => ({ id:'c'+i, name:n, image:IMG(COLORS[i%COLORS.length]) })),
    intermediate: NAMES.map((n,i) => ({ id:'i'+i, name:n+' Sub', image:IMG(COLORS[i%COLORS.length]) })),
    result: {
      mapImage: IMG('#cbd5e1'), promoImage: IMG('#111827'),
      products: NAMES.map((n,i) => ({ id:'p'+i, name:n+' Item', price:'$'+(i+1)+'.99', image:IMG(COLORS[i%COLORS.length]), aisle:'A'+(i+1), shelf:''+(i+1) })),
    },
    screensaver: { mode:'slideshow', media:[IMG('#111'),IMG('#333'),IMG('#555')], idleTimeoutSec:60 },
    header: { title:'Demo Store', caption:'Welcome' },
    status: 'draft', updatedAt: Date.now(),
  };
}

// ── Build full cross-product combo list ──────────────────────────────────────
const combos = [];
const add = (id, pages, t) => combos.push({ id, pages, t });

// ── HOME: layout × shape × content × textPos ────────────────────────────────
for (const homeLayout of homeLayouts)
  for (const cardShape of shapes)
    for (const cardContent of contents)
      for (const cardTextPos of textPos)
        add(
          `home__${homeLayout}__${cardShape}__${cardContent}__${cardTextPos}`,
          ['home'],
          { homeLayout, cardShape, cardContent, cardTextPos, cardSize:'normal', cardSurface:'flat', cardAlign:'center', cardGap:'normal' }
        );

// ── HOME + SIZE: size × layout × shape ──────────────────────────────────────
for (const cardSize of sizes)
  for (const homeLayout of homeLayouts)
    for (const cardShape of shapes)
      add(
        `size__${cardSize}__${homeLayout}__${cardShape}`,
        ['home'],
        { homeLayout, cardShape, cardSize, cardContent:'image-text', cardTextPos:'below', cardSurface:'flat', cardAlign:'center', cardGap:'normal' }
      );

// ── HOME + SURFACE: surface × layout × shape × content ──────────────────────
for (const cardSurface of surfaces)
  for (const homeLayout of homeLayouts)
    for (const cardShape of shapes)
      for (const cardContent of contents)
        add(
          `surface__${cardSurface}__${homeLayout}__${cardShape}__${cardContent}`,
          ['home'],
          { homeLayout, cardShape, cardContent, cardSurface, cardTextPos:'below', cardSize:'normal', cardAlign:'center', cardGap:'normal' }
        );

// ── HOME + ALIGN: align × layout × shape ────────────────────────────────────
for (const cardAlign of aligns)
  for (const homeLayout of homeLayouts)
    for (const cardShape of shapes)
      add(
        `align__${cardAlign}__${homeLayout}__${cardShape}`,
        ['home'],
        { homeLayout, cardShape, cardAlign, cardContent:'image-text', cardTextPos:'below', cardSize:'normal', cardSurface:'flat', cardGap:'normal' }
      );

// ── HOME + GAP: gap × layout × shape ────────────────────────────────────────
for (const cardGap of gaps)
  for (const homeLayout of homeLayouts)
    for (const cardShape of shapes)
      add(
        `gap__${cardGap}__${homeLayout}__${cardShape}`,
        ['home'],
        { homeLayout, cardShape, cardGap, cardContent:'image-text', cardTextPos:'below', cardSize:'normal', cardSurface:'flat', cardAlign:'center' }
      );

// ── HOME + ALIGN × GAP: align × gap × layout × shape ────────────────────────
for (const cardAlign of aligns)
  for (const cardGap of gaps)
    for (const homeLayout of homeLayouts)
      for (const cardShape of shapes)
        add(
          `aligngap__${cardAlign}__${cardGap}__${homeLayout}__${cardShape}`,
          ['home'],
          { homeLayout, cardShape, cardAlign, cardGap, cardContent:'image-text', cardTextPos:'below', cardSize:'normal', cardSurface:'flat' }
        );

// ── INTERMEDIATE: style × shape × itemSize ──────────────────────────────────
for (const intermediateStyle of intStyles)
  for (const cardShape of shapes)
    for (const itemSize of itemSizes)
      add(
        `inter__${intermediateStyle}__${cardShape}__${itemSize}`,
        ['inter'],
        { includeIntermediate:true, intermediateStyle, intermediate:{ cardShape, itemSize } }
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
      { showHeader:true, headerLayout:'preset', headerStyle, logoPos }
    );

// ── HEADER custom: logoPos × titlePos × captionPos ──────────────────────────
for (const logoPos of headerPositions)
  for (const titlePos of headerPositions)
    for (const captionPos of headerPositions)
      add(
        `header__custom__logo-${logoPos}__title-${titlePos}__caption-${captionPos}`,
        ['home'],
        { showHeader:true, headerLayout:'custom', logoPos, titlePos, captionPos }
      );

// ── SCREENSAVER ──────────────────────────────────────────────────────────────
add('saver__slideshow', ['saver'], {});

// ── Apply combo to the content-builder component ─────────────────────────────
async function applyCombo(page, t, targetPage) {
  return page.evaluate(({ t, targetPage }) => {
    const ng  = window.ng;
    const cmp = ng.getComponent(document.querySelector('app-content-builder'));
    if (!cmp) return false;
    const nested = ['intermediate','result','typography','nav','animation'];
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

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  fs.mkdirSync(OUT, { recursive: true });

  const FILTER   = (process.env.FILTER || '').split(',').map(s => s.trim()).filter(Boolean);
  const filtered = FILTER.length
    ? combos.filter(c => FILTER.some(f => c.id.includes(f)))
    : combos;

  console.log(`Total combos: ${combos.length}  |  Running: ${filtered.length}${FILTER.length ? `  (FILTER: ${FILTER.join(',')})` : ''}`);
  console.log(`Output → ${OUT}\n`);

  const browser = await chromium.launch({ headless: !process.env.HEADED, slowMo: process.env.HEADED ? 200 : 0 });
  const page    = await browser.newPage({ viewport: { width:760, height:1400 }, deviceScaleFactor:2 });

  // 1) seed the draft into Capacitor Preferences (web = localStorage)
  await page.goto(BASE, { waitUntil:'domcontentloaded' });
  await page.evaluate((d) => localStorage.setItem('CapacitorStorage.nt.content', JSON.stringify([d])), baseDraft());

  // 2) open content builder for that draft
  await page.goto(`${BASE}/#/content-builder/${DRAFT_ID}`, { waitUntil:'networkidle' });
  try {
    await page.waitForSelector('app-content-builder', { timeout:15000 });
  } catch {
    await page.screenshot({ path:path.join(OUT,'_debug.png'), fullPage:true }).catch(()=>{});
    console.error('Could not find <app-content-builder>.');
    console.error('  URL:', page.url(), '  Saved _debug.png');
    await browser.close(); process.exit(1);
  }

  const hasNg = await page.evaluate(() => !!(window.ng && window.ng.getComponent));
  if (!hasNg) {
    console.error('window.ng missing — use a DEV build (ionic serve).');
    await browser.close(); process.exit(1);
  }
  await page.waitForSelector('app-content-preview-strip .prev', { timeout:8000 });

  const manifest = [];
  let i = 0;

  for (const combo of filtered) {
    i++;
    for (const pg of combo.pages) {
      try {
        const ok = await applyCombo(page, combo.t, pg);
        if (!ok) throw new Error('content-builder component not found');
        await page.waitForTimeout(220);
        const prev = await page.$('app-content-preview-strip .prev');
        if (!prev) throw new Error('preview strip not found');
        const file = `${String(i).padStart(4,'0')}_${combo.id}__${pg}.png`;
        await prev.screenshot({ path:path.join(OUT, file) });
        manifest.push({ file, combo:combo.id, page:pg, tokens:JSON.stringify(combo.t) });
        console.log('✓', file);
      } catch (e) {
        console.warn('✗', combo.id, pg, '-', e.message);
        manifest.push({ file:'', combo:combo.id, page:pg, tokens:JSON.stringify(combo.t), error:e.message });
      }
    }

    if (i % 100 === 0) console.log(`  … ${i}/${filtered.length} combos processed`);
  }

  fs.writeFileSync(path.join(OUT,'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT,'manifest.csv'),
    ['file,combo,page,tokens']
      .concat(manifest.map(m => `"${m.file}","${m.combo}","${m.page}","${(m.tokens||'').replace(/"/g,"'")}"` ))
      .join('\n'));

  const errors = manifest.filter(m => m.error).length;
  console.log(`\nDone. ${manifest.length} shots (${errors} errors) → ${OUT}`);
  console.log('Open manifest.csv to review. Flag bad combos by id and share with the team.');
  await browser.close();
}

run();
