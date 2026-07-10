/**
 * Built-in sample content.
 *
 * Bakery Glow is the current first-run demo. Artwork lives in app assets so the
 * stored draft stays light; deploy resolves those asset URLs to data URIs before
 * externalizing them into ntimg files for the LCD.
 */
import type { CardItem, ResultProduct, Screensaver } from '@contract/layout';
import type { SavedTheme } from './theme.service';
import type { ContentDraft } from './content.service';

export const FRESH_MARKET_SAMPLE_ID = 'cnt_sample_fresh_market';
export const BEAUTY_GLOW_SAMPLE_ID = 'cnt_sample_beauty_glow';
export const BAKERY_GLOW_SAMPLE_ID = 'cnt_sample_bakery_glow';
export const SUPERMARKET2_SAMPLE_ID = 'cnt_sample_supermarket2';
export const FURNITURE_SAMPLE_ID = 'cnt_sample_furniture';

const IMG_BREADS = 'assets/sample/bakery/artisan-breads.svg';
const IMG_CROISSANTS = 'assets/sample/bakery/croissants.svg';
const IMG_CAKES = 'assets/sample/bakery/signature-cakes.svg';
const IMG_COOKIES = 'assets/sample/bakery/cookies.svg';
const IMG_COFFEE = 'assets/sample/bakery/coffee-bar.svg';
const IMG_BREAKFAST = 'assets/sample/bakery/breakfast.svg';
const IMG_PROMO = 'assets/sample/bakery/promo-counter.svg';

const IMG_SOURDOUGH = 'assets/sample/bakery/sourdough.svg';
const IMG_BAGUETTE = 'assets/sample/bakery/baguette.svg';
const IMG_CINNAMON = 'assets/sample/bakery/cinnamon-roll.svg';
const IMG_MUFFIN = 'assets/sample/bakery/blueberry-muffin.svg';

const item = (id: string, name: string, image: string, products: ResultProduct[]): CardItem => ({ id, name, image, imageFit: 'cover', products });
const product = (id: string, name: string, price: string, image: string, zone: string, shelf: string, rank: number): ResultProduct => ({
  id, name, price, image, imageFit: 'contain', aisle: zone, zone, shelf, rank, articleId: `BK-${id.toUpperCase()}`,
});

const BREAD_PRODUCTS = [
  product('sourdough', 'Country Sourdough Loaf', '$6.50', IMG_SOURDOUGH, 'Artisan Bread Wall', 'Bread Rack A', 1),
  product('baguette', 'Classic French Baguette', '$3.20', IMG_BAGUETTE, 'Artisan Bread Wall', 'Bread Rack B', 2),
  product('multigrain', 'Seeded Multigrain Loaf', '$5.80', IMG_BREADS, 'Artisan Bread Wall', 'Bread Rack C', 3),
];
const CROISSANT_PRODUCTS = [
  product('buttercroissant', 'Butter Croissant 4 Pack', '$7.20', IMG_CROISSANTS, 'Viennoiserie Counter', 'Pastry Tray 1', 1),
  product('almondcroissant', 'Almond Croissant', '$4.80', IMG_CROISSANTS, 'Viennoiserie Counter', 'Pastry Tray 2', 2),
  product('painchoc', 'Pain au Chocolat', '$4.20', IMG_CROISSANTS, 'Viennoiserie Counter', 'Pastry Tray 3', 3),
];
const CAKE_PRODUCTS = [
  product('berrycake', 'Berry Vanilla Celebration Cake', '$28.00', IMG_CAKES, 'Celebration Cake Gallery', 'Cake Display 1', 1),
  product('chocolatecake', 'Belgian Chocolate Fudge Cake', '$32.00', IMG_CAKES, 'Celebration Cake Gallery', 'Cake Display 2', 2),
  product('cheesecake', 'New York Cheesecake Slice', '$5.90', IMG_CAKES, 'Celebration Cake Gallery', 'Cake Display 3', 3),
];
const COOKIE_PRODUCTS = [
  product('chipcookie', 'Chocolate Chip Cookie Box', '$8.50', IMG_COOKIES, 'Cookie Bar', 'Cookie Jar 1', 1),
  product('oatcookie', 'Oat Raisin Cookie Box', '$7.80', IMG_COOKIES, 'Cookie Bar', 'Cookie Jar 2', 2),
  product('macaron', 'Assorted Macarons 6 Pack', '$12.00', IMG_COOKIES, 'Cookie Bar', 'Gift Shelf', 3),
];
const COFFEE_PRODUCTS = [
  product('latte', 'Vanilla Oat Latte', '$4.60', IMG_COFFEE, 'Coffee Bar', 'Coffee Counter A', 1),
  product('coldbrew', 'Caramel Cold Brew', '$4.90', IMG_COFFEE, 'Coffee Bar', 'Coffee Counter B', 2),
  product('mocha', 'Dark Chocolate Mocha', '$5.10', IMG_COFFEE, 'Coffee Bar', 'Coffee Counter C', 3),
];
const BREAKFAST_PRODUCTS = [
  product('eggbox', 'Warm Egg Breakfast Box', '$9.90', IMG_BREAKFAST, 'Grab & Go Breakfast', 'Warm Shelf 1', 1),
  product('yogurt', 'Berry Granola Parfait', '$6.40', IMG_BREAKFAST, 'Grab & Go Breakfast', 'Chiller A', 2),
  product('sandwich', 'Croissant Breakfast Sandwich', '$8.80', IMG_BREAKFAST, 'Grab & Go Breakfast', 'Warm Shelf 2', 3),
];

