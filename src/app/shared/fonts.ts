/** 6 bundled open-source fonts (self-hosted via Fontsource). `stack` is stored
 *  directly in ThemeTokens.typography.fontFamily and injected as --nt-font on the LCD. */
export interface FontOption { id: string; label: string; stack: string; }

export const FONTS: FontOption[] = [
  { id: 'jakarta', label: 'Plus Jakarta Sans', stack: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { id: 'inter', label: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  { id: 'nunito', label: 'Nunito', stack: "'Nunito', system-ui, sans-serif" },
  { id: 'bebas', label: 'Bebas Neue', stack: "'Bebas Neue', Impact, sans-serif" },
  { id: 'source', label: 'Source Sans 3', stack: "'Source Sans 3', system-ui, sans-serif" },
  { id: 'slab', label: 'Roboto Slab', stack: "'Roboto Slab', Georgia, serif" },
];

export const DEFAULT_FONT = FONTS[0].stack;
