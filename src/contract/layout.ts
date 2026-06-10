/**
 * Newton Touch — shared layout.json contract.
 * The MOBILE app produces this; the LCD app renders it. Keep < 100 KB.
 * Single source of truth — import into both apps.
 */

export type AppMode = 'category' | 'prototype' | 'prototype-esl';
export type LogoPosition = 'left' | 'center' | 'right';

/** Arrangement only — the SHAPE/look of each card is set by CardStyle. */
export type HomeLayout =
  | 'grid-2x3' | 'grid-2x2' | 'col-2' | 'col-3' | 'col-4' | 'hero-list' | 'list' | 'fullscreen'
  /** image-strip: full-height image category strips, used by catalog/beauty entry pages. */
  | 'image-strip'
  /** hero-start: landing screen with one hero image/background and a start action. */
  | 'hero-start'
  /** promo-categories: large promotional copy/visual area plus category choices. */
  | 'promo-categories'
  /** h-scroll: single horizontally-scrolling row of cards — great as a category rail. */
  | 'h-scroll'
  /** bento: asymmetric tile grid — one large hero tile plus smaller tiles. Modern, promo-friendly. */
  | 'bento';

export type CardSize = 'xs' | 'small' | 'normal' | 'large';
export type NavButtonPosition = 'bottom-left' | 'bottom-center' | 'bottom-right' | 'side-left' | 'side-right' | 'hidden';
export type SaverOverlayPosition = 'center' | 'bottom' | 'top' | 'bottom-left' | 'bottom-right';

export type TextScale = 'compact' | 'normal' | 'large';
/** Overflow scrolling direction override. 'auto' (default) = layout-appropriate:
 *  grids scroll vertically; rails/strips/pill-rows scroll horizontally. */
export type ScrollMode = 'auto' | 'vertical' | 'horizontal';
export type TextFit = 'shrink' | 'wrap' | 'clip';
/** Per-image fit inside its card/shape container. Undefined = 'cover'
 *  (legacy behaviour — layout CSS decides cover/contain per variant). */
export type ImageFit = 'cover' | 'contain' | 'fill';

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
  | 'drill-stair'
  /** brand-rail: a centered horizontal row of round brand/logo tiles with a bold
   *  playful side headline + mascot space. Inspired by pet-food / FMCG kiosks. */
  | 'brand-rail';

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
  | 'product-focus'
  /** hero-product: playful sales confirmation — benefit bullets, a centered hero
   *  product (image/price/find action) and a big celebratory side headline.
   *  Inspired by pet-food kiosk "Loved your pick!" result screens. */
  | 'hero-product'
  /** drill-filter: drill-path breadcrumb columns (like drill-stair) plus a tabbed
   *  (popular/alphabetical) numbered product list panel — map-less kiosks. */
  | 'drill-filter';

export type TransitionType = 'fade-slide' | 'scale-up' | 'slide-left' | 'shimmer' | 'none';
export type AnimSpeed = 'slow' | 'normal' | 'fast';
export type LoaderStyle = 'spinner' | 'dot-pulse' | 'progress' | 'logo' | 'skeleton';
export type ScreensaverMode = 'slideshow' | 'single-image' | 'video';
export type EslBlinkBy = 'article' | 'label';

/** Header composition. Selected in theme wizard; text fields filled in content-builder. */
export type HeaderStyle = 'logo+title+caption' | 'logo+title' | 'logo-only' | 'title+caption' | 'title-only';
/** Header layout mode: 'preset' = use HeaderStyle combos; 'custom' = position each element independently. */
export type HeaderLayoutMode = 'preset' | 'custom';
/** Independent position for a single header element (logo / title / caption). */
export type HeaderItemPos = 'left' | 'center' | 'right' | 'hidden';
export type CardSurface = 'flat' | 'glass' | 'raised' | 'outlined' | 'glow';
export type NavStyle = 'floating' | 'edge' | 'bottom-center' | 'hidden';

/** Shared nav-button appearance applied on Intermediate and Result pages. */
export interface NavButtonStyle {
  backColor?: string;          // icon/text color for the back (‹) button
  backBg?: string;             // background of the back button
  homeColor?: string;          // icon/text color for the home (⌂) button
  homeBg?: string;             // background of the home button
  position?: NavButtonPosition;        // grouped position (when split is false/undefined)
  /** When true, Back and Home are positioned INDEPENDENTLY (not a combined group). */
  split?: boolean;
  backPosition?: NavButtonPosition;    // used only when split === true
  homePosition?: NavButtonPosition;    // used only when split === true
}