const HOME: CardItem[] = [
  { id: 'bakery_breads', name: 'Artisan Breads', image: IMG_BREADS, imageFit: 'cover', children: [
    item('bakery_sourdough', 'Sourdough', IMG_SOURDOUGH, BREAD_PRODUCTS),
    item('bakery_baguettes', 'Baguettes', IMG_BAGUETTE, BREAD_PRODUCTS),
    item('bakery_multigrain', 'Multigrain', IMG_BREADS, BREAD_PRODUCTS),
  ] },
  { id: 'bakery_pastries', name: 'Pastries', image: IMG_CROISSANTS, imageFit: 'cover', children: [
    item('bakery_croissants', 'Croissants', IMG_CROISSANTS, CROISSANT_PRODUCTS),
    item('bakery_rolls', 'Cinnamon Rolls', IMG_CINNAMON, CROISSANT_PRODUCTS),
    item('bakery_muffins', 'Muffins', IMG_MUFFIN, CROISSANT_PRODUCTS),
  ] },
  { id: 'bakery_cakes', name: 'Cakes', image: IMG_CAKES, imageFit: 'cover', children: [
    item('bakery_whole_cakes', 'Whole Cakes', IMG_CAKES, CAKE_PRODUCTS),
    item('bakery_slices', 'Cake Slices', IMG_CAKES, CAKE_PRODUCTS),
    item('bakery_party', 'Party Desserts', IMG_CAKES, CAKE_PRODUCTS),
  ] },
  { id: 'bakery_cookies', name: 'Cookies', image: IMG_COOKIES, imageFit: 'cover', children: [
    item('bakery_cookie_boxes', 'Cookie Boxes', IMG_COOKIES, COOKIE_PRODUCTS),
    item('bakery_macarons', 'Macarons', IMG_COOKIES, COOKIE_PRODUCTS),
    item('bakery_gifts', 'Sweet Gifts', IMG_COOKIES, COOKIE_PRODUCTS),
  ] },
  { id: 'bakery_coffee', name: 'Coffee Bar', image: IMG_COFFEE, imageFit: 'cover', children: [
    item('bakery_hot_coffee', 'Hot Coffee', IMG_COFFEE, COFFEE_PRODUCTS),
    item('bakery_cold_coffee', 'Cold Coffee', IMG_COFFEE, COFFEE_PRODUCTS),
    item('bakery_pairings', 'Coffee Pairings', IMG_COFFEE, COFFEE_PRODUCTS),
  ] },
  { id: 'bakery_breakfast', name: 'Breakfast', image: IMG_BREAKFAST, imageFit: 'cover', children: [
    item('bakery_warm_breakfast', 'Warm Breakfast', IMG_BREAKFAST, BREAKFAST_PRODUCTS),
    item('bakery_grab_go', 'Grab & Go', IMG_BREAKFAST, BREAKFAST_PRODUCTS),
    item('bakery_parfaits', 'Parfaits', IMG_BREAKFAST, BREAKFAST_PRODUCTS),
  ] },
];

const ALL_PRODUCTS = [
  ...BREAD_PRODUCTS,
  ...CROISSANT_PRODUCTS,
  ...CAKE_PRODUCTS,
  ...COOKIE_PRODUCTS,
  ...COFFEE_PRODUCTS,
  ...BREAKFAST_PRODUCTS,
];

