# UI Redesign — Completeness Inventory

This is the completeness guarantee for the "Editor Deck" redesign (see `UI-REDESIGN-PROMPT.md`).
Every control that exists TODAY in the three source files is listed below as a checkbox row:
`Step → Category/section → Option label → control type → bound property/method`.
As each control is migrated into the new deck (Level-3 editor) AND the All-settings sheet, check its box
and note the new location. A row left unchecked at the end of the project is a FAILURE per the spec.

Source files inventoried (full read, all lines):
- `src/app/themes/theme-wizard.component.html` (1198 lines) + `.ts` (1704 lines, cross-referenced)
- `src/app/content/content-builder.component.html` (778 lines) + `.ts` (1829 lines, cross-referenced)
- `src/app/content/card-tree-editor.component.ts` (127 lines, inline template)

## Totals

- **Theme wizard: 172 controls across 10 steps** (of which 55 are `app-color-picker` instances, 24 are sliders,
  the rest are tile-groups/segments/steppers/text-inputs/buttons/toggles). Counting each `app-color-picker`
  instance individually (not each swatch) — 55, not ~94, because several color pickers are reused/shared
  across conditions rather than duplicated; see "Structural notes" below for why the prompt's ~94 estimate
  does not match a literal instance count.
- **Content builder: 89 controls + 6 unbounded repeating-item templates** (Home cards, Intermediate items/tree
  nodes, Result products, Fitments, Specs, Screensaver media) across 5 step bodies (Home, Intermediate,
  Result, Screensaver, Review) plus mode-specific sub-sections (Category API, Prototype leveled, Finder-select,
  Brand-rail, Promo-map-rank, Finder-detail).
- **card-tree-editor: 8 controls (recursive, unbounded depth) + 1 nested repeating-item template** (per-leaf
  result products).
- **Total: 172 + 89 + 8 = 269 discrete named controls, plus 7 unbounded repeating-list-item templates
  (each template itself contains 3–12 sub-fields, see the repeating-item rows).**

## Structural notes / surprises (read before migrating)

1. **"Navigation buttons" block is NOT two independent ~15-control instances.** The prompt's note says to keep
   Intermediate-colors and Result-colors nav blocks bound to "existing separate state." In the actual code,
   **11 of the ~15 controls (icon colors, backgrounds, button style, labels, size, icons, nav-bar style) are
   bound to the SAME single `t.nav` object in both steps** — editing "Back icon color" on Intermediate-colors
   changes the exact same value shown on Result-colors. Only **4 controls (Button layout/split, Button
   position, Back position, Home position) are genuinely per-page-independent**, via `navSplitFor(page)` /
   `navPositionFor(page)` / `navBackPositionFor(page)` / `navHomePositionFor(page)` methods that read
   `t.intermediate.navSplit/navPosition/navBackPosition/navHomePosition` vs `t.result.navSplit/navPosition/
   navBackPosition/navHomePosition` (falling back to shared `t.nav` values only as defaults). See the full
   breakdown in the "Navigation buttons — shared vs independent state" section below. **This changes the
   migration plan**: sharing a template component for the color/style/label/size/icon rows is not just
   allowed, it must reflect that they are the same state — showing two "independently editable" pill rows
   that silently write to the same field would be misleading; the deck should make clear these are shared.
2. **`hideVerticalScroll = true` is a hard-coded kill-switch** (`theme-wizard.component.ts` line 358) that
   hides 2 controls entirely from the current UI: Home step's conditional vertical option (folded into
   "Overflow scrolling" — vertical filtered out) and Intermediate design's "Carousel scrolling" toggle
   (`t.intermediateStyle==='fullscreen' && !hideVerticalScroll`) and the plain "Overflow scrolling" toggle
   inside Intermediate design (`intScrollMatters && !hideVerticalScroll`). These are real bound controls in
   the template (not dead code) but are permanently unreachable while the flag is `true`. Listed below and
   flagged **[HIDDEN — do not surface in new UI unless flag flips]**.
3. **`resultTemplate` has a legacy value with full color controls but no picker tile.** `t.resultTemplate ===
   'promo-map-rank'` drives ~7 color pickers and several toggles on Result template/colors steps, and
   `pickResultTemplate()` handles it (`applyPromoMapRankDefaults()`), but `resultTemplates` (the array that
   feeds the visible tile row) only lists 6 ids (`map-list, filter-list, promo-list, product-focus, shelf,
   finder-detail`) — `promo-map-rank` is NOT one of the selectable tiles. It is only reachable on themes that
   already have it saved (legacy import). Its color controls must still be included in the All-settings sheet
   for any theme that has this value, but the deck's template-picker level should not offer it as a new choice.
4. **Two different sliders across two steps write to what looks like the same "Card gap" label but different
   properties depending on context** — Home step's Card gap (`setCardGap`) vs Intermediate design's Card gap
   (`setIntCardGap`) are separate methods/state (`t.cardGapNum` vs `t.intermediate.cardGapNum`), which is
   correct and expected — flagging only so the deck doesn't accidentally merge them.
5. **"Overlay opacity" slider is shared between Home and Intermediate steps** — both call
   `setOverlayOpacity(v)` / read `overlayOpacity`, which is a single un-namespaced getter/setter on the
   component (not `t.overlayOpacity` vs `t.intermediate.overlayOpacity`). Verify against `.ts` before
   migrating — this may be an existing bug/simplification in the app, not something to "fix" in this UI-only
   pass, but the deck must preserve the existing (shared) behavior exactly.
6. **content-builder's Intermediate step is one template (`stepCase === 'inter'`) reused for up to 4 different
   step instances** (`inter`, `inter1`, `inter2`, `inter3`) depending on `appMode` (category / prototype
   leveled) — the same control rows repeat per level with level-scoped bound properties (`activeL0/L1/L2`,
   `protoL0Id/L1Id/L2Id`, etc). Counted once per distinct control pattern below, with a note on the leveled
   repetition — do not literally quadruple the inventory, but the deck must handle level-scoping via its own
   active-level context exactly as today.
7. **Home step's "Intermediate page" Include/Skip toggle** (`t.includeIntermediate`) lives at the bottom of
   the Home *design* step in theme-wizard, not on the Intermediate step itself — easy to miss when converting
   Intermediate design/colors steps in isolation.
8. Several color pickers use `[allowReset]="true"` with a `(reset)` handler (`resetNavColor(...)`) — this is
   a *third* interaction mode beyond pick/clear that the `nt-*` deck wrapper around `app-color-picker` must
   preserve (not just value + swatch).
9. `card-tree-editor` is genuinely recursive/unbounded (renders itself for each child), which the collapsed-
   row pattern must handle via per-row expansion, not a fixed list.

---

## PART 1 — Theme wizard (`theme-wizard.component.html` / `.ts`)

### Step 1 — Home (`home`, step-title "Home design")

**Migrated to the Editor Deck pattern (phase 3b) — chips: Arrangement / Card style / Card content & text /
Header. Arrangement and Card style / Card content & text each contain TWO mutually-exclusive branches (the
Finder-select arrangement's own fs*-prefixed controls vs the generic Card size/gap/alignment + Card
content/shape/text controls) exactly as the original template's `*ngIf="t.homeLayout==='finder-select'"` /
`*ngIf="!isHeroStart && t.homeLayout!=='finder-select'"` guards — only one branch's options ever populate the
category at once, driven by `homeArrangementOptions` / `homeCardStyleOptions` / `homeCardTextOptions` getters
that mirror every original conditional 1:1. "Card surface" and "Card gap" are literally the same bound
property (`t.cardSurface`, `t.cardGapNum` via `setCardGap()`) in both the Finder-select and generic branches,
so they collapse to ONE pill each (both original rows point at the same deck location below). All 30 rows also
appear (grouped identically) in the `nt-settings-sheet` opened via the step's "All settings" button, with their
live current value — selecting a sheet row jumps the deck to that chip + pill.**

