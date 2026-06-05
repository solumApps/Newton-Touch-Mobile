/**
 * Newton Touch — shared layout.json contract.
 * The MOBILE app produces this; the LCD app renders it. Keep < 100 KB.
 * Single source of truth — import into both apps.
 */

export type AppMode = 'category' | 'prototype' | 'prototype-esl';
export type LogoPosition = 'left' | 'center' | 'right';

/** Arrangement only — the SHAPE/look of each card is set by CardStyle. */
export type HomeLayout =
  | 'grid-2x3' | 'grid-2x2' | 'col-4' | 'hero-list' | 'list' | 'fullscreen'
  /** image-strip: full-height image category strips, used by catalog/beauty entry pages. */
  | 'image-strip'
  /** hero-start: landing screen with one hero image/background and a start action. */
  | 'hero-start'
  /** promo-categories: large promotional copy/visual area plus category choices. */
  | 'promo-categories';

export type TextScale = 'compact' | 'normal' | 'large';
export type TextFit = 'shrink' | 'wrap' | 'clip';

/** LEGACY single-axis card style — kept only for migration of old saved themes. */
export type CardStyle =
  | 'image-text' | 'text-rect' | 'pill' | 'hexagon' | 'image-only'
  | 'circle' | 'icon-text' | 'color-block' | 'gradient' | 'list-row';

/** Card = independent Shape × Content × Text-position. */
export type CardShape = 'rect' | 'pill' | 'circle' | 'hexagon';
export type CardContent = 'image-text' | 'image-only' | 'text-only' | 'icon-text' | 'color-block' | 'gradient';
export type CardTextPos = 'overlay-top' | 'overlay-bottom' | 'below' | 'center';

export type IntermediateStyle =
  | 'accordion' | 'pill-tabs' | 'image-grid' | 'hex-grid'
  | 'circular' | 'scroll-list' | 'card-strip' | 'fullscreen'
  /** side-rail: persistent left rail/sidebar + large selectable cards/grid. */
  | 'side-rail'
  /** center-tiles: centered large tiles with explicit back/home navigation affordance. */
  | 'center-tiles'
  /** brand-grid: logo/product-brand tiles with optional alphabet-style footer. */
  | 'brand-grid'
  /** drill-stair: side-by-side columns showing every visited level at once,
   *  with the picked option per column highlighted. Right-most column reveals
   *  the result. Inspired by retail kiosk drill-down UIs (Staples-style). */
  | 'drill-stair';

export type ResultTemplate =
  | 'map-list' | 'cards-map' | 'dual-list' | 'split-panel' | 'list-only'
  | 'map-full' | 'card-grid' | 'minimal' | 'esl-focus'
  /** drill-stair: side-by-side breadcrumb columns showing the drill path that
   *  led to this product, with the product detail in the right-most column. */
  | 'drill-stair'
  /** filter-list: product list with top filter tabs (popular / alphabetical / custom).
   *  Designed for ETC apps that skip intermediate — the user goes Home → Result and
   *  can filter/sort products on the result page itself. */
  | 'filter-list'
  /** map-filter-list: map/floorplan beside filters and a ranked product list. */
  | 'map-filter-list'
  /** promo-list: promotional/QR/content panel plus product list and selected tags. */
  | 'promo-list'
  /** catalog-grid: side category image with product catalog grid/cards. */
  | 'catalog-grid'
  /** product-focus: one hero product with image, price, benefit copy, and find action. */
  | 'product-focus';

export type TransitionType = 'fade-slide' | 'scale-up' | 'slide-left' | 'shimmer' | 'none';
export type AnimSpeed = 'slow' | 'normal' | 'fast';
export type LoaderStyle = 'spinner' | 'dot-pulse' | 'progress' | 'logo' | 'skeleton';
export type ScreensaverMode = 'slideshow' | 'single-image' | 'video';
export type EslBlinkBy = 'article' | 'label';

/** Header composition. Selected in theme wizard; text fields filled in content-builder. */
export type HeaderStyle = 'logo+title+caption' | 'logo-only' | 'title+caption' | 'title-only';
export type CardSurface = 'flat' | 'glass' | 'raised' | 'outlined' | 'glow';
export type NavStyle = 'floating' | 'edge' | 'bottom-center' | 'hidden';

