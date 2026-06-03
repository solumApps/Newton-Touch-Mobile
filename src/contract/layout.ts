/**
 * Newton Touch — shared layout.json contract.
 * The MOBILE app produces this; the LCD app renders it. Keep < 100 KB.
 * Single source of truth — import into both apps.
 */

export type AppMode = 'category' | 'prototype' | 'prototype-esl';
export type LogoPosition = 'left' | 'center' | 'right';

/** Arrangement only — the SHAPE/look of each card is set by CardStyle. */
export type HomeLayout =
  | 'grid-2x3' | 'grid-2x2' | 'col-4' | 'hero-list' | 'list' | 'fullscreen';

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
  | 'circular' | 'scroll-list' | 'card-strip' | 'fullscreen';

export type ResultTemplate =
  | 'map-list' | 'cards-map' | 'dual-list' | 'split-panel' | 'list-only'
  | 'map-full' | 'card-grid' | 'minimal' | 'esl-focus';

export type TransitionType = 'fade-slide' | 'scale-up' | 'slide-left' | 'shimmer' | 'none';
export type AnimSpeed = 'slow' | 'normal' | 'fast';
export type LoaderStyle = 'spinner' | 'dot-pulse' | 'progress' | 'logo' | 'skeleton';
export type ScreensaverMode = 'slideshow' | 'single-image' | 'video';
export type EslBlinkBy = 'article' | 'label';

/** Header composition. Selected in theme wizard; text fields filled in content-builder. */
export type HeaderStyle = 'logo+title+caption' | 'logo-only' | 'title+caption' | 'title-only';

export interface ThemeTokens {
  headerColor: string;
  background: string;          // solid | css gradient string
  cardBackground: string;
  cardText: string;
  accent: string;
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
  intermediate: { headerColor: string; background: string; cardBackground: string; cardText: string; accent: string; itemSize: 'small' | 'medium' | 'large'; showHeader: boolean; };
  result: { headerColor: string; background: string; cardBackground: string; cardText: string; accent: string; pathColor: string; pathStyle: 'dashed' | 'solid' | 'dotted' | 'animated'; showHeader: boolean; };
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

export interface LayoutJson {
  schemaVersion: 1;
  contentName: string;
  appMode: AppMode;
  /** Category mode only: which API field set drove the hierarchy. */
  fieldSource?: FieldSource;
  theme: ThemeTokens;
  /** Per-deploy header text — fields shown depend on theme.headerStyle. */
  header?: { title?: string; caption?: string; };
  home: CardItem[];
  intermediate: CardItem[];
  result: { mapImage?: string; products: ResultProduct[]; };
  eslLinks?: EslLink[];        // present only for prototype-esl
  eslBlinkBy?: EslBlinkBy;
  screensaver: Screensaver;
}
