/**
 * Newton Touch — shared layout.json contract.
 * The MOBILE app produces this; the LCD app renders it. Keep < 100 KB.
 * Single source of truth — import into both apps.
 */

export type AppMode = 'category' | 'prototype' | 'prototype-esl' | 'media';

/** Media-only content: a single full-screen image or video. `fit` maps to CSS
 *  object-fit — fill (stretch), fit (contain, letterboxed), cover (crop). */
export interface MediaContent {
  type: 'image' | 'video';
  url: string;
  fit: 'fill' | 'fit' | 'cover';
}
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
  | 'bento'
  /** finder-select: Home arrangement using the finder progress rail + selection cards. */
  | 'finder-select';

export type CardSize = 'xs' | 'small' | 'normal' | 'large';
export type NavButtonPosition = 'bottom-left' | 'bottom-center' | 'bottom-right' | 'side-left' | 'side-right' | 'header-left' | 'header-right' | 'hidden';
export type SaverOverlayPosition = 'center' | 'bottom' | 'top' | 'bottom-left' | 'bottom-right';

export type TextScale = 'compact' | 'normal' | 'large';
/** Overflow scrolling direction override. 'auto' (default) = layout-appropriate:
 *  grids scroll vertically; rails/strips/pill-rows scroll horizontally. */
export type ScrollMode = 'auto' | 'vertical' | 'horizontal';
export type TextFit = 'shrink' | 'wrap' | 'clip';
/** Per-element text casing. 'default' (or absent) = no transform — current behaviour
 *  (individual layout variants may still apply their own decorative casing). */
export type TextCase = 'default' | 'uppercase' | 'lowercase' | 'capitalize';
/** Nav (Back/Home) button rendering mode. 'icon' (default) = round icon button —
 *  current behaviour; 'text' = pill-shaped label button; 'icon-text' = both. */
export type NavButtonMode = 'icon' | 'text' | 'icon-text';
/** Nav button size multiplier: small 0.8 / normal 1 (default) / large 1.25. */
export type NavButtonSize = 'small' | 'normal' | 'large';
/** Per-image fit inside its card/shape container. Undefined = 'cover'
 *  (legacy behaviour — layout CSS decides cover/contain per variant). */
export type ImageFit = 'cover' | 'contain' | 'fill';

/** LEGACY single-axis card style — kept only for migration of old saved themes. */
export type CardStyle =
  | 'image-text' | 'text-rect' | 'pill' | 'hexagon' | 'image-only'
  | 'circle' | 'icon-text' | 'color-block' | 'gradient' | 'list-row';

/** Card = independent Shape × Content × Text-position. */
export type CardShape = 'rect' | 'pill' | 'circle' | 'hexagon' | 'none';
export type CardContent = 'image-text' | 'image-only' | 'text-only' | 'icon-text' | 'color-block' | 'gradient';
export type CardTextPos = 'overlay-top' | 'overlay-bottom' | 'below' | 'center' | 'above';