/** Screensaver overlay content styling — controls the title/CTA block shown over media. */
export interface SaverOverlay {
  showContent: boolean;        // toggle entire overlay block
  title?: string;              // default 'Newton Touch'
  subtitle?: string;           // default 'Touch screen to begin'
  position?: SaverOverlayPosition;   // default 'center'
  textColor?: string;          // default '#FFFFFF'
  bgColor?: string;            // background of the overlay box — default transparent
}

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
  /** Nav button appearance (color, bg, position) for Intermediate and Result pages. */
  nav?: NavButtonStyle;
  logoPosition: LogoPosition;
  homeLayout: HomeLayout;
  /** Free column count (1–8) for grid/column home layouts. When set it overrides
   *  the column count implied by homeLayout (grid-template-columns:repeat(var(--cols),1fr)).
   *  Undefined = legacy behaviour, columns derived from the layout value. */
  columns?: number;
  /** Overflow scrolling override. Default 'auto' = direction appropriate to the layout
   *  (grids vertical, rails/strips horizontal). Applied on Home/Intermediate/Result. */
  scrollMode?: ScrollMode;
  /** Designed home-item capacity for featured/predefined themes. The content
   *  editor blocks adding home cards beyond this. Undefined = unlimited
   *  (user-created themes). */
  maxHomeItems?: number;
  /** Card size: affects the physical dimensions of category cards on the home page. */
  cardSize?: CardSize;
  /** Horizontal alignment of cards within their row (for layouts that don't fill the row). */
  cardAlign?: 'left' | 'center' | 'right';
  /** Spacing between cards. Overflowing content scrolls (rails horizontally, grids vertically). */
  cardGap?: 'tight' | 'normal' | 'loose';
  /** @deprecated legacy single-axis style; superseded by cardShape/cardContent/cardTextPos. */
  cardStyle?: CardStyle;
  cardShape: CardShape;
  cardContent: CardContent;
  cardTextPos: CardTextPos;
  /** Show the top header/brand bar on the Home page. */
  showHeader: boolean;
  /** Header composition. Defaults to 'logo-only' for backward compat. */
  headerStyle?: HeaderStyle;
  /** Header layout mode. 'preset' (default) uses headerStyle; 'custom' positions each
   *  element (logo/title/caption) independently via logoPos/titlePos/captionPos. */
  headerLayout?: HeaderLayoutMode;
  logoPos?: HeaderItemPos;
  titlePos?: HeaderItemPos;
  captionPos?: HeaderItemPos;
  /** When true the header background becomes transparent and the page background
   *  (solid or image) extends behind the header. Great with backgroundImage. */
  transparentHeader?: boolean;
  /** When false, the LCD goes Home → Result directly (no intermediate page). */
  includeIntermediate: boolean;
  intermediateStyle: IntermediateStyle;
  resultTemplate: ResultTemplate;
  intermediate: { headerColor: string; background: string; backgroundImage?: string; cardBackground: string; cardText: string; accent: string; itemSize: 'small' | 'medium' | 'large'; showHeader: boolean; transparentHeader?: boolean; cardShape?: CardShape; align?: 'left' | 'center' | 'right'; gap?: 'tight' | 'normal' | 'loose'; };
  result: { headerColor: string; background: string; backgroundImage?: string; cardBackground: string; cardText: string; accent: string; pathColor: string; pathStyle: 'dashed' | 'solid' | 'dotted' | 'animated'; showHeader: boolean; transparentHeader?: boolean; };
  animation: { transition: TransitionType; speed: AnimSpeed; applyToAll: boolean; };
  loader: { style: LoaderStyle; color: string; };
  /** Shared typography/appearance — applied consistently across ALL rendered pages. */
  typography: { fontFamily: string; textScale: TextScale; textFit: TextFit; baseTextColor: string; };
  /** Screensaver overlay content styling (title, subtitle, position, colors). */
  saverOverlay?: SaverOverlay;
}

export interface CardItem {
  id: string;
  name: string;
  image?: string;              // data URI or relative asset path
  /** How the image fills its card/shape. Undefined = 'cover' (current behaviour). */
  imageFit?: ImageFit;
  price?: string;
  unit?: string;
  articleId?: string;          // for ESL blink (Category / +ESL)
  children?: CardItem[];       // intermediate sub-items (recursive drill-down)
  /** Leaf-only: products/content surfaced on the Result page when THIS leaf is
   *  reached. Optional — when absent the LCD/preview fall back to the SHARED
   *  default Result content (LayoutJson.result.products), preserving the flat
   *  behaviour of existing layouts. */
  products?: ResultProduct[];
}

export interface ResultProduct {
  id: string;
  name: string;
  price?: string;
  image?: string;
  /** How the image fills its product tile/shape. Undefined = 'cover' (current behaviour). */
  imageFit?: ImageFit;
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
  /** Optional map annotation: draw the route LINE or a single DOT anywhere on
   *  the map (percent coords, 0–100), with an optional color override.
   *  kind 'none' hides both; absent = legacy default (line + product marker). */
  route?: { kind?: 'line' | 'dot' | 'none'; x?: number; y?: number; w?: number; color?: string };
}

/** Runtime enum value sets — kept in lockstep with the type unions above.
 *  Used by the mobile import/normalize path AND the LCD ingest path to coerce
 *  unknown enum values (from an older/newer app version, or a hand-edited
 *  file) to safe defaults instead of passing them through into CSS classes. */
