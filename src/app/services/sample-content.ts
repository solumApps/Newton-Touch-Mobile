/**
 * Built-in sample content — "Fresh Market – Sample".
 *
 * A realistic grocery draft seeded once on first run so users can open the
 * content builder / deploy flow with real-looking data immediately. All images
 * are tiny inline SVG data URIs (gradient backgrounds + simple vector product
 * illustrations) so the sample works fully offline, passes the deploy
 * image-externalizer (`data:image/svg+xml` → .svg files) and keeps the draft
 * far below the 100 KB layout budget.
 */
import type { CardItem, ResultProduct, Screensaver } from '@contract/layout';
import type { SavedTheme } from './theme.service';
import type { ContentDraft } from './content.service';

export const FRESH_MARKET_SAMPLE_ID = 'cnt_sample_fresh_market';

/** Wrap an illustration in a 320×240 gradient-backed SVG and return a data URI. */
const art = (g1: string, g2: string, body: string): string =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    + `<stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/>`
    + '</linearGradient></defs>'
    + '<rect width="320" height="240" fill="url(#g)"/>'
    + body
    + '</svg>');

/* ---- Product illustrations (pure vector, no text) ---- */

/** Apple — Fresh Produce. */
const IMG_PRODUCE = art('#DCFCE7', '#86EFAC',
  '<circle cx="146" cy="138" r="58" fill="#EF4444"/>'
  + '<circle cx="182" cy="138" r="52" fill="#DC2626"/>'
  + '<ellipse cx="128" cy="118" rx="13" ry="20" fill="#FCA5A5" opacity=".7"/>'
  + '<rect x="158" y="64" width="7" height="26" rx="3.5" fill="#7C2D12"/>'
  + '<path d="M166 78 C172 56 192 48 206 50 C204 70 188 82 168 80 Z" fill="#16A34A"/>');

/** Bread loaf — Bakery. */
const IMG_BAKERY = art('#FEF3C7', '#FDE68A',
  '<path d="M76 142 a84 56 0 0 1 168 0 z" fill="#F59E0B"/>'
  + '<path d="M76 142 h168 v26 a14 14 0 0 1 -14 14 H90 a14 14 0 0 1 -14 -14 z" fill="#B45309"/>'
  + '<path d="M118 100 q12 16 2 34 M158 92 q12 16 2 34 M198 100 q12 16 2 34" stroke="#92400E" stroke-width="7" fill="none" stroke-linecap="round"/>');

/** Milk bottle — Dairy &amp; Eggs. */
const IMG_DAIRY = art('#E0F2FE', '#BAE6FD',
  '<path d="M136 60 h48 v20 l14 28 v62 a12 12 0 0 1 -12 12 h-52 a12 12 0 0 1 -12 -12 v-62 l14 -28 z" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="5"/>'
  + '<path d="M122 134 h76 v30 h-76 z" fill="#3B82F6"/>'
  + '<rect x="132" y="50" width="56" height="14" rx="5" fill="#94A3B8"/>');

/** Marbled steak — Butcher. */
const IMG_BUTCHER = art('#FEE2E2', '#FECACA',
  '<path d="M92 156 C72 116 102 84 150 80 C202 76 242 96 238 132 C234 164 196 178 158 174 C124 170 102 176 92 156 Z" fill="#DC2626"/>'
  + '<path d="M106 150 C92 120 116 96 152 93 C194 90 224 104 221 130 C218 154 188 164 158 161 C132 158 114 166 106 150 Z" fill="#EF4444"/>'
  + '<path d="M128 120 q22 -10 44 0 q20 8 36 2" stroke="#FECACA" stroke-width="6" fill="none" stroke-linecap="round"/>'
  + '<path d="M136 140 q18 8 38 2" stroke="#FECACA" stroke-width="5" fill="none" stroke-linecap="round"/>');

/** Fish — Seafood. */
const IMG_SEAFOOD = art('#CFFAFE', '#A5F3FC',
  '<ellipse cx="148" cy="128" rx="64" ry="36" fill="#0EA5E9"/>'
  + '<path d="M206 128 l50 -30 -12 30 12 30 z" fill="#0369A1"/>'
  + '<path d="M138 92 q22 10 24 36 q-2 26 -24 36" fill="none" stroke="#7DD3FC" stroke-width="5"/>'
  + '<circle cx="112" cy="116" r="7" fill="#082F49"/>'
  + '<path d="M96 142 q14 10 28 4" stroke="#0369A1" stroke-width="5" fill="none" stroke-linecap="round"/>');

/** Orange-juice glass + orange slice — Beverages. */
const IMG_BEVERAGES = art('#FFEDD5', '#FED7AA',
  '<circle cx="216" cy="84" r="26" fill="#F97316"/>'
  + '<circle cx="216" cy="84" r="20" fill="#FDBA74"/>'
  + '<path d="M216 64 v40 M196 84 h40 M202 70 l28 28 M230 70 l-28 28" stroke="#F97316" stroke-width="3"/>'
  + '<rect x="148" y="40" width="8" height="56" rx="4" fill="#16A34A" transform="rotate(14 152 68)"/>'
  + '<path d="M120 78 h72 l-9 100 a11 11 0 0 1 -11 10 h-32 a11 11 0 0 1 -11 -10 z" fill="#FFF7ED" stroke="#FED7AA" stroke-width="5"/>'
  + '<path d="M126 100 h60 l-7 76 a8 8 0 0 1 -8 7 h-30 a8 8 0 0 1 -8 -7 z" fill="#FB923C"/>');

const sub = (id: string, name: string, image: string): CardItem => ({ id, name, image });