export type IntermediateStyle =
  | 'accordion' | 'pill-tabs' | 'image-grid' | 'hex-grid'
  | 'circular' | 'scroll-list' | 'card-strip' | 'fullscreen' | 'columns'
  /** center-tiles: centered large tiles with explicit back/home navigation affordance. */
  | 'center-tiles'
  /** drill-stair: side-by-side columns showing every visited level at once,
   *  with the picked option per column highlighted. Right-most column reveals
   *  the result. Inspired by retail kiosk drill-down UIs (Staples-style). */
  | 'drill-stair'
  /** brand-rail: a centered horizontal row of round brand/logo tiles with a bold
   *  playful side headline + mascot space. Inspired by pet-food / FMCG kiosks. */
  | 'brand-rail'
  /** finder-select: dark left progress rail (title + Home + drill steps with
   *  check/dot state) beside big white selection cards, a "TOUCH YOUR …" prompt,
   *  a back arrow, and a bottom index strip (alphabet / value list). Mirrors the
   *  finder-detail result for the drill step. Inspired by the wiper-finder kiosk. */
  | 'finder-select';

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
  | 'drill-filter'
  /** shelf: retail product shelf — side category image panel + horizontally
   *  scrolling product cards (image, name, price, zone) with filter tabs.
   *  Inspired by cosmetics/hair-care kiosk result screens. */
  | 'shelf'
  /** promo-map-rank: store wayfinding — left floor map (floor selector + "you are
   *  here" pin + per-product dots) beside a dark promotion panel with optional
   *  countdown timer, two-level category nav (primary pills + secondary list) and
   *  a numbered/ranked product list with popular/alphabetical sort + zone. */
  | 'promo-map-rank'
  /** finder-detail: product finder — left hero with drill breadcrumb chips, a
   *  middle sortable product list (attribute grid + sale price), and a right
   *  detail panel with description, "Find All" + per-fitment "Find It" LED blink
   *  (Driver/Passenger style). Inspired by the windshield-wiper finder kiosk. */
  | 'finder-detail';

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
  /** Back-button icon: a NAV_ICONS key ('arrow'|'home'|'house'|'grid') OR a
   *  data-URI / ntimg:/idb: ref for a custom uploaded icon.
   *  Undefined = legacy glyph (←) — current behaviour. */
  backIcon?: string;
  /** Home-button icon — same semantics as backIcon. Undefined = legacy glyph (⌂). */
  homeIcon?: string;
  /** Size of BOTH buttons (CSS multiplier 0.8/1/1.25). Default 'normal'. */
  size?: NavButtonSize;
  /** Rendering mode. Default 'icon' = current round icon buttons. */
  mode?: NavButtonMode;
  backLabel?: string;          // text shown when mode != 'icon' — default 'Back'
  homeLabel?: string;          // text shown when mode != 'icon' — default 'Home'
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
  /** Vertical alignment of cards within the grid container. */
  cardVAlign?: 'top' | 'middle' | 'bottom';
  /** Spacing between cards. Overflowing content scrolls (rails horizontally, grids vertically). */
  cardGap?: 'tight' | 'normal' | 'loose';
  /** Fine-grained card-gap in px (slider). When set, overrides the bucket. Range 0–20. */
  cardGapNum?: number;
  /** @deprecated legacy single-axis style; superseded by cardShape/cardContent/cardTextPos. */
  cardStyle?: CardStyle;
  cardShape: CardShape;
  cardContent: CardContent;
  cardTextPos: CardTextPos;
  cardTextOverlay?: boolean;
  /** Optional fine-grained card-size multiplier (slider). When set it scales the
   *  card box continuously (via CSS zoom) on top of the cardSize bucket. Absent =
   *  use cardSize only. Range ~0.8–1.25. */
  cardSizeScale?: number;
  /** Optional horizontal alignment of card text, independent of cardTextPos
   *  (which controls the vertical placement). Absent = inherit/centre. */
  cardTextAlign?: 'left' | 'center' | 'right';
  /** Home background-image framing (B-4): pan X/Y (0–100%) + zoom (size %).
   *  All absent = the legacy center/cover behaviour. */
  bgImageX?: number; bgImageY?: number; bgImageZoom?: number;
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
  intermediate: { headerColor: string; background: string; backgroundImage?: string; bgImageX?: number; bgImageY?: number; bgImageZoom?: number; cardBackground: string; cardText: string; accent: string; itemSize: 'small' | 'medium' | 'large'; itemSizeScale?: number; showHeader: boolean; transparentHeader?: boolean; cardShape?: CardShape; align?: 'left' | 'center' | 'right'; textAlign?: 'left' | 'center' | 'right'; scrollMode?: ScrollMode; valign?: 'top' | 'middle' | 'bottom'; gap?: 'tight' | 'normal' | 'loose'; gapNum?: number; content?: CardContent; textPos?: CardTextPos; textOverlay?: boolean; brandRailMessagePos?: 'left' | 'right'; brandRailMessageAlign?: 'top' | 'center' | 'bottom';
    /** brand-rail: blur message container background + text colour. */
    brandRailMessageBgColor?: string; brandRailMessageTextColor?: string;
    /** finder-select template: dark hero rail + selection cards + index strip. */
    heroColor?: string; heroImage?: string; promptPrefix?: string; showPrompt?: boolean;
    showBack?: boolean; indexStrip?: 'auto' | 'alpha' | 'values' | 'off'; stepLabels?: string[]; columns?: number;
    /** finder-select top bar: back button + prompt toggles and positions. */
    fsShowBack?: boolean; fsBackPos?: 'left' | 'right' | 'center'; fsShowPrompt?: boolean; fsPromptPos?: 'left' | 'right' | 'center';
    /** finder-select fast-lookup index: alphabetic A–Z or numeric ranges. */
    indexMode?: 'alpha' | 'number'; indexNumberMin?: number; indexNumberMax?: number; indexNumberInterval?: number;
    /** finder-select fs-card appearance (independent of the brand-rail/columns card controls). */
    fsCardContent?: CardContent; fsCardShape?: CardShape; fsTextPos?: CardTextPos; fsTextAlign?: 'left' | 'center' | 'right'; };
  result: { headerColor: string; background: string; backgroundImage?: string; cardBackground: string; cardText: string; accent: string; pathColor: string; pathStyle: 'dashed' | 'solid' | 'dotted' | 'animated'; showHeader: boolean; transparentHeader?: boolean; content?: 'image-text' | 'text-only'; textPos?: CardTextPos; cardShape?: CardShape; popularText?: string;
    /** Position of the filter section in Map-Filter-List (G-2). Default 'top'. */
    filterPos?: 'top' | 'bottom' | 'left' | 'right';
    /** promo-map-rank: header countdown timer (mm:ss start) + alert bell. */
    showTimer?: boolean; timerSeconds?: number; showBell?: boolean;
    /** promo-map-rank: floor selector labels (top→bottom), e.g. ['3F','2F','1F']. */
    floors?: string[]; activeFloor?: string;
    /** promo-map-rank: ranked numbers on/off, sort tabs on/off, show zone. */
    showRanks?: boolean; showSortTabs?: boolean; showZone?: boolean;
    /** promo-map-rank: "you are here" pin label + colour, map dot colour. */
    youAreHereLabel?: string; pinColor?: string; dotColor?: string;
    /** promo-map-rank/finder: dark panel + secondary panel colours. */
    panelColor?: string; subPanelColor?: string; secondaryTextColor?: string;
    /** finder-detail: which sort tabs to show. */
    sortTabs?: ('recommend' | 'alpha' | 'low-price' | 'on-sale')[];
    /** finder-detail: SALE badge on/off; Find It / Find All button colour + labels. */
    showSaleBadge?: boolean; findColor?: string; findItLabel?: string; findAllLabel?: string;
    /** finder-detail: left hero background image + breadcrumb chip labels. */
    heroImage?: string; breadcrumbLabels?: string[];
    /** Neutral-surface overrides (default to light). promo-map-rank: map area +
     *  category rail; finder-detail: middle list bg + product/detail card bg/text. */
    mapBg?: string; railBg?: string; listBg?: string; cardBg?: string; cardTextColor?: string; };
  animation: { transition: TransitionType; speed: AnimSpeed; applyToAll: boolean; };
  loader: { style: LoaderStyle; color: string; };
  /** Shared typography/appearance — applied consistently across ALL rendered pages.
   *  cardTextScale/headerTextScale are OPTIONAL per-element multipliers layered on
   *  top of the global textScale (absent = inherit global behaviour, multiplier 1).
   *  cardTextCase/headerTextCase apply CSS text-transform ('default' = none). */
  typography: { fontFamily: string; textScale: TextScale; textFit: TextFit; baseTextColor: string;
    cardTextScale?: TextScale; headerTextScale?: TextScale;
    cardTextCase?: TextCase; headerTextCase?: TextCase;
    /** Optional fine-grained global text multiplier (slider). When set it
     *  overrides the textScale bucket; absent = use textScale. Range ~0.7–1.6. */
    textScaleNum?: number; };
  /** Screensaver overlay content styling (title, subtitle, position, colors). */
  saverOverlay?: SaverOverlay;
  /** Theme-level default for content screensaver mode. Media is content-specific. */
  screensaver?: { mode: ScreensaverMode };
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
  /** Category mode: this value came from the SOLUM API — its name is locked from
   *  free-text editing (only a case transform is allowed). `rawName` keeps the
   *  original API value so the case transform can be re-derived non-destructively. */
  fromApi?: boolean; rawName?: string;
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
  /** Category mode: name came from the SOLUM API — locked except case transform. */
  fromApi?: boolean; rawName?: string;
  /** Per-product map marker position (percentage 0–100 from the top-left).
   *  When set, the map template shows a dot at this location for the found product
   *  so routing varies per product instead of a single fixed marker. */
  mapX?: number;
  mapY?: number;
  /** Per-product marker color on the map. Falls back to the theme's path/accent color. */
  markerColor?: string;
  /** Shelf/aisle zone label (promo-map-rank ranked list, e.g. "Beverage"). */
  zone?: string;
  /** finder-detail: longer description shown in the right detail panel. */
  description?: string;
  /** finder-detail: sale price + flag (shows strikethrough original + SALE badge). */
  salePrice?: string;
  onSale?: boolean;
  saleDate?: string;
  /** finder-detail: flexible attribute grid (e.g. Color/Material/Type). */
  specs?: { label: string; value: string }[];
  /** finder-detail: per-fitment items, each its own LED-blink target (Find It). */
  fitments?: Fitment[];
}