export const THEME_ENUM_VALUES = {
  logoPosition: ['left', 'center', 'right'],
  homeLayout: ['grid-2x3', 'grid-2x2', 'col-2', 'col-3', 'col-4', 'hero-list', 'list', 'fullscreen', 'image-strip', 'hero-start', 'promo-categories', 'h-scroll', 'bento'],
  cardSize: ['xs', 'small', 'normal', 'large'],
  cardShape: ['rect', 'pill', 'circle', 'hexagon'],
  cardContent: ['image-text', 'image-only', 'text-only', 'icon-text', 'color-block', 'gradient'],
  cardTextPos: ['overlay-top', 'overlay-bottom', 'below', 'center'],
  cardSurface: ['flat', 'glass', 'raised', 'outlined', 'glow'],
  navStyle: ['floating', 'edge', 'bottom-center', 'hidden'],
  navButtonPosition: ['bottom-left', 'bottom-center', 'bottom-right', 'side-left', 'side-right', 'hidden'],
  headerStyle: ['logo+title+caption', 'logo+title', 'logo-only', 'title+caption', 'title-only'],
  headerLayout: ['preset', 'custom'],
  headerItemPos: ['left', 'center', 'right', 'hidden'],
  align: ['left', 'center', 'right'],
  gap: ['tight', 'normal', 'loose'],
  scrollMode: ['auto', 'vertical', 'horizontal'],
  intermediateStyle: ['accordion', 'pill-tabs', 'image-grid', 'hex-grid', 'circular', 'scroll-list', 'card-strip', 'fullscreen', 'side-rail', 'center-tiles', 'brand-grid', 'drill-stair', 'brand-rail'],
  resultTemplate: ['map-list', 'cards-map', 'dual-list', 'split-panel', 'list-only', 'map-full', 'card-grid', 'minimal', 'esl-focus', 'drill-stair', 'filter-list', 'map-filter-list', 'promo-list', 'catalog-grid', 'product-focus', 'hero-product', 'drill-filter'],
  itemSize: ['small', 'medium', 'large'],
  pathStyle: ['dashed', 'solid', 'dotted', 'animated'],
  transition: ['fade-slide', 'scale-up', 'slide-left', 'shimmer', 'none'],
  animSpeed: ['slow', 'normal', 'fast'],
  loaderStyle: ['spinner', 'dot-pulse', 'progress', 'logo', 'skeleton'],
  textScale: ['compact', 'normal', 'large'],
  textFit: ['shrink', 'wrap', 'clip'],
  imageFit: ['cover', 'contain', 'fill'],
  saverOverlayPosition: ['center', 'bottom', 'top', 'bottom-left', 'bottom-right'],
} as const;

/** Coerce a (possibly unknown) enum value to a member of `allowed`. Unknown
 *  non-empty values log a warning and fall back — never passed through. */
export function coerceEnum<T extends string>(v: unknown, allowed: readonly string[], fallback: T, field?: string): T {
  if (typeof v === 'string' && allowed.indexOf(v) >= 0) return v as T;
  if (v !== undefined && v !== null && v !== '' && field) {
    try { console.warn(`[nt-layout] Unknown ${field} value "${v}" — coerced to "${fallback}"`); } catch { /* no console */ }
  }
  return fallback;
}

/** CSS background-size for a per-item ImageFit. Returns null when unset/unknown
 *  so the layout's own default (cover, or contain for logo-style tiles) applies.
 *  Bind alongside background-repeat:no-repeat when a fit is set, so 'contain'
 *  never tiles inside a card. */
export function imageFitSize(fit?: ImageFit | string): string | null {
  switch (fit) {
    case 'cover': return 'cover';
    case 'contain': return 'contain';
    case 'fill': return '100% 100%';
    default: return null;
  }
}

export const MIN_COLUMNS = 1;
export const MAX_COLUMNS = 8;

/** Coerce theme.columns to an integer within [MIN_COLUMNS, MAX_COLUMNS], or
 *  undefined (= legacy behaviour: derive the count from homeLayout). */
export function coerceColumns(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : NaN;
  if (!isFinite(n)) return undefined;
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.round(n)));
}

/** Column count implied by a legacy layout value (used when theme.columns is unset). */
export function columnsForLayout(layout: HomeLayout): number {
  switch (layout) {
    case 'grid-2x2': return 2;
    case 'grid-2x3': return 3;
    case 'col-2': return 2;
    case 'col-3': return 3;
    case 'col-4': return 4;
    default: return 3;
  }
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
  /** Decoded byte size per ntimg id — lets the receiver verify each file on disk. */
  imageSizes?: Record<string, number>;
  /** Size-capped inline data-URI fallbacks per ntimg id. Used by the LCD renderer
   *  when an externalized image file is missing/unresolvable (lost transfer,
   *  browser-relay context, wiped cache) so every deploy still shows pictures. */
  imageFallbacks?: Record<string, string>;
}
