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