- [x] Arrangement → tile-group (6 states: Columns/Fullscreen/Image strips/Promo categories/Bento grid/Finder select) → `t.homeLayout` via `pickLayout(o)` — deck: Home ▸ Arrangement chip ▸ "Arrangement" pill
- [x] Overflow scrolling → segment (2 states: Horizontal/Vertical, vertical currently filtered — see note 2) → `t.scrollMode` via `setHomeScroll(m.id)`, read `effectiveScrollMode` — deck: Home ▸ Arrangement chip ▸ "Overflow scrolling" pill
- [x] Columns / Items → number-stepper (−/number-input/+; label switches "Items"/"Columns") → `t.columns` via `stepColumns(delta)` / `setColumns(v)`, read `effectiveColumns` — deck: Home ▸ Arrangement chip ▸ "Items"/"Columns" pill
- [x] Finder Select · Title visibility → segment (Show title/Hide title) → `t.intermediate.fsShowPrompt` — deck: Home ▸ Arrangement chip ▸ "Title visibility" pill
- [x] Finder Select · Title alignment → segment (3 states: left/center/right) → `t.intermediate.fsPromptPos` — deck: Home ▸ Arrangement chip ▸ "Title alignment" pill
- [x] Finder Select · Card content → segment (`fsCardContents` options) → `t.intermediate.fsCardContent` via `pickFsContent(c.id)` — deck: Home ▸ Card style chip ▸ "Card content" pill
- [x] Finder Select · Card shape → tile-group (`cardShapes`, conditional) → `t.intermediate.fsCardShape` via `setFsCardShape(s.id)` — deck: Home ▸ Card style chip ▸ "Card shape" pill
- [x] Finder Select · Card surface → segment (`cardSurfaces`, 5 states) → `t.cardSurface` — deck: Home ▸ Card style chip ▸ "Card surface" pill (same pill as the generic Card surface row below)
- [x] Finder Select · Text vertical position → segment (`fsTextVPositions`) → `t.intermediate.fsTextPos` — deck: Home ▸ Card content & text chip ▸ "Text vertical position" pill
- [x] Finder Select · Text horizontal alignment → segment (`cardAligns`, 3 states) → `t.intermediate.fsTextAlign` — deck: Home ▸ Card content & text chip ▸ "Text horizontal alignment" pill
- [x] Finder Select · Item size → slider (0.7–`intItemSizeMax`) → `t.intermediate.itemSizeScale` via `setIntItemSize(v)` — deck: Home ▸ Arrangement chip ▸ "Item size" pill
- [x] Finder Select · Card gap → slider (0–`cardGapMax`) → via `setCardGap(v)`, read `cardGapValue` — deck: Home ▸ Arrangement chip ▸ "Card gap" pill (same pill as the generic Card gap row below)
- [x] Card size → slider (0.8–`cardSizeMax`, conditional `sizeMatters`, hidden on finder-select/hero-start) → `t.cardSizeScale` via `setCardSize(v)` — deck: Home ▸ Arrangement chip ▸ "Card size" pill
- [x] Card gap → slider (0–`cardGapMax`, conditional `gapMatters`) → `t.cardGapNum` via `setCardGap(v)` — deck: Home ▸ Arrangement chip ▸ "Card gap" pill
- [x] Card alignment → align-grid (3 buttons: left/center/right, conditional `alignMatters`) → `t.cardAlign` — deck: Home ▸ Arrangement chip ▸ "Card alignment" pill
- [x] Card content → tile-group (`cardContentsFor`) → `t.cardContent` via `pickContent(c.id)` — deck: Home ▸ Card style chip ▸ "Card content" pill
- [x] Card shape → tile-group (`availableCardShapes`, conditional not image-strip/not image-only) → `t.cardShape` via `pickShape(s.id)` — deck: Home ▸ Card style chip ▸ "Card shape" pill
- [x] Card surface → segment (`cardSurfaces`, 5 states) → `t.cardSurface` — deck: Home ▸ Card style chip ▸ "Card surface" pill
- [x] Text vertical position → segment (`textPositionsFor`, conditional `showTextPos`, hidden on finder-select) → `t.cardTextPos` — deck: Home ▸ Card content & text chip ▸ "Text vertical position" pill
- [x] Text horizontal alignment → segment (`cardAligns`, conditional content≠icon-text) → `t.cardTextAlign` — deck: Home ▸ Card content & text chip ▸ "Text horizontal alignment" pill
- [x] Text Overlay → segment (`homeOverlayStyles`, conditional `overlayRelevant`) → via `setCardOverlay(s.id)`, read `cardOverlayEff` — deck: Home ▸ Card content & text chip ▸ "Text Overlay" pill
- [x] Overlay shape → segment (`overlayShapes`, conditional) → via `setCardOverlayShape(s.id)`, read `cardOverlayShapeEff` — deck: Home ▸ Card content & text chip ▸ "Overlay shape" pill
- [x] Overlay opacity → slider (0–100 step 5, conditional; SHARED with Intermediate step, see note 5) → via `setOverlayOpacity(v)`, read `overlayOpacity` — deck: Home ▸ Card content & text chip ▸ "Overlay opacity" pill
- [x] Text shadow → segment (On/Off) → `t.cardTextShadow` — deck: Home ▸ Card content & text chip ▸ "Text shadow" pill
- [x] Header bar → segment (Show/Hide, hidden on finder-select) → `t.showHeader` — deck: Home ▸ Header chip ▸ "Header bar" pill
- [x] Header layout → segment (Preset combos/Custom, conditional `t.showHeader`) → `t.headerLayout` — deck: Home ▸ Header chip ▸ "Header layout" pill
- [x] Header style → segment (`headerStyles`, 5 states, conditional `!isCustomHeader`) → `t.headerStyle` — deck: Home ▸ Header chip ▸ "Header style" pill
- [x] Logo position (custom header) → segment (`headerItemPositions`, conditional `isCustomHeader`) → `t.logoPos` — deck: Home ▸ Header chip ▸ "Logo position" pill
- [x] Title position (custom header) → segment (`headerItemPositions`) → `t.titlePos` — deck: Home ▸ Header chip ▸ "Title position" pill
- [x] Caption position (custom header) → segment (`headerItemPositions`) → `t.captionPos` — deck: Home ▸ Header chip ▸ "Caption position" pill
- [x] Intermediate page → segment (Include/Skip → Result) → `t.includeIntermediate` — deck: Home ▸ Header chip ▸ "Intermediate page" pill

**Step 1 total: 30 controls (29 distinct deck pills — "Card gap" merges 2 inventory rows into 1 pill since
both are the same `t.cardGapNum`/`setCardGap()` binding in mutually-exclusive branches) — all migrated, all
reachable via deck + All-settings sheet.**

### Step 2 — Colors (`colors`, step-title "Colors & branding")

**Migrated to the Editor Deck pattern (phase 3a) — chips: Header / Background / Cards / Accent & logo. Each
control is now one value pill in its category; opening the pill renders the exact same control markup/bindings
inside `nt-editor-card`. All 15 rows also appear (grouped identically) in the `nt-settings-sheet` opened via the
step's "All settings" button, with their live current value + swatch where applicable — selecting a sheet row
jumps the deck to that chip + pill.**

