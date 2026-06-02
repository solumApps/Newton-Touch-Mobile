/**
 * Newton Touch — shared layout.json contract.
 * The MOBILE app produces this; the LCD app renders it. Keep < 100 KB.
 * Single source of truth — import into both apps.
 */

export type AppMode = 'category' | 'prototype' | 'prototype-esl';
export type LogoPosition = 'left' | 'center' | 'right';

export type HomeLayout =
  | 'grid-2x3' | 'hero-list' | 'grid-2x2' | 'col-4'
  | 'hexagonal' | 'circular' | 'pill-row' | 'fullscreen';

export type CardStyle =
  | 'image-text' | 'text-rect' | 'pill' | 'hexagon' | 'image-only'
  | 'circle' | 'icon-text' | 'color-block' | 'gradient' | 'list-row';

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

export interface ThemeTokens {
  headerColor: string;
  background: string;          // solid | css gradient string
  cardBackground: string;
  cardText: string;
  accent: string;
  logoPosition: LogoPosition;
  homeLayout: HomeLayout;
  cardStyle: CardStyle;
  /** When false, the LCD goes Home → Result directly (no intermediate page). */
  includeIntermediate: boolean;
  intermediateStyle: IntermediateStyle;
  resultTemplate: ResultTemplate;
  intermediate: { headerColor: string; background: string; cardBackground: string; cardText: string; accent: string; itemSize: 'small' | 'medium' | 'large'; };
  result: { headerColor: string; background: string; cardBackground: string; cardText: string; accent: string; pathColor: string; pathStyle: 'dashed' | 'solid' | 'dotted' | 'animated'; };
  animation: { transition: TransitionType; speed: AnimSpeed; applyToAll: boolean; };
  loader: { style: LoaderStyle; color: string; };
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
  home: CardItem[];
  intermediate: CardItem[];
  result: { mapImage?: string; products: ResultProduct[]; };
  eslLinks?: EslLink[];        // present only for prototype-esl
  eslBlinkBy?: EslBlinkBy;
  screensaver: Screensaver;
}