const SCREENSAVER: Screensaver = {
  mode: 'slideshow',
  media: [IMG_BREADS, IMG_CROISSANTS, IMG_CAKES, IMG_COFFEE],
  secondsPerSlide: 5,
  transition: 'fade',
  loop: true,
  idleTimeoutSec: 60,
  ctaText: 'Touch to find today’s fresh bakery picks',
};

export function bakeryGlowSampleDraft(theme: SavedTheme): ContentDraft {
  return {
    id: BAKERY_GLOW_SAMPLE_ID,
    name: 'Bakery Glow - Sample',
    themeId: theme.id,
    themeName: theme.name,
    themeTokens: theme.tokens,
    appMode: 'prototype',
    home: HOME,
    intermediate: [],
    result: { promoImage: IMG_PROMO, products: ALL_PRODUCTS, fields: ['name', 'price', 'zone', 'shelf'] },
    drillMode: 'individual',
    resultMode: 'individual',
    screensaver: SCREENSAVER,
    header: { title: 'Bakery Glow', caption: 'Fresh breads, pastries, cakes, and coffee' },
    status: 'complete',
    updatedAt: Date.now(),
  };
}

type LeafSpec = { id: string; name: string; image: string; zone: string; shelf: string; price: string };
type GroupSpec = { id: string; name: string; image: string; children: LeafSpec[] };

const SM_BASE = 'assets/dummy/supermarket2';
const SM_ICON = `${SM_BASE}/round-icons`;
const SM_HOME = `${SM_ICON}/home`;
const SM_INT = `${SM_ICON}/intermediate`;
const SM_RES = `${SM_ICON}/result`;
const SM_SAVER = [`${SM_BASE}/screensaver-1.png`, `${SM_BASE}/screensaver-2.png`, `${SM_BASE}/screensaver-3.png`];

const FUR_BASE = 'assets/dummy/furniture';
const FUR_ICON = `${FUR_BASE}/round-icons`;
const FUR_HOME = `${FUR_ICON}/home`;
const FUR_INT = `${FUR_ICON}/intermediate`;
const FUR_RES = `${FUR_ICON}/result`;
const FUR_SAVER = [`${FUR_BASE}/screensaver-1.png`, `${FUR_BASE}/screensaver-2.png`, `${FUR_BASE}/screensaver-3.png`];

const productForLeaf = (leaf: LeafSpec, rank = 1, image = leaf.image): ResultProduct => ({
  id: `${leaf.id}-pick`,
  name: leaf.name,
  price: leaf.price,
  image,
  imageFit: 'contain',
  aisle: leaf.zone,
  zone: leaf.zone,
  shelf: leaf.shelf,
  rank,
  articleId: leaf.id.toUpperCase(),
});