- [x] Header → color-picker (conditional `t.showHeader`) → `t.headerColor` — deck: Colors ▸ Header chip ▸ "Header" pill
- [x] Header text → color-picker (conditional `t.showHeader`) → `t.headerTextColor` — deck: Colors ▸ Header chip ▸ "Header text" pill
- [x] Prompt text → color-picker (conditional finder-select home/intermediate style) → `t.intermediate.promptTextColor` — deck: Colors ▸ Header chip ▸ "Prompt text" pill
- [x] Page background → color-picker (allowGradient, presets `bgPresets`) → `t.background` — deck: Colors ▸ Background chip ▸ "Page background" pill
- [x] Upload/Replace home background image → image-upload button → `pickBackground('home')` — deck: Colors ▸ Background chip ▸ "Background image" pill (shared editor with Clear button, matches original `.media-row` grouping)
- [x] Clear home background image → button (conditional `t.backgroundImage`) → `clearBackground('home')` — deck: Colors ▸ Background chip ▸ "Background image" pill (same editor as Upload)
- [x] Background framing · Pan X → slider (0–100, conditional `t.backgroundImage`) → `t.bgImageX` — deck: Colors ▸ Background chip ▸ "Pan X" pill
- [x] Background framing · Pan Y → slider (0–100) → `t.bgImageY` — deck: Colors ▸ Background chip ▸ "Pan Y" pill
- [x] Background framing · Zoom → slider (100–300) → `t.bgImageZoom` — deck: Colors ▸ Background chip ▸ "Zoom" pill
- [x] Card background → color-picker (allowGradient, presets `cardPresets`, conditional not image-only/-text) → `t.cardBackground` — deck: Colors ▸ Cards chip ▸ "Card background" pill
- [x] Card text → color-picker (presets `textPresets`, conditional not image-only) → `t.cardText` — deck: Colors ▸ Cards chip ▸ "Card text" pill
- [x] Hero panel → color-picker (presets `heroPanelPresets`, conditional finder-select) → `t.intermediate.heroColor` — deck: Colors ▸ Cards chip ▸ "Hero panel" pill
- [x] Text overlay → color-picker (presets `overlayPresets`, conditional `overlayRelevant` or finder-select) → `t.overlayColor` — deck: Colors ▸ Cards chip ▸ "Text overlay" pill
- [x] Accent / highlight → color-picker → `t.accent` — deck: Colors ▸ Accent & logo chip ▸ "Accent / highlight" pill
- [x] Logo position → segment (`logoPositions`, 3 states, conditional `t.showHeader && !isCustomHeader`) → `t.logoPosition` — deck: Colors ▸ Accent & logo chip ▸ "Logo position" pill

**Step 2 total: 15 controls (9 color-pickers, 2 buttons, 3 sliders, 1 segment) — all 15 migrated, all reachable via deck + All-settings sheet.**

### Step 3 — Type (`type`, step-title "Typography & appearance")

**Migrated to the Editor Deck pattern (phase 3a) — chips: Font & fit / Text sizes / Text case. Each control is
one value pill in its category; opening the pill renders the exact same control markup/bindings inside
`nt-editor-card`. All 10 rows also appear (grouped identically) in the `nt-settings-sheet` opened via the step's
"All settings" button, with their live current value — selecting a sheet row jumps the deck to that chip + pill.**

- [x] Font → tile-group (`fonts` = `FONTS` shared list) → `t.typography.fontFamily` — deck: Type ▸ Font & fit chip ▸ "Font" pill
- [x] Text fit → segment (`textFits`) → `t.typography.textFit` — deck: Type ▸ Font & fit chip ▸ "Text fit" pill
- [x] Card label size → slider (0.6–2.0, conditional `showCardTextScaleControl`) → `t.typography.cardTextScaleNum` via `setCardTextScale(v)` — deck: Type ▸ Text sizes chip ▸ "Card label size" pill
- [x] Promo message text size → slider (0.6–2.0, conditional `showPromoTypographyControls`) → `t.typography.promoCopyTextScaleNum` via `setPromoCopyTextScale(v)` — deck: Type ▸ Text sizes chip ▸ "Promo message text size" pill
- [x] Promo card label size → slider (0.6–2.0, conditional) → `t.typography.promoCardTextScaleNum` via `setPromoCardTextScale(v)` — deck: Type ▸ Text sizes chip ▸ "Promo card label size" pill
- [x] Intermediate item text size → slider (0.6–2.0, conditional `showIntermediateTextScaleControl`) → `t.typography.intermediateTextScaleNum` via `setIntermediateTextScale(v)` — deck: Type ▸ Text sizes chip ▸ "Intermediate item text size" pill
- [x] Result text size → slider (0.6–2.0, conditional `showResultTextScaleControl`) → `t.typography.resultTextScaleNum` via `setResultTextScale(v)` — deck: Type ▸ Text sizes chip ▸ "Result text size" pill
- [x] Card text case → segment (`textCases`, conditional `showCardTextCaseControl`) → `t.typography.cardTextCase` — deck: Type ▸ Text case chip ▸ "Card text case" pill
- [x] Header text size → slider (0.6–2.0, conditional `showHeaderTextScaleControl`) → `t.typography.headerTextScaleNum` via `setHeaderTextScale(v)` — deck: Type ▸ Text sizes chip ▸ "Header text size" pill
- [x] Header text case → segment (`textCases`) → `t.typography.headerTextCase` — deck: Type ▸ Text case chip ▸ "Header text case" pill

**Step 3 total: 10 controls — all 10 migrated, all reachable via deck + All-settings sheet.**

### Step 4 — Intermediate design (`intStyle`, step-title "Intermediate design")