const HOME: CardItem[] = [
  { id: 'c_produce', name: 'Fresh Produce', image: IMG_PRODUCE, children: [
    sub('c_produce_fruit', 'Fruits', IMG_PRODUCE),
    sub('c_produce_veg', 'Vegetables', IMG_PRODUCE),
    sub('c_produce_organic', 'Organic', IMG_PRODUCE),
    sub('c_produce_herbs', 'Fresh Herbs', IMG_PRODUCE),
  ] },
  { id: 'c_bakery', name: 'Bakery', image: IMG_BAKERY, children: [
    sub('c_bakery_bread', 'Artisan Breads', IMG_BAKERY),
    sub('c_bakery_pastry', 'Pastries', IMG_BAKERY),
    sub('c_bakery_cakes', 'Cakes & Desserts', IMG_BAKERY),
  ] },
  { id: 'c_dairy', name: 'Dairy & Eggs', image: IMG_DAIRY, children: [
    sub('c_dairy_milk', 'Milk & Cream', IMG_DAIRY),
    sub('c_dairy_cheese', 'Cheese', IMG_DAIRY),
    sub('c_dairy_yogurt', 'Yogurt', IMG_DAIRY),
    sub('c_dairy_eggs', 'Eggs', IMG_DAIRY),
  ] },
  { id: 'c_butcher', name: 'Butcher', image: IMG_BUTCHER, children: [
    sub('c_butcher_beef', 'Beef', IMG_BUTCHER),
    sub('c_butcher_poultry', 'Poultry', IMG_BUTCHER),
    sub('c_butcher_pork', 'Pork', IMG_BUTCHER),
  ] },
  { id: 'c_seafood', name: 'Seafood', image: IMG_SEAFOOD, children: [
    sub('c_seafood_fish', 'Fresh Fish', IMG_SEAFOOD),
    sub('c_seafood_shell', 'Shellfish', IMG_SEAFOOD),
    sub('c_seafood_smoked', 'Smoked & Cured', IMG_SEAFOOD),
  ] },
  { id: 'c_beverages', name: 'Beverages', image: IMG_BEVERAGES, children: [
    sub('c_bev_juice', 'Fresh Juices', IMG_BEVERAGES),
    sub('c_bev_coffee', 'Coffee & Tea', IMG_BEVERAGES),
    sub('c_bev_sparkling', 'Sparkling Water', IMG_BEVERAGES),
  ] },
];

const PRODUCTS: ResultProduct[] = [
  { id: 'p_apples',     name: 'Honeycrisp Apples',         price: '$2.49 / lb',  image: IMG_PRODUCE,   aisle: 'Aisle 1',         shelf: 'Shelf A', mapX: 18, mapY: 32 },
  { id: 'p_bananas',    name: 'Organic Bananas',           price: '$0.69 / lb',  image: IMG_PRODUCE,   aisle: 'Aisle 1',         shelf: 'Shelf B', mapX: 22, mapY: 42 },
  { id: 'p_sourdough',  name: 'Sourdough Boule',           price: '$4.99',       image: IMG_BAKERY,    aisle: 'Bakery',          shelf: 'Rack 2',  mapX: 38, mapY: 22 },
  { id: 'p_croissant',  name: 'Butter Croissants · 4 pk',  price: '$5.49',       image: IMG_BAKERY,    aisle: 'Bakery',          shelf: 'Rack 1',  mapX: 41, mapY: 26 },
  { id: 'p_milk',       name: 'Whole Milk · 1 gal',        price: '$3.89',       image: IMG_DAIRY,     aisle: 'Aisle 4',         shelf: 'Shelf 1', mapX: 55, mapY: 60 },
  { id: 'p_eggs',       name: 'Free-Range Eggs · 12 ct',   price: '$4.29',       image: IMG_DAIRY,     aisle: 'Aisle 4',         shelf: 'Shelf 3', mapX: 58, mapY: 66 },
  { id: 'p_ribeye',     name: 'Ribeye Steak',              price: '$14.99 / lb', image: IMG_BUTCHER,   aisle: 'Butcher Counter', shelf: 'Case 2',  mapX: 75, mapY: 30 },
  { id: 'p_salmon',     name: 'Atlantic Salmon Fillet',    price: '$11.99 / lb', image: IMG_SEAFOOD,   aisle: 'Seafood Counter', shelf: 'Case 1',  mapX: 82, mapY: 44 },
  { id: 'p_oj',         name: 'Fresh Orange Juice · 52 oz', price: '$4.79',      image: IMG_BEVERAGES, aisle: 'Aisle 7',         shelf: 'Shelf 2', mapX: 68, mapY: 78 },
];

const SCREENSAVER: Screensaver = {
  mode: 'slideshow',
  media: [IMG_PRODUCE, IMG_BAKERY, IMG_SEAFOOD],
  secondsPerSlide: 6,
  transition: 'fade',
  loop: true,
  idleTimeoutSec: 60,
  ctaText: 'Touch to find today’s freshest picks',
};

/**
 * Build the seeded sample draft from the live `pre_fresh_market` theme so the
 * sample always carries the theme's current tokens (colors, layout, fonts…).
 */
export function freshMarketSampleDraft(theme: SavedTheme): ContentDraft {
  return {
    id: FRESH_MARKET_SAMPLE_ID,
    name: 'Fresh Market – Sample',
    themeId: theme.id,
    themeName: theme.name,
    themeTokens: theme.tokens,
    appMode: 'prototype',
    home: HOME,
    // Per-card drill-down lives in home[*].children (free-form children take
    // precedence in the builder); the flat list stays empty.
    intermediate: [],
    result: { products: PRODUCTS },
    screensaver: SCREENSAVER,
    header: { title: 'Fresh Market', caption: 'Today’s freshest picks' },
    status: 'draft',
    updatedAt: Date.now(),
  };
}