const relatedPrices = (price: string): [string, string] => {
  const n = Number((price || '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return ['$5.49', '$12.99'];
  const whole = n >= 100;
  const value = Math.max(1, n * 0.82);
  const premium = n * 1.22;
  return [
    `$${whole ? Math.round(value) : value.toFixed(2)}`,
    `$${whole ? Math.round(premium) : premium.toFixed(2)}`,
  ];
};

const buildGroup = (group: GroupSpec): CardItem => ({
  id: group.id,
  name: group.name,
  image: group.image,
  imageFit: 'contain',
  children: group.children.map((leaf) => ({
    id: leaf.id,
    name: leaf.name,
    image: leaf.image,
    imageFit: 'contain',
    products: [
      productForLeaf(leaf, 1),
      { ...productForLeaf(leaf, 2), id: `${leaf.id}-value`, name: `${leaf.name} Value Pick`, price: relatedPrices(leaf.price)[0] },
      { ...productForLeaf(leaf, 3), id: `${leaf.id}-premium`, name: `${leaf.name} Premium Pick`, price: relatedPrices(leaf.price)[1] },
    ],
  })),
});

const buildGroupWithResultIcons = (group: GroupSpec, resultBase: string): CardItem => ({
  id: group.id,
  name: group.name,
  image: group.image,
  imageFit: 'contain',
  children: group.children.map((leaf) => {
    const resultImage = buildResultIconPath(resultBase, group.id, leaf.id);
    const [valuePrice, premiumPrice] = relatedPrices(leaf.price);
    return {
      id: leaf.id,
      name: leaf.name,
      image: leaf.image,
      imageFit: 'contain',
      products: [
        productForLeaf(leaf, 1, resultImage),
        { ...productForLeaf(leaf, 2, resultImage), id: `${leaf.id}-value`, name: `${leaf.name} Value Pick`, price: valuePrice },
        { ...productForLeaf(leaf, 3, resultImage), id: `${leaf.id}-premium`, name: `${leaf.name} Premium Pick`, price: premiumPrice },
      ],
    };
  }),
});

const supermarketGroups: GroupSpec[] = [
  { id: 'bakery', name: 'Bakery', image: `${SM_HOME}/home-bakery.png`, children: [
    { id: 'bread', name: 'Bread', image: `${SM_INT}/bakery/bread.png`, zone: 'Bakery Wall', shelf: 'Rack A', price: '$4.50' },
    { id: 'croissants', name: 'Croissants', image: `${SM_INT}/bakery/croissants.png`, zone: 'Pastry Case', shelf: 'Tray 2', price: '$6.99' },
    { id: 'cakes', name: 'Cakes', image: `${SM_INT}/bakery/cakes.png`, zone: 'Cake Display', shelf: 'Case B', price: '$24.99' },
    { id: 'cookies', name: 'Cookies', image: `${SM_INT}/bakery/cookies.png`, zone: 'Cookie Bar', shelf: 'Jar 4', price: '$7.99' },
    { id: 'pastries', name: 'Pastries', image: `${SM_INT}/bakery/pastries.png`, zone: 'Pastry Case', shelf: 'Tray 1', price: '$5.99' },
  ] },
  { id: 'dairy', name: 'Dairy', image: `${SM_HOME}/home-dairy.png`, children: [
    { id: 'milk', name: 'Milk', image: `${SM_INT}/dairy/milk.png`, zone: 'Dairy Cooler', shelf: 'Door 1', price: '$3.49' },
    { id: 'cheese', name: 'Cheese', image: `${SM_INT}/dairy/cheese.png`, zone: 'Cheese Island', shelf: 'Bin 3', price: '$5.99' },
    { id: 'yogurt', name: 'Yogurt', image: `${SM_INT}/dairy/yogurt.png`, zone: 'Dairy Cooler', shelf: 'Door 4', price: '$1.99' },
    { id: 'butter', name: 'Butter', image: `${SM_INT}/dairy/butter.png`, zone: 'Dairy Cooler', shelf: 'Door 2', price: '$4.29' },
    { id: 'cream', name: 'Cream', image: `${SM_INT}/dairy/cream.png`, zone: 'Dairy Cooler', shelf: 'Door 3', price: '$3.79' },
  ] },
  { id: 'produce', name: 'Produce', image: `${SM_HOME}/home-produce.png`, children: [
    { id: 'fruits', name: 'Fruits', image: `${SM_INT}/produce/fruits.png`, zone: 'Fresh Produce', shelf: 'Table 1', price: '$2.99' },
    { id: 'vegetables', name: 'Vegetables', image: `${SM_INT}/produce/vegetables.png`, zone: 'Fresh Produce', shelf: 'Table 3', price: '$2.49' },
    { id: 'herbs', name: 'Herbs', image: `${SM_INT}/produce/herbs.png`, zone: 'Produce Cooler', shelf: 'Rack H', price: '$1.99' },
    { id: 'salads', name: 'Salads', image: `${SM_INT}/produce/salads.png`, zone: 'Prepared Produce', shelf: 'Case S', price: '$4.99' },
    { id: 'organic', name: 'Organic', image: `${SM_INT}/produce/organic.png`, zone: 'Organic Bay', shelf: 'Table O', price: '$3.99' },
  ] },
  { id: 'meat', name: 'Meat', image: `${SM_HOME}/home-meat.png`, children: [
    { id: 'chicken', name: 'Chicken', image: `${SM_INT}/meat/chicken.png`, zone: 'Meat Counter', shelf: 'Case 1', price: '$7.99' },
    { id: 'beef', name: 'Beef', image: `${SM_INT}/meat/beef.png`, zone: 'Meat Counter', shelf: 'Case 2', price: '$12.99' },
    { id: 'lamb', name: 'Lamb', image: `${SM_INT}/meat/lamb.png`, zone: 'Meat Counter', shelf: 'Case 3', price: '$15.99' },
    { id: 'sausage', name: 'Sausage', image: `${SM_INT}/meat/sausage.png`, zone: 'Meat Cooler', shelf: 'Rack 4', price: '$6.49' },
    { id: 'marinated', name: 'Marinated', image: `${SM_INT}/meat/marinated.png`, zone: 'Ready To Cook', shelf: 'Case M', price: '$9.99' },
  ] },
  { id: 'frozen', name: 'Frozen', image: `${SM_HOME}/home-frozen.png`, children: [
    { id: 'ice-cream', name: 'Ice Cream', image: `${SM_INT}/frozen/ice-cream.png`, zone: 'Frozen Aisle', shelf: 'Door 8', price: '$5.99' },
    { id: 'frozen-veg', name: 'Frozen Veg', image: `${SM_INT}/frozen/frozen-veg.png`, zone: 'Frozen Aisle', shelf: 'Door 4', price: '$3.49' },
    { id: 'nuggets', name: 'Nuggets', image: `${SM_INT}/frozen/nuggets.png`, zone: 'Frozen Aisle', shelf: 'Door 6', price: '$8.99' },
    { id: 'fries', name: 'Fries', image: `${SM_INT}/frozen/fries.png`, zone: 'Frozen Aisle', shelf: 'Door 5', price: '$4.49' },
    { id: 'popsicles', name: 'Popsicles', image: `${SM_INT}/frozen/popsicles.png`, zone: 'Frozen Aisle', shelf: 'Door 9', price: '$4.99' },
  ] },
];

const furnitureGroups: GroupSpec[] = [
  { id: 'living', name: 'Living Room', image: `${FUR_HOME}/home-living.png`, children: [
    { id: 'sofas', name: 'Sofas', image: `${FUR_INT}/living/sofas.png`, zone: 'Living Gallery', shelf: 'Bay L1', price: '$899' },
    { id: 'recliners', name: 'Recliners', image: `${FUR_INT}/living/recliners.png`, zone: 'Comfort Studio', shelf: 'Bay L2', price: '$649' },
    { id: 'coffee-tables', name: 'Coffee Tables', image: `${FUR_INT}/living/coffee-tables.png`, zone: 'Living Gallery', shelf: 'Bay L4', price: '$249' },
    { id: 'tv-units', name: 'TV Units', image: `${FUR_INT}/living/tv-units.png`, zone: 'Media Wall', shelf: 'Bay L5', price: '$399' },
    { id: 'accent-chairs', name: 'Accent Chairs', image: `${FUR_INT}/living/accent-chairs.png`, zone: 'Accent Corner', shelf: 'Bay L6', price: '$299' },
  ] },
  { id: 'bedroom', name: 'Bedroom', image: `${FUR_HOME}/home-bedroom.png`, children: [
    { id: 'beds', name: 'Beds', image: `${FUR_INT}/bedroom/beds.png`, zone: 'Bedroom Studio', shelf: 'Bay B1', price: '$799' },
    { id: 'wardrobes', name: 'Wardrobes', image: `${FUR_INT}/bedroom/wardrobes.png`, zone: 'Storage Wall', shelf: 'Bay B2', price: '$999' },
    { id: 'mattresses', name: 'Mattresses', image: `${FUR_INT}/bedroom/mattresses.png`, zone: 'Sleep Lab', shelf: 'Bay B3', price: '$599' },
    { id: 'dressers', name: 'Dressers', image: `${FUR_INT}/bedroom/dressers.png`, zone: 'Bedroom Studio', shelf: 'Bay B4', price: '$449' },
    { id: 'nightstands', name: 'Nightstands', image: `${FUR_INT}/bedroom/nightstands.png`, zone: 'Bedroom Studio', shelf: 'Bay B5', price: '$149' },
  ] },
  { id: 'dining', name: 'Dining', image: `${FUR_HOME}/home-dining.png`, children: [
    { id: 'dining-tables', name: 'Dining Tables', image: `${FUR_INT}/dining/dining-tables.png`, zone: 'Dining Studio', shelf: 'Bay D1', price: '$699' },
    { id: 'chairs', name: 'Chairs', image: `${FUR_INT}/dining/chairs.png`, zone: 'Dining Studio', shelf: 'Bay D2', price: '$129' },
    { id: 'bar-stools', name: 'Bar Stools', image: `${FUR_INT}/dining/bar-stools.png`, zone: 'Kitchen Bar', shelf: 'Bay D3', price: '$179' },
    { id: 'sideboards', name: 'Sideboards', image: `${FUR_INT}/dining/sideboards.png`, zone: 'Dining Studio', shelf: 'Bay D4', price: '$549' },
    { id: 'benches', name: 'Benches', image: `${FUR_INT}/dining/benches.png`, zone: 'Dining Studio', shelf: 'Bay D5', price: '$239' },
  ] },
  { id: 'office', name: 'Home Office', image: `${FUR_HOME}/home-office.png`, children: [
    { id: 'desks', name: 'Desks', image: `${FUR_INT}/office/desks.png`, zone: 'Work Studio', shelf: 'Bay O1', price: '$349' },
    { id: 'office-chairs', name: 'Office Chairs', image: `${FUR_INT}/office/office-chairs.png`, zone: 'Work Studio', shelf: 'Bay O2', price: '$229' },
    { id: 'bookcases', name: 'Bookcases', image: `${FUR_INT}/office/bookcases.png`, zone: 'Storage Wall', shelf: 'Bay O3', price: '$299' },
    { id: 'cabinets', name: 'Cabinets', image: `${FUR_INT}/office/cabinets.png`, zone: 'Work Studio', shelf: 'Bay O4', price: '$319' },
    { id: 'lamps', name: 'Lamps', image: `${FUR_INT}/office/lamps.png`, zone: 'Lighting Bar', shelf: 'Bay O5', price: '$89' },
  ] },
  { id: 'decor', name: 'Decor', image: `${FUR_HOME}/home-decor.png`, children: [
    { id: 'rugs', name: 'Rugs', image: `${FUR_INT}/decor/rugs.png`, zone: 'Decor Studio', shelf: 'Bay X1', price: '$199' },
    { id: 'mirrors', name: 'Mirrors', image: `${FUR_INT}/decor/mirrors.png`, zone: 'Wall Decor', shelf: 'Bay X2', price: '$159' },
    { id: 'wall-art', name: 'Wall Art', image: `${FUR_INT}/decor/wall-art.png`, zone: 'Wall Decor', shelf: 'Bay X3', price: '$99' },
    { id: 'plants', name: 'Plants', image: `${FUR_INT}/decor/plants.png`, zone: 'Green Corner', shelf: 'Bay X4', price: '$49' },
    { id: 'cushions', name: 'Cushions', image: `${FUR_INT}/decor/cushions.png`, zone: 'Soft Decor', shelf: 'Bay X5', price: '$39' },
  ] },
];

function buildResultIconPath(base: string, groupId: string, leafId: string): string {
  return `${base}/round-icons/result/${groupId}/${leafId}-result.png`;
}

export function supermarket2SampleDraft(theme: SavedTheme): ContentDraft {
  const home = supermarketGroups.map((g) => buildGroupWithResultIcons(g, SM_BASE));
  const products = home.flatMap((h) => h.children?.flatMap((c) => c.products || []) || []);
  return {
    id: SUPERMARKET2_SAMPLE_ID,
    name: 'Supermarket2 - Sample',
    themeId: theme.id,
    themeName: theme.name,
    themeTokens: theme.tokens,
    appMode: 'prototype',
    home,
    intermediate: [],
    result: { promoImage: `${SM_BASE}/background.jpg`, products, fields: ['name', 'price', 'zone', 'shelf'] },
    drillMode: 'individual',
    resultMode: 'individual',
    screensaver: { mode: 'slideshow', media: SM_SAVER, secondsPerSlide: 5, transition: 'zoom', loop: true, idleTimeoutSec: 45, ctaText: 'Touch to find fresh picks' },
    header: { title: 'Veges', caption: 'Fresh grocery finder' },
    status: 'complete',
    updatedAt: Date.now(),
  };
}

export function furnitureSampleDraft(theme: SavedTheme): ContentDraft {
  const home = furnitureGroups.map((g) => buildGroupWithResultIcons(g, FUR_BASE));
  const products = home.flatMap((h) => h.children?.flatMap((c) => c.products || []) || []);
  return {
    id: FURNITURE_SAMPLE_ID,
    name: 'Furniture - Sample',
    themeId: theme.id,
    themeName: theme.name,
    themeTokens: theme.tokens,
    appMode: 'prototype',
    home,
    intermediate: [],
    result: { promoImage: `${FUR_BASE}/background.jpg`, products, fields: ['name', 'price', 'zone', 'shelf'] },
    drillMode: 'individual',
    resultMode: 'individual',
    screensaver: { mode: 'slideshow', media: FUR_SAVER, secondsPerSlide: 5, transition: 'slide', loop: true, idleTimeoutSec: 45, ctaText: 'Touch to choose your style' },
    header: { title: 'Furniture', caption: 'Room-by-room product finder' },
    status: 'complete',
    updatedAt: Date.now(),
  };
}