**Migrated to the Editor Deck pattern (phase 3c) — chips: Arrangement / Card style / Card content &
text / Header, mirroring Home step's category naming exactly. As with Home, the Finder-select branch
and the generic branch are mutually exclusive on `t.intermediateStyle`, driven by `intArrangementOptions`
/ `intCardStyleOptions` / `intCardTextOptions` / `intHeaderOptions` getters that mirror every original
`*ngIf` 1:1. "Card gap" merges the Finder-select and generic Card-gap rows into ONE pill (both bind to
`t.intermediate.gapNum` via `setIntCardGap()`/`intCardGapValue`, mutually exclusive by style — same
merge pattern as Home's Card gap/Card surface). "Overflow scrolling" and "Carousel scrolling" merge
into ONE `interScroll` key (both call `setInterScroll()`, mutually exclusive by style) that is
**never pushed into the options array while `hideVerticalScroll === true`** — the getter uses the
exact same `&& !hideVerticalScroll` guard as the original template, so the option/pill/settings-row
never renders, and the underlying markup (both original mutually-exclusive branches) is preserved
verbatim inside the (unreachable) `interScroll` editor-card case for when the flag is ever flipped.
"Card surface" is the same `t.cardSurface` property bound on the Home step. All 28 inventory rows
(26 distinct deck pills — the 2 merges above) appear (grouped identically) in the `nt-settings-sheet`
opened via the step's "All settings" button, with their live current value — selecting a sheet row
jumps the deck to that chip + pill. The 2 hidden rows are NOT surfaced as pills or settings-sheet rows,
per the inventory note 2 requirement.**

- [x] Layout style → tile-group (`intStyles`: columns/card-strip/fullscreen/brand-rail/finder-select) → `t.intermediateStyle` via `pickInterStyle(o)` — deck: Intermediate design ▸ Arrangement chip ▸ "Layout style" pill
- [x] Columns / Visible cards → number-stepper (conditional `intColumnsMatters`) → `t.intermediate.columns`(-like field) via `stepIntColumns(delta)` / `setIntColumns(v)` — deck: Intermediate design ▸ Arrangement chip ▸ "Columns"/"Visible cards" pill
- [x] Overflow scrolling → segment (Vertical/Horizontal) **[HIDDEN — `intScrollMatters && !hideVerticalScroll`, see note 2]** → via `setInterScroll(mode)`, read `effectiveInterScrollMode` — deck: Intermediate design ▸ Arrangement chip ▸ "Overflow scrolling" pill (merged with Carousel scrolling into `interScroll`; never surfaced while `hideVerticalScroll===true`)
- [x] Message position (brand-rail) → segment (Left/Right) → `t.intermediate.brandRailMessagePos` — deck: Intermediate design ▸ Arrangement chip ▸ "Message position" pill
- [x] Message alignment (brand-rail) → segment (`brandRailValigns`, 3 states) → `t.intermediate.brandRailMessageAlign` — deck: Intermediate design ▸ Arrangement chip ▸ "Message alignment" pill
- [x] Finder Select · Title visibility → segment → `t.intermediate.fsShowPrompt` — deck: Intermediate design ▸ Arrangement chip ▸ "Title visibility" pill
- [x] Finder Select · Title alignment → segment (3 states) → `t.intermediate.fsPromptPos` — deck: Intermediate design ▸ Arrangement chip ▸ "Title alignment" pill
- [x] Finder Select · Back visibility → segment (Show back/Hide back) → `t.intermediate.fsShowBack` — deck: Intermediate design ▸ Arrangement chip ▸ "Back visibility" pill
- [x] Finder Select · Card gap → slider (0–20) → via `setIntCardGap(v)`, read `intCardGapValue` — deck: Intermediate design ▸ Arrangement chip ▸ "Card gap" pill (same pill as the generic Card gap row below)
- [x] Finder Select · Card content → segment (`fsCardContents`) → `t.intermediate.fsCardContent` via `pickFsContent(c.id)` — deck: Intermediate design ▸ Card style chip ▸ "Card content" pill
- [x] Finder Select · Card shape → tile-group (`cardShapes`, conditional) → `t.intermediate.fsCardShape` via `setFsCardShape(s.id)` — deck: Intermediate design ▸ Card style chip ▸ "Card shape" pill
- [x] Finder Select · Text vertical position → segment (`fsTextVPositions`, conditional) → `t.intermediate.fsTextPos` — deck: Intermediate design ▸ Card content & text chip ▸ "Text vertical position" pill
- [x] Finder Select · Text horizontal alignment → segment (`cardAligns`, conditional) → `t.intermediate.fsTextAlign` — deck: Intermediate design ▸ Card content & text chip ▸ "Text horizontal alignment" pill
- [x] Carousel scrolling (fullscreen only) → segment (Horizontal/Vertical carousel) **[HIDDEN — `!hideVerticalScroll`, see note 2]** → via `setInterScroll(mode)` — deck: Intermediate design ▸ Arrangement chip ▸ "Overflow scrolling" pill (merged, same `interScroll` key; never surfaced while `hideVerticalScroll===true`)
- [x] Item size → slider (0.7–`intItemSizeMax`, conditional not drill-stair/card-strip) → `t.intermediate.itemSize`/itemSizeScale via `setIntItemSize(v)` — deck: Intermediate design ▸ Arrangement chip ▸ "Item size" pill
- [x] Card gap → slider (0–20, conditional not finder-select/drill-stair/card-strip) → `t.intermediate.cardGapNum` via `setIntCardGap(v)` — deck: Intermediate design ▸ Arrangement chip ▸ "Card gap" pill
- [x] Card content → segment (`interContentsFor`, conditional `intContentMatters`) → `t.intermediate.content` via `pickInterContent(c.id)` — deck: Intermediate design ▸ Card style chip ▸ "Card content" pill
- [x] Card shape → tile-group (`interShapesFor`, conditional `intShapeMatters`) → `t.intermediate.cardShape` via `setInterShape(s.id)` — deck: Intermediate design ▸ Card style chip ▸ "Card shape" pill
- [x] Text vertical position → segment (`interTextPositionsFor`, conditional `intTextPosMatters`) → `t.intermediate.textPos` — deck: Intermediate design ▸ Card content & text chip ▸ "Text vertical position" pill
- [x] Text horizontal alignment → segment (`cardAligns`, conditional `interTextAlignMatters`) → `t.intermediate.textAlign` — deck: Intermediate design ▸ Card content & text chip ▸ "Text horizontal alignment" pill
- [x] Text Overlay → segment (`interOverlayStyles`, conditional `interOverlayRelevant`) → via `setInterOverlay(s.id)`, read `interOverlayEff` — deck: Intermediate design ▸ Card content & text chip ▸ "Text Overlay" pill
- [x] Overlay shape → segment (`overlayShapes`, conditional) → via `setInterOverlayShape(s.id)`, read `interOverlayShapeEff` — deck: Intermediate design ▸ Card content & text chip ▸ "Overlay shape" pill
- [x] Overlay opacity → slider (0–100 step 5, conditional; SHARED with Home step, see note 5) → via `setOverlayOpacity(v)`, read `overlayOpacity` — deck: Intermediate design ▸ Card content & text chip ▸ "Overlay opacity" pill
- [x] Text shadow → segment (On/Off, conditional content≠image-only) → `t.intermediate.textShadow` — deck: Intermediate design ▸ Card content & text chip ▸ "Text shadow" pill
- [x] Card alignment → align-grid (up to 6 buttons: left/center/right + top/middle/bottom, conditional `intAlignMatters`) → `t.intermediate.align` / `t.intermediate.valign` — deck: Intermediate design ▸ Arrangement chip ▸ "Card alignment" pill
- [x] Card surface → segment (`cardSurfaces`, conditional not drill-stair; SHARED with Home step) → `t.cardSurface` — deck: Intermediate design ▸ Card style chip ▸ "Card surface" pill
- [x] Header bar → segment (Show/Hide, conditional not finder-select) → `t.intermediate.showHeader` — deck: Intermediate design ▸ Header chip ▸ "Header bar" pill
- [x] Header tracklist → segment (Show/Hide, conditional `showHeader`) → `t.intermediate.showTracklist` — deck: Intermediate design ▸ Header chip ▸ "Header tracklist" pill

**Step 4 total: 28 controls (26 distinct deck pills — "Card gap" and "Overflow scrolling"/"Carousel
scrolling" each merge 2 inventory rows into 1 pill, mirroring Home's merge pattern) — all migrated,
all reachable via deck + All-settings sheet, except the 2 rows hidden by `hideVerticalScroll` which
remain templated-but-unreachable exactly as before.**

### Step 5 — Intermediate colors (`intColors`, step-title "Intermediate colors")

**Migrated to the Editor Deck pattern (phase 3d) — chips: Header / Background / Cards / Accent /
Navigation. Each control is one value pill in its category; opening the pill renders the exact same
control markup/bindings inside `nt-editor-card`. The Navigation category's 11 shared-state rows are
rendered via ONE shared `ng-template #navEditorTpl` (in `theme-wizard.component.html`) driven by ONE
shared `navOptions(page)` getter (in `.ts`) — instantiated here with `page: 'intermediate'`, and
identically from the Result-colors step with `page: 'result'` — so both steps read/write the exact
same `t.nav` / `t.navStyle` object, never two independent copies (see Structural note 1, and the
shared block's comment header in both files). All 30 rows also appear (grouped identically) in the
`nt-settings-sheet` opened via the step's "All settings" button, with their live current value +
swatch where applicable — selecting a sheet row jumps the deck to that chip + pill.**

- [x] Header background → color-picker (conditional `t.intermediate.showHeader`) → `t.intermediate.headerColor` — deck: Intermediate colors ▸ Header chip ▸ "Header background" pill
- [x] Header text color → color-picker (conditional) → `t.intermediate.headerTextColor` — deck: Intermediate colors ▸ Header chip ▸ "Header text color" pill
- [x] Page background → color-picker (presets `bgPresets`) → `t.intermediate.background` — deck: Intermediate colors ▸ Background chip ▸ "Page background" pill
- [x] Upload/Replace intermediate background image → image-upload button → `pickBackground('inter')` — deck: Intermediate colors ▸ Background chip ▸ "Background image" pill (shared editor with Clear button, matches original `.media-row` grouping)
- [x] Clear intermediate background image → button (conditional) → `clearBackground('inter')` — deck: Intermediate colors ▸ Background chip ▸ "Background image" pill (same editor as Upload)
- [x] Background framing · Pan X → slider (0–100, conditional) → `t.intermediate.bgImageX` — deck: Intermediate colors ▸ Background chip ▸ "Pan X" pill
- [x] Background framing · Pan Y → slider (0–100) → `t.intermediate.bgImageY` — deck: Intermediate colors ▸ Background chip ▸ "Pan Y" pill
- [x] Background framing · Zoom → slider (100–300) → `t.intermediate.bgImageZoom` — deck: Intermediate colors ▸ Background chip ▸ "Zoom" pill
- [x] Row / card background → color-picker (presets `intCardPresets`, conditional `showInterCardBackgroundColor`) → `t.intermediate.cardBackground` — deck: Intermediate colors ▸ Cards chip ▸ "Row / card background" pill
- [x] Card text → color-picker (presets `textPresets`, conditional `showInterCardTextColor`) → `t.intermediate.cardText` — deck: Intermediate colors ▸ Cards chip ▸ "Card text" pill
- [x] Hero panel → color-picker (presets `heroPanelPresets`, conditional finder-select) → `t.intermediate.heroColor` — deck: Intermediate colors ▸ Cards chip ▸ "Hero panel" pill
- [x] Text overlay → color-picker (presets `overlayPresets`, conditional finder-select; note: binds to `t.overlayColor`, the Home-step field, not a dedicated intermediate field) → `t.overlayColor` — deck: Intermediate colors ▸ Cards chip ▸ "Text overlay" pill
- [x] Message background (brand-rail) → color-picker → `t.intermediate.brandRailMessageBgColor` — deck: Intermediate colors ▸ Cards chip ▸ "Message background" pill
- [x] Message text color (brand-rail) → color-picker → `t.intermediate.brandRailMessageTextColor` — deck: Intermediate colors ▸ Cards chip ▸ "Message text color" pill
- [x] Accent / active → color-picker → `t.intermediate.accent` — deck: Intermediate colors ▸ Accent chip ▸ "Accent / active" pill

**Navigation buttons block (conditional `t.intermediateStyle !== 'finder-select'`) — see Structural note 1:**

- [x] Back · Icon color → color-picker (allowReset, `resetNavColor('backColor')`) → `t.nav.backColor` **[SHARED with Result-colors step]** — deck: Intermediate colors ▸ Navigation chip ▸ "Back · Icon color" pill (shared `#navEditorTpl` / `navOptions()`)
- [x] Back · Background → color-picker (allowReset, `resetNavColor('backBg')`) → `t.nav.backBg` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Back · Background" pill
- [x] Home · Icon color → color-picker (allowReset, `resetNavColor('homeColor')`) → `t.nav.homeColor` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Home · Icon color" pill
- [x] Home · Background → color-picker (allowReset, `resetNavColor('homeBg')`) → `t.nav.homeBg` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Home · Background" pill
- [x] Button style → segment (`navModes`) → `t.nav.mode` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Button style" pill
- [x] Back label → text input (conditional `mode !== 'icon'`) → `t.nav.backLabel` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Back label" pill
- [x] Home label → text input (conditional) → `t.nav.homeLabel` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Home label" pill
- [x] Button size → segment (`navSizes`) → `t.nav.size` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Button size" pill
- [x] Back icon → icon-tile-group (`backNavIconIds` + Default + Upload, conditional `mode !== 'text'`) → `t.nav.backIcon` via `pickNavIcon('back')` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Back icon" pill
- [x] Home icon → icon-tile-group (`homeNavIconIds` + Default + Upload) → `t.nav.homeIcon` via `pickNavIcon('home')` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Home icon" pill
- [x] Nav bar style → segment (`navStyles`: Floating/Hidden) → `t.navStyle` **[SHARED]** — deck: Intermediate colors ▸ Navigation chip ▸ "Nav bar style" pill
- [x] Button layout → segment (Grouped together/Separate) → `t.intermediate.navSplit` via `setNavSplit('intermediate', bool)` **[INDEPENDENT]** — deck: Intermediate colors ▸ Navigation chip ▸ "Button layout" pill (page-scoped via shared template's `page` context = `'intermediate'`)
- [x] Button position → segment (`navButtonPositions`, 8 states, conditional `!split`) → `t.intermediate.navPosition` via `setNavPosition('intermediate', p.id)` **[INDEPENDENT]** — deck: Intermediate colors ▸ Navigation chip ▸ "Button position" pill
- [x] Back position → segment (`navPositionsFor`, conditional `split`) → `t.intermediate.navBackPosition` via `setNavBackPosition('intermediate', p.id)` **[INDEPENDENT]** — deck: Intermediate colors ▸ Navigation chip ▸ "Back position" pill
- [x] Home position → segment (conditional `split`) → `t.intermediate.navHomePosition` via `setNavHomePosition('intermediate', p.id)` **[INDEPENDENT]** — deck: Intermediate colors ▸ Navigation chip ▸ "Home position" pill

**Step 5 total: 30 controls (15 base + 15 nav-block, of which 11 nav-block controls are SHARED state with Result-colors and 4 are independent) — all 30 migrated, all reachable via deck + All-settings sheet, shared nav state verified against the same `t.nav` object as Step 7 (not a duplicated copy).**

### Step 6 — Result template (`resTemplate`, step-title "Result template")

**Migrated to the Editor Deck pattern (phase 3e) — chips: Template / Promotion (promo-map-rank
only) / Sorting & filters (finder-detail's Sort tabs + SALE badge, map-filter-list's Filter
position) / Card layout (Card content / Card shape / Text position / Overflow scrolling).
Category names taken from the step's `.step-title.sm` labels per the redesign prompt. The two
multi-toggle rows (Promotion panel's 5 toggles, finder-detail's Sort tabs multi-select) each stay
ONE pill/settings-sheet row — matching this table's own "counted as 1 row" guidance — with the
pill/sheet value summarizing which sub-options are currently on (e.g. "Timer, Ranks, Zone" /
"All hidden"); the editor-card still renders every sub-toggle for that one pill, unchanged. All 9
rows also appear in the `nt-settings-sheet` opened via the step's "All settings" button, with
their live current value — selecting a sheet row jumps the deck to that chip + pill. `promo-map-
rank` remains reachable only for themes that already have that legacy value; no new tile was
added to the Template picker (Structural note 3 preserved).**

- [x] Template → tile-group (`resultTemplates`: map-list/filter-list/promo-list/product-focus/shelf/finder-detail — 6 selectable; `promo-map-rank` is a 7th legacy value with no tile, see Structural note 3) → `t.resultTemplate` via `pickResultTemplate(o)` — deck: Result template ▸ Template chip ▸ "Template" pill
- [x] Promotion panel toggles (promo-map-rank only) → segment/multi-toggle (Timer/Bell/Ranks/Sort tabs/Zone — 5 independent toggles in one row) → `t.result.showTimer` / `showBell` / `showRanks` / `showSortTabs` / `showZone` — deck: Result template ▸ Promotion chip ▸ "Promotion panel" pill
- [x] Sort tabs (finder-detail only) → multi-select segment (`finderSortOpts`: Recommend/Alphabetical/Low Price/On Sale) → `t.result.sortTabs` via `toggleSortTab(id)` — deck: Result template ▸ Sorting & filters chip ▸ "Sort tabs" pill
- [x] Options · SALE badge (finder-detail only) → toggle → `t.result.showSaleBadge` — deck: Result template ▸ Sorting & filters chip ▸ "SALE badge" pill
- [x] Filter position (map-filter-list only) → segment (`filterPositions`) → `t.result.filterPos` — deck: Result template ▸ Sorting & filters chip ▸ "Filter position" pill
- [x] Card content → segment (`resultContents`: Image+Text/Text only, conditional `resCardContentMatters`) → `t.result.content` — deck: Result template ▸ Card layout chip ▸ "Card content" pill
- [x] Card shape → tile-group (Default + `resShapesFor`, conditional `resShapeMatters` and content=image-text) → `t.result.cardShape` — deck: Result template ▸ Card layout chip ▸ "Card shape" pill
- [x] Text position → segment (`cardTextPositions`, conditional `resTextPosMatters` and content=image-text) → `t.result.textPos` — deck: Result template ▸ Card layout chip ▸ "Text position" pill
- [x] Overflow scrolling → segment (`scrollModes`, conditional `resOverflowMatters`) → `t.result.scrollMode` (read via `effectiveResultScrollMode`) — deck: Result template ▸ Card layout chip ▸ "Overflow scrolling" pill

**Step 6 total: 9 controls (2 of which are multi-toggle rows containing 5 and 4 sub-toggles respectively — counted as 1 row each per spec's guidance on multi-state controls, with sub-state counts noted) — all 9 migrated, all reachable via deck + All-settings sheet.**

### Step 7 — Result colors (`resColors`, step-title "Result colors")

**Migrated to the Editor Deck pattern (phase 3d), in the same pass as Step 5 since they share nav
state — chips: Header / Background / Cards / Template / Accent / Navigation. "Template" holds the
finder-detail-only and promo-map-rank-only color rows (mutually exclusive by `t.resultTemplate`,
never both populated at once — the `promo-map-rank` rows stay reachable here for any theme that
already has that legacy value saved, per Structural note 3, with no new selectable tile added
anywhere). The Navigation category is the SAME shared `#navEditorTpl` / `navOptions(page)` pairing
used by Step 5, called here with `page: 'result'` — same `t.nav` / `t.navStyle` object, not a
duplicated copy (see Step 5's note and Structural note 1). All 35 rows also appear (grouped
identically) in the `nt-settings-sheet` opened via the step's "All settings" button, with their live
current value + swatch where applicable — selecting a sheet row jumps the deck to that chip + pill.**

- [x] Header → color-picker (transparentValue support, conditional not promo-map-rank/finder-detail) → `t.result.headerColor` — deck: Result colors ▸ Header chip ▸ "Header" pill
- [x] Page background → color-picker (presets `bgPresets`, conditional not promo-map-rank, no bg image) → `t.result.background` — deck: Result colors ▸ Background chip ▸ "Page background" pill
- [x] Upload/Replace result background image → image-upload button (conditional not promo-map-rank) → `pickBackground('result')` — deck: Result colors ▸ Background chip ▸ "Background image" pill (shared editor with Clear button, matches original `.media-row` grouping)
- [x] Clear result background image → button (conditional) → `clearBackground('result')` — deck: Result colors ▸ Background chip ▸ "Background image" pill (same editor as Upload)
- [x] Product card background → color-picker (presets `cardPresets`, conditional not finder-detail/hero-product) → `t.result.cardBackground` — deck: Result colors ▸ Cards chip ▸ "Product card background" pill
- [x] Card text → color-picker (presets `textPresets`, conditional not hero-product/finder-detail) → `t.result.cardText` — deck: Result colors ▸ Cards chip ▸ "Card text" pill
- [x] Popular button text (map-list only) → color-picker (presets `textPresets`) → `t.result.popularText` — deck: Result colors ▸ Cards chip ▸ "Popular button text" pill
- [x] Accent / highlight → color-picker (conditional not promo-map-rank/hero-product) → `t.result.accent` — deck: Result colors ▸ Accent chip ▸ "Accent / highlight" pill
- [x] Find button (finder-detail only) → color-picker → `t.result.findColor` — deck: Result colors ▸ Template chip ▸ "Find button" pill
- [x] List background (finder-detail only) → color-picker → `t.result.listBg` — deck: Result colors ▸ Template chip ▸ "List background" pill
- [x] Product / detail card (finder-detail only) → color-picker → `t.result.cardBg` — deck: Result colors ▸ Template chip ▸ "Product / detail card" pill
- [x] Card text (finder-detail only) → color-picker → `t.result.cardTextColor` — deck: Result colors ▸ Template chip ▸ "Card text" pill (distinct key `resCardTextColor` from the general "Card text" pill above — mutually exclusive by `resultTemplate`, never shown together)
- [x] Promo panel (promo-map-rank only) → color-picker → `t.result.panelColor` — deck: Result colors ▸ Template chip ▸ "Promo panel" pill
- [x] Category rail (promo-map-rank only) → color-picker → `t.result.railBg` — deck: Result colors ▸ Template chip ▸ "Category rail" pill
- [x] Sub-category panel (promo-map-rank only) → color-picker → `t.result.subPanelColor` — deck: Result colors ▸ Template chip ▸ "Sub-category panel" pill
- [x] Sub-category text (promo-map-rank only) → color-picker → `t.result.secondaryTextColor` — deck: Result colors ▸ Template chip ▸ "Sub-category text" pill
- [x] Map pin (promo-map-rank only) → color-picker → `t.result.pinColor` — deck: Result colors ▸ Template chip ▸ "Map pin" pill
- [x] Location dots (promo-map-rank only) → color-picker → `t.result.dotColor` — deck: Result colors ▸ Template chip ▸ "Location dots" pill
- [x] Map area (promo-map-rank only) → color-picker → `t.result.mapBg` — deck: Result colors ▸ Template chip ▸ "Map area" pill
- [x] Header bar → segment (Show/Hide, conditional not finder-detail) → `t.result.showHeader` — deck: Result colors ▸ Header chip ▸ "Header bar" pill
- [x] Header tracklist → segment (Show/Hide, conditional `showHeader`) → `t.result.showTracklist` — deck: Result colors ▸ Header chip ▸ "Header tracklist" pill

**Navigation buttons block (unconditional on this step) — same shared/independent split as Step 5, see Structural note 1:**

- [x] Back · Icon color → color-picker → `t.nav.backColor` **[SHARED with Intermediate-colors step]** — deck: Result colors ▸ Navigation chip ▸ "Back · Icon color" pill (shared `#navEditorTpl` / `navOptions()`)
- [x] Back · Background → color-picker → `t.nav.backBg` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Back · Background" pill
- [x] Home · Icon color → color-picker → `t.nav.homeColor` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Home · Icon color" pill
- [x] Home · Background → color-picker → `t.nav.homeBg` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Home · Background" pill
- [x] Button style → segment (`navModes`) → `t.nav.mode` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Button style" pill
- [x] Back label → text input (conditional) → `t.nav.backLabel` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Back label" pill
- [x] Home label → text input (conditional) → `t.nav.homeLabel` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Home label" pill
- [x] Button size → segment (`navSizes`) → `t.nav.size` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Button size" pill
- [x] Back icon → icon-tile-group → `t.nav.backIcon` via `pickNavIcon('back')` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Back icon" pill
- [x] Home icon → icon-tile-group → `t.nav.homeIcon` via `pickNavIcon('home')` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Home icon" pill
- [x] Nav bar style → segment (`navStyles`) → `t.navStyle` **[SHARED]** — deck: Result colors ▸ Navigation chip ▸ "Nav bar style" pill
- [x] Button layout → segment → `t.result.navSplit` via `setNavSplit('result', bool)` **[INDEPENDENT]** — deck: Result colors ▸ Navigation chip ▸ "Button layout" pill (page-scoped via shared template's `page` context = `'result'`)
- [x] Button position → segment (conditional `!split`) → `t.result.navPosition` via `setNavPosition('result', p.id)` **[INDEPENDENT]** — deck: Result colors ▸ Navigation chip ▸ "Button position" pill
- [x] Back position → segment (conditional `split`) → `t.result.navBackPosition` via `setNavBackPosition('result', p.id)` **[INDEPENDENT]** — deck: Result colors ▸ Navigation chip ▸ "Back position" pill
- [x] Home position → segment (conditional `split`) → `t.result.navHomePosition` via `setNavHomePosition('result', p.id)` **[INDEPENDENT]** — deck: Result colors ▸ Navigation chip ▸ "Home position" pill

**Step 7 total: 35 controls (21 base color/header rows + 15 nav-block, minus 1 dup — 20 base + 15 nav = 35; nav-block shared/independent split identical to Step 5) — all 35 migrated, all reachable via deck + All-settings sheet, shared nav state verified against the same `t.nav` object as Step 5 (not a duplicated copy). `promo-map-rank`'s 7 color pickers remain reachable only for themes that already have that legacy value; no new tile was added.**

### Step 8 — Animations & loader (`anim`, step-title "Animations & loader")

- [ ] Page transition → tile-group (`transitions`: fade-slide/scale-up/slide-left/shimmer/none) + inline "▶ Preview" replay button → `t.animation.transition` (triggers `replayTransition()`)
- [ ] Speed → segment (`speeds`: slow/normal/fast) → `t.animation.speed` (triggers `replayTransition()`)
- [ ] Loader style → tile-group with live mini-preview per tile (`loaders`: spinner/dot-pulse/progress/logo/skeleton) + inline "▶ Preview" replay button → `t.loader.style` (triggers `replayLoader()`)
- [ ] Loader color → color-picker → `t.loader.color` (triggers `replayLoader()`)

**Step 8 total: 4 controls**

### Step 9 — Screensaver (`saver`, step-title "Screensaver")

- [ ] Screensaver mode → segment (`saverModes`: slideshow/single-image/video) → `saverMode` (component field, not `t.*`)
- [ ] Overlay content → segment (Show/Hide) → `t.saverOverlay.showContent`
- [ ] Overlay text · Title → text input (conditional `showContent !== false`; special focus-to-clear-placeholder behavior) → `t.saverOverlay.title`
- [ ] Overlay text · Subtitle / CTA → text input (same focus-clear behavior) → `t.saverOverlay.subtitle`
- [ ] Text color → color-picker → `t.saverOverlay.textColor`
- [ ] Box background → color-picker (presets `overlayPresets`) → `t.saverOverlay.bgColor`
- [ ] Overlay position → segment (`saverPositions`: center/bottom/top/bottom-left/bottom-right) → `t.saverOverlay.position`

**Step 9 total: 7 controls**

### Step 10 — Review (`review`, step-title "Review & save")

- [ ] Theme name → text input (required, validated) → `name` via `[(ngModel)]` + `onNameInput()`
- [ ] Summary table → read-only rows (Home layout, Scrolling, Card, Card style, Header, Intermediate, Result,
      Nav buttons, Typography, Animation, Loader, Screensaver overlay) → derived display only, no direct
      binding to edit — spec requires restyling rows to match the "All settings" sheet row style but keeping
      the read-only summary-table behavior (12 summary rows, not independently editable controls)

**Step 10 total: 1 editable control (Theme name) + 12 read-only summary rows (restyle only, per spec)**

---

## PART 2 — Content builder (`content-builder.component.html` / `.ts`)

### Step A — Home (`home`, step-title "Home page")

- [ ] Header visibility indicator (chip, read-only reflecting `d.themeTokens.showHeader`) — not editable here (edited in theme wizard)
- [ ] Logo image → image-upload (thumb tap, conditional `showLogo`) → `d.header.logo` via `pickLogo()` / `clearLogo()`
- [ ] Logo size → slider (50–250%) → `headerLogoScalePct` via `setHeaderLogoScale(v)`
- [ ] Title → text input (conditional `needsHeaderTitle`) → `d.header.title` via `setHeader('title', $event)`
- [ ] Caption → text input (conditional `needsHeaderCaption`) → `d.header.caption` via `setHeader('caption', $event)`
- [ ] Promo eyebrow label (promo-categories layout) → text input → `td.promoFeatured`
- [ ] Promo message (promo-categories layout) → text input → `td.promoCopy`
- [ ] Category API fetch → button (conditional `appMode==='category'`) → `fetch()`
- [ ] Hierarchy fields source → select-field (`fieldSourceOpts`) → `d.fieldSource` via `setFieldSource(v)`
- [ ] Category depth → segment (L0 only / L0+L1 / +L2 / +L3, conditional on `maxCategoryDepth`) → `categoryLevelCount` via `setCategoryLevelCount(n)`
- [ ] L0 category value selection → repeating-list-item (checkbox per API value) → `catSel[0]` via `toggleCat(0, v, $event)`
- [ ] "Use N selected → build pages" → button → `applySelection()`
- [ ] Category text case → segment (`articleCaseOpts`) → `d.articleCase` via `setArticleCase(c.id)`
- [ ] Intermediate pages mode (non-category) → segment (Common — one shared page / Individual — per card) → `drillMode` via `setDrillMode(mode)`
- [ ] Category depth (prototype individual mode) → segment (L0+L1/+L2/+L3) → `protoLevelCount` via `setProtoLevelCount(n)`
- [ ] Home cards → repeating-list-item (unbounded, "+ Add" conditional not category mode) → `d.home[]` via `addCard()` / `removeCard(i)` / `moveHomeCard(i, dir)`
  - sub-fields per card: thumbnail/image-upload (`pickImage(c)`), name text input (`c.name`, locked+readonly if `c.fromApi`), price text input (`c.price`), unit text input (`c.unit`), image Fit segment (`fitOpts`, `setFit(c,f)`), clear-image button (`clearImage(c)`), subtree badge (read-only, conditional `drillMode==='individual'`)
- [ ] Result pages mode (non-category, applies to next step) → segment (Common — one result page / Individual — per item) → `resultMode` via `setResultMode(mode)`

**Step A total: 18 named controls + 2 repeating-list-item templates (L0 category checkboxes, Home cards — the
latter with 7 sub-fields per item)**

### Step B — Intermediate (`inter`/`inter1`/`inter2`/`inter3`, step-title "Intermediate page")

*Reused template across up to 4 step instances per Structural note 6 — level-scoped via `interLevel`/`activeL0/L1/L2` or `protoL0Id/L1Id/L2Id`. Listed once; deck must replicate the same per-level scoping.*

- [ ] Home Fields (L0) selector (category mode) → segment (repeating per API value) → `activeL0` via `setActiveL0(v)`
- [ ] L1 options selector (category mode, `interLevel>=2`) → segment → `activeL1` via `setActiveL1(v)`
- [ ] L2 options selector (category mode, `interLevel>=3`) → segment → `activeL2` via `setActiveL2(v)`
- [ ] Intermediate L{n} Cards (category mode) → repeating-list-item (read-only names from API + editable fields) → `interCardsList` — sub-fields: image-upload (`pickImage`), Fit segment, price input, unit input
- [ ] Brand rail message (per drill level) → text input (conditional `isBrandRail`) → `brandRailMsgForStep` via `setBrandRailMsg($event)`
- [ ] Finder steps labels (finder-select, first level only) → repeating-list-item text inputs (one per drill level) → via `finderStepValue(i)` / `setFinderStep(i, $event)`
- [ ] Hero Title (finder-select) → text input → `d.header.title` via `setHeader('title', $event)`
- [ ] Prompt (finder-select) → text input → `td.promptText`
- [ ] Fast lookup index mode (finder-select) → segment (A–Z/Number) → `td.indexMode`
- [ ] Fast lookup · Min (finder-select, number mode) → number input → `td.indexNumberMin`
- [ ] Fast lookup · Max (finder-select, number mode) → number input → `td.indexNumberMax`
- [ ] Fast lookup · Interval (finder-select, number mode) → number input → `td.indexNumberInterval`
- [ ] Home Fields (L0) selector (prototype leveled mode) → segment → `protoL0Id` via `setProtoL0(id)`
- [ ] L1 options selector (prototype leveled, `interLevel>=2`) → segment → `protoL1Id` via `setProtoL1(id)`
- [ ] L2 options selector (prototype leveled, `interLevel>=3`) → segment → `protoL2Id` via `setProtoL2(id)`
- [ ] Intermediate L{n} cards (prototype leveled) → repeating-list-item ("+ Add" via `addProtoCard()`, reorder/remove via `moveProtoCard`/`removeProtoCard`) → `protoCards` — sub-fields: image-upload, name input, Fit segment, price input, unit input
  - nested: Own result products (leaf nodes only, promo-map-rank) → repeating-list-item → `it.node.products[]` via `addLeafProduct(it.node)` / `removeLeafProduct` — sub-fields: image-upload, name input
- [ ] Intermediate items (common/shared mode, non-category) → repeating-list-item ("+ Add" via `addIntermediate()`) → `d.intermediate[]` via `moveIntermediate(i,dir)` / `removeIntermediate(i)` — sub-fields: image-upload, name input (locked if `fromApi`), Fit segment

**Step B total: 16 named controls + 4 repeating-list-item templates (L{n} category cards, finder-select
labels, prototype leveled cards with a nested products sub-list, common intermediate items)**

### Step C — Result (`result`, step-title "Result page")

- [ ] Fields to show (category mode) → multi-toggle segment (`resultFieldOpts`: Article name/Price/Zone/Article ID/Shelf — 5 sub-toggles) → via `toggleResultField(f.id)`, read `resultFieldOn(f.id)`
- [ ] LED colour (category mode) → select-field (`ledColorOpts`) → `d.ledColour` via `setLedColour(v)`
- [ ] Blink duration (category mode) → select-field (`ledDurationOpts`) → `d.ledDuration` via `setLedDuration(v)`
- [ ] Hierarchy & matched products (category mode) → repeating-list-item (read-only, grouped by leaf) → `resultLeaves[].node.products[]` — sub-fields: image-upload, name (locked), price/zone/shelf inputs (conditional on Fields-to-show toggles), Article ID input, Fit segment
- [ ] Result pages mode (skip-intermediate themes, non-category) → segment (Common — one result page / Per item — one per home card) → `itemResultMode` via `setItemResultMode(mode)`
- [ ] Home card selector for per-item result (conditional `itemResultMode==='per-item'`) → segment (repeating per home card) → `activeCardId` via `selectItemCard(c.id)`
- [ ] Result map image → image-upload (conditional `resultNeedsMap`) → `curResult.mapImage` via `pickMap()` / `clearMap()`
- [ ] Marker placement · product selector (conditional map+products) → segment (repeating per product) → `markerIdx`
- [ ] Map zoom → stepper (−/value/+, 1×–3×) → `mapZoom` via `zoomMapOut()` / `zoomMapIn()`
- [ ] Map tap-to-place → interactive map click target → `p.mapX` / `p.mapY` via `placeMarker($event, mapBox)`
- [ ] Map dots mode → segment (Dot/None) → via `setRouteKind(kind)`, read `mapDotsEnabled` / `mapRoute?.kind`
- [ ] Marker color → color-picker (conditional `mapDotsEnabled`) → via `setRouteColor($event)`, reads `mapRoute?.color`
- [ ] Promo / selection panel image (or "Side category image" for shelf template) → image-upload → `curResult.promoImage` via `pickPromo()` / `clearPromo()`
- [ ] Individual result pages (drill-tree themes, `resultMode==='individual'`) → repeating-list-item (per leaf, "+ Add" via `addLeafProduct(leaf.node)`) → sub-fields as below plus per-leaf Map locator (product selector segment `leafMarkerIndex`/`selectLeafMarker`, color-picker `leafMarkerColor`/`setLeafMarkerColor`, tap-to-place `placeLeafMarker`)
- [ ] Result products (common/shared list) → repeating-list-item ("+ Add" via `addProduct()`) → `curResult.products[]` via `moveProduct(i,dir)` / `removeProduct(i)`
  - sub-fields: image-upload, name input (locked if `fromApi`), Fit segment, price input, aisle/zone input, shelf input, Map X/Map Y number inputs (conditional `resultNeedsMap`), ESL id input (conditional `appMode==='prototype-esl'`), zone input (conditional `isPromoRank`)
  - finder-detail sub-fields (conditional `isFinder`): description input, sale price input, "On sale" checkbox, Attributes repeating-list-item (`p.specs[]` via `addSpec(p)`/`removeSpec(p,i)` — label + value text inputs), Fitments repeating-list-item (`p.fitments[]` via `addFitment(p)`/`removeFitment(p,i)` — sub-fields: image-upload `pickFitImage(f)`, label input, sub-name input, price input, sale price input, Article ID input conditional prototype-esl)
- [ ] ESL blink by (prototype-esl mode) → select-field (`eslByOpts`) → `d.eslBlinkBy` via `setEslBy(v)`
- [ ] LED colour (prototype-esl mode, duplicate of category-mode control above but different step condition) → select-field (`ledColorOpts`) → `d.ledColour` via `setLedColour(v)`
- [ ] Blink duration (prototype-esl mode) → select-field (`ledDurationOpts`) → `d.ledDuration` via `setLedDuration(v)`
- [ ] Floor labels (promo-map-rank) → text input (comma-separated) → `tplFloorsCsv` (getter/setter over `td.floors`)
- [ ] "You are here" label (promo-map-rank) → text input → `td.youAreHereLabel`
- [ ] Timer seconds (promo-map-rank) → number input → `td.timerSeconds` via `setTplTimer($event)`
- [ ] Finder steps (finder-detail, inherited display when finder-select) → read-only repeating rows → `finderStepLabel(i)`
- [ ] Finder steps (finder-detail, editable when not finder-select) → repeating-list-item text inputs → via `crumbValue(i)` / `setCrumb(i, $event)`
- [ ] Hero Title (finder-detail) → text input → `d.header.title` via `setHeader('title', $event)`
- [ ] Find It label (finder-detail) → text input → `td.findItLabel`
- [ ] Find All label (finder-detail) → text input → `td.findAllLabel`

**Step C total: 26 named controls + 3 repeating-list-item templates (result products with nested
specs/fitments sub-lists, per-leaf individual result products, category-mode hierarchy products) — the
result-products template is the deepest nested repeating structure in the app (product → specs[] AND
fitments[], fitments containing their own image/price/sale-price/article-id fields)**

### Step D — Screensaver (`saver`, step-title "Screensaver")

- [ ] Media → repeating-list-item ("+ Media" via `addSaverMedia()`) → `d.screensaver.media[]` via `removeSaverMedia(i)` (supports image thumb or video thumb, auto-detected via `isVideoDataUrl(m)`)
- [ ] Seconds / slide → number input (min 2) → `d.screensaver.secondsPerSlide`
- [ ] Idle timeout (s) → number input (min 10) → `d.screensaver.idleTimeoutSec`
- [ ] CTA text → text input → `d.screensaver.ctaText`
- [ ] Loop → toggle → `d.screensaver.loop`
- [ ] Shuffle → toggle → `d.screensaver.shuffle`

**Step D total: 5 named controls + 1 repeating-list-item template (screensaver media)**

### Step E — Review (`review`, step-title "Review & Deploy")

- [ ] Review page slider → swipeable read-only preview carousel (all pages) → `reviewPages`, scroll position via `onReviewScroll` / `scrollReviewTo`
- [ ] Summary table → read-only rows (Theme, Mode, Home cards, Intermediate items, Result products, Screensaver media) — 6 rows, not independently editable

**Step E total: 0 editable controls, 1 interactive read-only carousel + 6 read-only summary rows (restyle
only, per spec's Review-step guidance)**

Additional footer-level elements (not step-scoped, present on every content-builder step):
- [ ] Save & Deploy validation modal → read-only list of errors/warnings + "Deploy anyway" button (conditional
      no blocking errors) → `validationOpen`, `valErrors`, `valWarnings`, `valBlocked`, `deployAnyway()`

---

## PART 3 — `card-tree-editor.component.ts` (inline template, recursive)

Renders one level of a `CardItem` tree; recurses into itself for `card.children`. Unbounded depth, capped by
`maxDepth` input from the parent step (e.g. Category mode caps at 4).

- [ ] Sub-item name → text input (per child, repeating) → `child.name` via `[(ngModel)]`
- [ ] Sub-item image → image-upload (thumb, conditional `needsImage`) → `child.image` via `pickImage(child)`
- [ ] Sub-item image Fit → segment (`fitOpts`: cover/contain/fill, conditional image present) → `child.imageFit` via `setFit(child, f)`
- [ ] Move sub-item up → button (disabled at top) → `moveNode(i, -1)`
- [ ] Move sub-item down → button (disabled at bottom) → `moveNode(i, 1)`
- [ ] Remove sub-item → button → `remove(i)`
- [ ] Own result products (leaf nodes only, conditional `allowProducts`) → repeating-list-item → `child.products[]` via `addProduct(child)` / `removeProduct(child, i)` / `moveProduct(child, i, dir)` — sub-fields: image-upload, name input, price input, aisle input
- [ ] Add sub-item → button (disabled at `maxDepth`, label shows max when disabled) → `add()`

**card-tree-editor total: 7 named controls + 1 nested repeating-list-item template (per-leaf result products,
4 sub-fields), recursing into itself once per child (unbounded depth)**

---

## Grand total

| Source | Named controls | Repeating-item templates |
|---|---:|---:|
| Theme wizard (10 steps) | 172 | 0 |
| Content builder (5 step bodies + mode variants) | 89 | 6 |
| card-tree-editor | 7 | 1 |
| **Total** | **268** | **7** |

(Nav-block double-count note: Steps 5 and 7 each list their own 15-row nav block above for completeness —
11 of those 15 in each step point at the *same* `t.nav` fields, so the number of genuinely distinct STATE
properties behind the 30 nav-block rows across both steps is 11 shared + 4 + 4 = 19, not 30. Both steps'
rows must still each appear in their own step's deck + All-settings sheet per the spec, since a user working
step 5 must see and edit them there too — but the migration must wire both to the same underlying fields.)