/** finder-detail fitment row — one LED-blink target (e.g. Driver / Passenger side). */
export interface Fitment {
  label: string;          // e.g. "Driver Side"
  articleId?: string;     // ESL blink target (Find It)
  labelId?: string;       // when blinking by label
  name?: string;          // sub-title, e.g. "…WeatherBeater 26inch"
  price?: string;
  salePrice?: string;
  saleDate?: string;
  image?: string;
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
  /** Category mode: which product fields the result page should display. Absent =
   *  default (name + price + zone). Drives both the builder preview and the LCD. */
  fields?: ('name' | 'price' | 'zone' | 'articleId' | 'shelf')[];
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
  homeLayout: ['grid-2x3', 'grid-2x2', 'col-2', 'col-3', 'col-4', 'hero-list', 'list', 'fullscreen', 'image-strip', 'hero-start', 'promo-categories', 'h-scroll', 'bento', 'finder-select'],
  cardSize: ['xs', 'small', 'normal', 'large'],
  cardShape: ['rect', 'pill', 'circle', 'hexagon', 'none'],
  cardContent: ['image-text', 'image-only', 'text-only', 'icon-text', 'color-block', 'gradient'],
  cardTextPos: ['overlay-top', 'overlay-bottom', 'below', 'center', 'above'],
  cardSurface: ['flat', 'glass', 'raised', 'outlined', 'glow'],
  navStyle: ['floating', 'edge', 'bottom-center', 'hidden'],
  navButtonPosition: ['bottom-left', 'bottom-center', 'bottom-right', 'side-left', 'side-right', 'header-left', 'header-right', 'hidden'],
  navButtonSize: ['small', 'normal', 'large'],
  navButtonMode: ['icon', 'text', 'icon-text'],
  textCase: ['default', 'uppercase', 'lowercase', 'capitalize'],
  headerStyle: ['logo+title+caption', 'logo+title', 'logo-only', 'title+caption', 'title-only'],
  headerLayout: ['preset', 'custom'],
  headerItemPos: ['left', 'center', 'right', 'hidden'],
  align: ['left', 'center', 'right'],
  valign: ['top', 'middle', 'bottom'],
  gap: ['tight', 'normal', 'loose'],
  scrollMode: ['auto', 'vertical', 'horizontal'],
  intermediateStyle: ['accordion', 'pill-tabs', 'image-grid', 'hex-grid', 'circular', 'scroll-list', 'card-strip', 'fullscreen', 'columns', 'center-tiles', 'drill-stair', 'brand-rail', 'finder-select'],
  resultTemplate: ['map-list', 'cards-map', 'dual-list', 'split-panel', 'list-only', 'map-full', 'card-grid', 'minimal', 'esl-focus', 'drill-stair', 'filter-list', 'map-filter-list', 'promo-list', 'catalog-grid', 'product-focus', 'hero-product', 'drill-filter', 'shelf', 'promo-map-rank', 'finder-detail'],
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

/** Built-in nav-button icons — inline SVG markup (fill:currentColor so the
 *  themed icon color applies). Shared by the LCD pages AND the mobile preview
 *  strip / wizard so both render pixel-identically. Keys are the NavButtonStyle
 *  backIcon/homeIcon ids. */
export const NAV_ICONS: Record<string, string> = {
  arrow: '<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>',
  home: '<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor"/></svg>',
  house: '<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="currentColor"/></svg>',
  grid: '<svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z" fill="currentColor"/></svg>',
};

/** Classify a nav icon value: built-in NAV_ICONS key, custom image ref
 *  (data:/ntimg:/idb:/resolved file URL — anything with ':' or '/'), or none. */
export function navIconKind(v?: string): 'none' | 'builtin' | 'custom' {
  if (!v) return 'none';
  if (NAV_ICONS[v]) return 'builtin';
  if (v.indexOf(':') >= 0 || v.indexOf('/') >= 0) return 'custom';
  return 'none';
}

/** Coerce a nav icon token: keep built-in ids and custom refs, drop unknowns
 *  (undefined = legacy glyph rendering — never pass junk into the DOM). */
export function coerceNavIcon(v: unknown): string | undefined {
  return typeof v === 'string' && navIconKind(v) !== 'none' ? v : undefined;
}

/** Numeric multiplier for a TextScale (the --nt-text-scale convention). */
export function textScaleNum(s?: TextScale | string): number {
  return s === 'compact' ? 0.8 : s === 'large' ? 1.25 : 1;
}

/** CSS text-transform value for a TextCase ('default'/unknown → 'none'). */
export function textCaseCss(c?: TextCase | string): string {
  return c === 'uppercase' || c === 'lowercase' || c === 'capitalize' ? c : 'none';
}

/** Numeric multiplier for a NavButtonSize (the --nt-nav-btn-size convention). */
export function navBtnSizeNum(s?: NavButtonSize | string): number {
  return s === 'small' ? 0.8 : s === 'large' ? 1.25 : 1;
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
  /** Category mode: lets the LCD refresh article values from the SOLUM API at
   *  startup. Creds are embedded at deploy; `refresh` lists which fields to update
   *  (matched by articleId); `articleCase` mirrors the content-side text case. */
  liveApi?: { refresh?: ('name' | 'price')[]; articleCase?: 'asis' | 'upper' | 'lower' | 'camel' | 'capital'; };
  theme: ThemeTokens;
  /** Per-deploy header content — fields shown depend on theme.headerStyle.
   *  Title defaults to contentName if empty; caption defaults to 'Welcome';
   *  logo defaults to the SOLUM logo if no custom image is uploaded. */
  header?: { title?: string; caption?: string; logo?: string; };
  home: CardItem[];
  intermediate: CardItem[];
  result: ResultContent;
  /** How the Result page picks its content. 'common' (default when absent) =
   *  every path ends on the ONE shared `result` above — legacy behaviour.
   *  'per-item' = each HOME card owns its own full Result page in `itemResults`.
   *  Only meaningful for skip-intermediate themes (includeIntermediate=false,
   *  Home navigates straight to Result carrying the tapped card's id). */
  resultMode?: 'common' | 'per-item';
  /** Per-home-card Result pages, keyed by CardItem.id (resultMode 'per-item').
   *  A card with no entry here (or an entry with no products) falls back to the
   *  shared `result` content above, so a partial map never blanks the kiosk. */
  itemResults?: { [cardId: string]: ResultContent };
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
  /** Media mode only (appMode 'media'): the single image/video to play full-screen. */
  media?: MediaContent;
}