export interface ThemeTokens {
  headerColor: string;
  background: string;          // solid | css gradient string
  backgroundImage?: string;    // optional page background image/data URI
  cardBackground: string;
  cardText: string;
  accent: string;
  /** Background color behind text on cards — used for image-text overlays
   *  (top/bottom/center positions) AND shape-card text bubbles. Default
   *  'rgba(0,0,0,0.6)' — semi-transparent black. Themeable in the wizard. */
  overlayColor?: string;
  cardSurface?: CardSurface;
  navStyle?: NavStyle;
  logoPosition: LogoPosition;
  homeLayout: HomeLayout;
  /** @deprecated legacy single-axis style; superseded by cardShape/cardContent/cardTextPos. */
  cardStyle?: CardStyle;
  cardShape: CardShape;
  cardContent: CardContent;
  cardTextPos: CardTextPos;
  /** Show the top header/brand bar on the Home page. */
  showHeader: boolean;
  /** Header composition. Defaults to 'logo-only' for backward compat. */
  headerStyle?: HeaderStyle;
  /** When false, the LCD goes Home → Result directly (no intermediate page). */
  includeIntermediate: boolean;
  intermediateStyle: IntermediateStyle;
  resultTemplate: ResultTemplate;
  intermediate: { headerColor: string; background: string; backgroundImage?: string; cardBackground: string; cardText: string; accent: string; itemSize: 'small' | 'medium' | 'large'; showHeader: boolean; };
  result: { headerColor: string; background: string; backgroundImage?: string; cardBackground: string; cardText: string; accent: string; pathColor: string; pathStyle: 'dashed' | 'solid' | 'dotted' | 'animated'; showHeader: boolean; };
  animation: { transition: TransitionType; speed: AnimSpeed; applyToAll: boolean; };
  loader: { style: LoaderStyle; color: string; };
  /** Shared typography/appearance — applied consistently across ALL rendered pages. */
  typography: { fontFamily: string; textScale: TextScale; textFit: TextFit; baseTextColor: string; };
}

export interface CardItem {
  id: string;
  name: string;
  image?: string;              // data URI or relative asset path
  price?: string;
  unit?: string;
  articleId?: string;          // for ESL blink (Category / +ESL)
  children?: CardItem[];       // intermediate sub-items
}

export interface ResultProduct {
  id: string;
  name: string;
  price?: string;
  image?: string;
  aisle?: string;
  shelf?: string;
  articleId?: string;          // for ESL blink
  labelId?: string;
  /** Per-product map marker position (percentage 0–100 from the top-left).
   *  When set, the map template shows a dot at this location for the found product
   *  so routing varies per product instead of a single fixed marker. */
  mapX?: number;
  mapY?: number;
}

/** Which Category-API fields drive the hierarchy/mapping (chosen per-content). */
export type FieldSource = 'category' | 'etc';

export interface EslLink {
  productId: string;
  articleId?: string;
  labelId?: string;
}

export interface Screensaver {
  mode: ScreensaverMode;
  media: string[];             // image/video refs
  secondsPerSlide?: number;
  transition?: 'fade' | 'slide' | 'zoom';
  loop?: boolean;
  shuffle?: boolean;
  idleTimeoutSec: number;
  ctaText?: string;
}

export interface ResultContent {
  mapImage?: string;
  promoImage?: string;
  products: ResultProduct[];
}

export interface LayoutJson {
  schemaVersion: 1;
  contentName: string;
  appMode: AppMode;
  /** Category mode only: which API field set drove the hierarchy. */
  fieldSource?: FieldSource;
  theme: ThemeTokens;
  /** Per-deploy header content — fields shown depend on theme.headerStyle.
   *  Title defaults to contentName if empty; caption defaults to 'Welcome';
   *  logo defaults to the SOLUM logo if no custom image is uploaded. */
  header?: { title?: string; caption?: string; logo?: string; };
  home: CardItem[];
  intermediate: CardItem[];
  result: ResultContent;
  eslLinks?: EslLink[];        // present only for prototype-esl
  eslBlinkBy?: EslBlinkBy;
  screensaver: Screensaver;
  /** Optional manifest of every ntimg id the LCD should expect to have on disk
   *  after this deploy. Used by the receiver to log/verify completeness. */
  imageManifest?: string[];
}
