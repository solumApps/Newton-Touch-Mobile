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

- [ ] Arrangement → tile-group (6 states: Columns/Fullscreen/Image strips/Promo categories/Bento grid/Finder select) → `t.homeLayout` via `pickLayout(o)`
- [ ] Overflow scrolling → segment (2 states: Horizontal/Vertical, vertical currently filtered — see note 2) → `t.scrollMode` via `setHomeScroll(m.id)`, read `effectiveScrollMode`
- [ ] Columns / Items → number-stepper (−/number-input/+; label switches "Items"/"Columns") → `t.columns` via `stepColumns(delta)` / `setColumns(v)`, read `effectiveColumns`
- [ ] Finder Select · Title visibility → segment (Show title/Hide title) → `t.intermediate.fsShowPrompt`
- [ ] Finder Select · Title alignment → segment (3 states: left/center/right) → `t.intermediate.fsPromptPos`
- [ ] Finder Select · Card content → segment (`fsCardContents` options) → `t.intermediate.fsCardContent` via `pickFsContent(c.id)`
- [ ] Finder Select · Card shape → tile-group (`cardShapes`, conditional) → `t.intermediate.fsCardShape` via `setFsCardShape(s.id)`
- [ ] Finder Select · Card surface → segment (`cardSurfaces`, 5 states) → `t.cardSurface`
- [ ] Finder Select · Text vertical position → segment (`fsTextVPositions`) → `t.intermediate.fsTextPos`
- [ ] Finder Select · Text horizontal alignment → segment (`cardAligns`, 3 states) → `t.intermediate.fsTextAlign`
- [ ] Finder Select · Item size → slider (0.7–`intItemSizeMax`) → `t.intermediate.itemSizeScale` via `setIntItemSize(v)`
- [ ] Finder Select · Card gap → slider (0–`cardGapMax`) → via `setCardGap(v)`, read `cardGapValue`
- [ ] Card size → slider (0.8–`cardSizeMax`, conditional `sizeMatters`, hidden on finder-select/hero-start) → `t.cardSizeScale` via `setCardSize(v)`
- [ ] Card gap → slider (0–`cardGapMax`, conditional `gapMatters`) → `t.cardGapNum` via `setCardGap(v)`
- [ ] Card alignment → align-grid (3 buttons: left/center/right, conditional `alignMatters`) → `t.cardAlign`
- [ ] Card content → tile-group (`cardContentsFor`) → `t.cardContent` via `pickContent(c.id)`
- [ ] Card shape → tile-group (`availableCardShapes`, conditional not image-strip/not image-only) → `t.cardShape` via `pickShape(s.id)`
- [ ] Card surface → segment (`cardSurfaces`, 5 states) → `t.cardSurface`
- [ ] Text vertical position → segment (`textPositionsFor`, conditional `showTextPos`, hidden on finder-select) → `t.cardTextPos`
- [ ] Text horizontal alignment → segment (`cardAligns`, conditional content≠icon-text) → `t.cardTextAlign`
- [ ] Text Overlay → segment (`homeOverlayStyles`, conditional `overlayRelevant`) → via `setCardOverlay(s.id)`, read `cardOverlayEff`
- [ ] Overlay shape → segment (`overlayShapes`, conditional) → via `setCardOverlayShape(s.id)`, read `cardOverlayShapeEff`
- [ ] Overlay opacity → slider (0–100 step 5, conditional; SHARED with Intermediate step, see note 5) → via `setOverlayOpacity(v)`, read `overlayOpacity`
- [ ] Text shadow → segment (On/Off) → `t.cardTextShadow`
- [ ] Header bar → segment (Show/Hide, hidden on finder-select) → `t.showHeader`
- [ ] Header layout → segment (Preset combos/Custom, conditional `t.showHeader`) → `t.headerLayout`
- [ ] Header style → segment (`headerStyles`, 5 states, conditional `!isCustomHeader`) → `t.headerStyle`
- [ ] Logo position (custom header) → segment (`headerItemPositions`, conditional `isCustomHeader`) → `t.logoPos`
- [ ] Title position (custom header) → segment (`headerItemPositions`) → `t.titlePos`
- [ ] Caption position (custom header) → segment (`headerItemPositions`) → `t.captionPos`
- [ ] Intermediate page → segment (Include/Skip → Result) → `t.includeIntermediate`

**Step 1 total: 30 controls**

### Step 2 — Colors (`colors`, step-title "Colors & branding")

- [ ] Header → color-picker (conditional `t.showHeader`) → `t.headerColor`
- [ ] Header text → color-picker (conditional `t.showHeader`) → `t.headerTextColor`
- [ ] Prompt text → color-picker (conditional finder-select home/intermediate style) → `t.intermediate.promptTextColor`
- [ ] Page background → color-picker (allowGradient, presets `bgPresets`) → `t.background`
- [ ] Upload/Replace home background image → image-upload button → `pickBackground('home')`
- [ ] Clear home background image → button (conditional `t.backgroundImage`) → `clearBackground('home')`
- [ ] Background framing · Pan X → slider (0–100, conditional `t.backgroundImage`) → `t.bgImageX`
- [ ] Background framing · Pan Y → slider (0–100) → `t.bgImageY`
- [ ] Background framing · Zoom → slider (100–300) → `t.bgImageZoom`
- [ ] Card background → color-picker (allowGradient, presets `cardPresets`, conditional not image-only/-text) → `t.cardBackground`
- [ ] Card text → color-picker (presets `textPresets`, conditional not image-only) → `t.cardText`
- [ ] Hero panel → color-picker (presets `heroPanelPresets`, conditional finder-select) → `t.intermediate.heroColor`
- [ ] Text overlay → color-picker (presets `overlayPresets`, conditional `overlayRelevant` or finder-select) → `t.overlayColor`
- [ ] Accent / highlight → color-picker → `t.accent`
- [ ] Logo position → segment (`logoPositions`, 3 states, conditional `t.showHeader && !isCustomHeader`) → `t.logoPosition`

**Step 2 total: 15 controls (9 color-pickers, 2 buttons, 3 sliders, 1 segment)**

### Step 3 — Type (`type`, step-title "Typography & appearance")

- [ ] Font → tile-group (`fonts` = `FONTS` shared list) → `t.typography.fontFamily`
- [ ] Text fit → segment (`textFits`) → `t.typography.textFit`
- [ ] Card label size → slider (0.6–2.0, conditional `showCardTextScaleControl`) → `t.typography.cardTextScaleNum` via `setCardTextScale(v)`
- [ ] Promo message text size → slider (0.6–2.0, conditional `showPromoTypographyControls`) → `t.typography.promoCopyTextScaleNum` via `setPromoCopyTextScale(v)`
- [ ] Promo card label size → slider (0.6–2.0, conditional) → `t.typography.promoCardTextScaleNum` via `setPromoCardTextScale(v)`
- [ ] Intermediate item text size → slider (0.6–2.0, conditional `showIntermediateTextScaleControl`) → `t.typography.intermediateTextScaleNum` via `setIntermediateTextScale(v)`
- [ ] Result text size → slider (0.6–2.0, conditional `showResultTextScaleControl`) → `t.typography.resultTextScaleNum` via `setResultTextScale(v)`
- [ ] Card text case → segment (`textCases`, conditional `showCardTextCaseControl`) → `t.typography.cardTextCase`
- [ ] Header text size → slider (0.6–2.0, conditional `showHeaderTextScaleControl`) → `t.typography.headerTextScaleNum` via `setHeaderTextScale(v)`
- [ ] Header text case → segment (`textCases`) → `t.typography.headerTextCase`

**Step 3 total: 10 controls**

### Step 4 — Intermediate design (`intStyle`, step-title "Intermediate design")

- [ ] Layout style → tile-group (`intStyles`: columns/card-strip/fullscreen/brand-rail/finder-select) → `t.intermediateStyle` via `pickInterStyle(o)`
- [ ] Columns / Visible cards → number-stepper (conditional `intColumnsMatters`) → `t.intermediate.columns`(-like field) via `stepIntColumns(delta)` / `setIntColumns(v)`
- [ ] Overflow scrolling → segment (Vertical/Horizontal) **[HIDDEN — `intScrollMatters && !hideVerticalScroll`, see note 2]** → via `setInterScroll(mode)`, read `effectiveInterScrollMode`
- [ ] Message position (brand-rail) → segment (Left/Right) → `t.intermediate.brandRailMessagePos`
- [ ] Message alignment (brand-rail) → segment (`brandRailValigns`, 3 states) → `t.intermediate.brandRailMessageAlign`
- [ ] Finder Select · Title visibility → segment → `t.intermediate.fsShowPrompt`
- [ ] Finder Select · Title alignment → segment (3 states) → `t.intermediate.fsPromptPos`
- [ ] Finder Select · Back visibility → segment (Show back/Hide back) → `t.intermediate.fsShowBack`
- [ ] Finder Select · Card gap → slider (0–20) → via `setIntCardGap(v)`, read `intCardGapValue`
- [ ] Finder Select · Card content → segment (`fsCardContents`) → `t.intermediate.fsCardContent` via `pickFsContent(c.id)`
- [ ] Finder Select · Card shape → tile-group (`cardShapes`, conditional) → `t.intermediate.fsCardShape` via `setFsCardShape(s.id)`
- [ ] Finder Select · Text vertical position → segment (`fsTextVPositions`, conditional) → `t.intermediate.fsTextPos`
- [ ] Finder Select · Text horizontal alignment → segment (`cardAligns`, conditional) → `t.intermediate.fsTextAlign`
- [ ] Carousel scrolling (fullscreen only) → segment (Horizontal/Vertical carousel) **[HIDDEN — `!hideVerticalScroll`, see note 2]** → via `setInterScroll(mode)`
- [ ] Item size → slider (0.7–`intItemSizeMax`, conditional not drill-stair/card-strip) → `t.intermediate.itemSize`/itemSizeScale via `setIntItemSize(v)`
- [ ] Card gap → slider (0–20, conditional not finder-select/drill-stair/card-strip) → `t.intermediate.cardGapNum` via `setIntCardGap(v)`
- [ ] Card content → segment (`interContentsFor`, conditional `intContentMatters`) → `t.intermediate.content` via `pickInterContent(c.id)`
- [ ] Card shape → tile-group (`interShapesFor`, conditional `intShapeMatters`) → `t.intermediate.cardShape` via `setInterShape(s.id)`
- [ ] Text vertical position → segment (`interTextPositionsFor`, conditional `intTextPosMatters`) → `t.intermediate.textPos`
- [ ] Text horizontal alignment → segment (`cardAligns`, conditional `interTextAlignMatters`) → `t.intermediate.textAlign`
- [ ] Text Overlay → segment (`interOverlayStyles`, conditional `interOverlayRelevant`) → via `setInterOverlay(s.id)`, read `interOverlayEff`
- [ ] Overlay shape → segment (`overlayShapes`, conditional) → via `setInterOverlayShape(s.id)`, read `interOverlayShapeEff`
- [ ] Overlay opacity → slider (0–100 step 5, conditional; SHARED with Home step, see note 5) → via `setOverlayOpacity(v)`, read `overlayOpacity`
- [ ] Text shadow → segment (On/Off, conditional content≠image-only) → `t.intermediate.textShadow`
- [ ] Card alignment → align-grid (up to 6 buttons: left/center/right + top/middle/bottom, conditional `intAlignMatters`) → `t.intermediate.align` / `t.intermediate.valign`
- [ ] Card surface → segment (`cardSurfaces`, conditional not drill-stair; SHARED with Home step) → `t.cardSurface`
- [ ] Header bar → segment (Show/Hide, conditional not finder-select) → `t.intermediate.showHeader`
- [ ] Header tracklist → segment (Show/Hide, conditional `showHeader`) → `t.intermediate.showTracklist`

**Step 4 total: 28 controls (2 currently hidden by `hideVerticalScroll`)**

### Step 5 — Intermediate colors (`intColors`, step-title "Intermediate colors")

- [ ] Header background → color-picker (conditional `t.intermediate.showHeader`) → `t.intermediate.headerColor`
- [ ] Header text color → color-picker (conditional) → `t.intermediate.headerTextColor`
- [ ] Page background → color-picker (presets `bgPresets`) → `t.intermediate.background`
- [ ] Upload/Replace intermediate background image → image-upload button → `pickBackground('inter')`
- [ ] Clear intermediate background image → button (conditional) → `clearBackground('inter')`
- [ ] Background framing · Pan X → slider (0–100, conditional) → `t.intermediate.bgImageX`
- [ ] Background framing · Pan Y → slider (0–100) → `t.intermediate.bgImageY`
- [ ] Background framing · Zoom → slider (100–300) → `t.intermediate.bgImageZoom`
- [ ] Row / card background → color-picker (presets `intCardPresets`, conditional `showInterCardBackgroundColor`) → `t.intermediate.cardBackground`
- [ ] Card text → color-picker (presets `textPresets`, conditional `showInterCardTextColor`) → `t.intermediate.cardText`
- [ ] Hero panel → color-picker (presets `heroPanelPresets`, conditional finder-select) → `t.intermediate.heroColor`
- [ ] Text overlay → color-picker (presets `overlayPresets`, conditional finder-select; note: binds to `t.overlayColor`, the Home-step field, not a dedicated intermediate field) → `t.overlayColor`
- [ ] Message background (brand-rail) → color-picker → `t.intermediate.brandRailMessageBgColor`
- [ ] Message text color (brand-rail) → color-picker → `t.intermediate.brandRailMessageTextColor`
- [ ] Accent / active → color-picker → `t.intermediate.accent`

**Navigation buttons block (conditional `t.intermediateStyle !== 'finder-select'`) — see Structural note 1:**

- [ ] Back · Icon color → color-picker (allowReset, `resetNavColor('backColor')`) → `t.nav.backColor` **[SHARED with Result-colors step]**
- [ ] Back · Background → color-picker (allowReset, `resetNavColor('backBg')`) → `t.nav.backBg` **[SHARED]**
- [ ] Home · Icon color → color-picker (allowReset, `resetNavColor('homeColor')`) → `t.nav.homeColor` **[SHARED]**
- [ ] Home · Background → color-picker (allowReset, `resetNavColor('homeBg')`) → `t.nav.homeBg` **[SHARED]**
- [ ] Button style → segment (`navModes`) → `t.nav.mode` **[SHARED]**
- [ ] Back label → text input (conditional `mode !== 'icon'`) → `t.nav.backLabel` **[SHARED]**
- [ ] Home label → text input (conditional) → `t.nav.homeLabel` **[SHARED]**
- [ ] Button size → segment (`navSizes`) → `t.nav.size` **[SHARED]**
- [ ] Back icon → icon-tile-group (`backNavIconIds` + Default + Upload, conditional `mode !== 'text'`) → `t.nav.backIcon` via `pickNavIcon('back')` **[SHARED]**
- [ ] Home icon → icon-tile-group (`homeNavIconIds` + Default + Upload) → `t.nav.homeIcon` via `pickNavIcon('home')` **[SHARED]**
- [ ] Nav bar style → segment (`navStyles`: Floating/Hidden) → `t.navStyle` **[SHARED]**
- [ ] Button layout → segment (Grouped together/Separate) → `t.intermediate.navSplit` via `setNavSplit('intermediate', bool)` **[INDEPENDENT]**
- [ ] Button position → segment (`navButtonPositions`, 8 states, conditional `!split`) → `t.intermediate.navPosition` via `setNavPosition('intermediate', p.id)` **[INDEPENDENT]**
- [ ] Back position → segment (`navPositionsFor`, conditional `split`) → `t.intermediate.navBackPosition` via `setNavBackPosition('intermediate', p.id)` **[INDEPENDENT]**
- [ ] Home position → segment (conditional `split`) → `t.intermediate.navHomePosition` via `setNavHomePosition('intermediate', p.id)` **[INDEPENDENT]**

**Step 5 total: 30 controls (15 base + 15 nav-block, of which 11 nav-block controls are SHARED state with Result-colors and 4 are independent)**

### Step 6 — Result template (`resTemplate`, step-title "Result template")

- [ ] Template → tile-group (`resultTemplates`: map-list/filter-list/promo-list/product-focus/shelf/finder-detail — 6 selectable; `promo-map-rank` is a 7th legacy value with no tile, see Structural note 3) → `t.resultTemplate` via `pickResultTemplate(o)`
- [ ] Promotion panel toggles (promo-map-rank only) → segment/multi-toggle (Timer/Bell/Ranks/Sort tabs/Zone — 5 independent toggles in one row) → `t.result.showTimer` / `showBell` / `showRanks` / `showSortTabs` / `showZone`
- [ ] Sort tabs (finder-detail only) → multi-select segment (`finderSortOpts`: Recommend/Alphabetical/Low Price/On Sale) → `t.result.sortTabs` via `toggleSortTab(id)`
- [ ] Options · SALE badge (finder-detail only) → toggle → `t.result.showSaleBadge`
- [ ] Filter position (map-filter-list only) → segment (`filterPositions`) → `t.result.filterPos`
- [ ] Card content → segment (`resultContents`: Image+Text/Text only, conditional `resCardContentMatters`) → `t.result.content`
- [ ] Card shape → tile-group (Default + `resShapesFor`, conditional `resShapeMatters` and content=image-text) → `t.result.cardShape`
- [ ] Text position → segment (`cardTextPositions`, conditional `resTextPosMatters` and content=image-text) → `t.result.textPos`
- [ ] Overflow scrolling → segment (`scrollModes`, conditional `resOverflowMatters`) → `t.result.scrollMode` (read via `effectiveResultScrollMode`)

**Step 6 total: 9 controls (2 of which are multi-toggle rows containing 5 and 4 sub-toggles respectively — counted as 1 row each per spec's guidance on multi-state controls, with sub-state counts noted)**

### Step 7 — Result colors (`resColors`, step-title "Result colors")

- [ ] Header → color-picker (transparentValue support, conditional not promo-map-rank/finder-detail) → `t.result.headerColor`
- [ ] Page background → color-picker (presets `bgPresets`, conditional not promo-map-rank, no bg image) → `t.result.background`
- [ ] Upload/Replace result background image → image-upload button (conditional not promo-map-rank) → `pickBackground('result')`
- [ ] Clear result background image → button (conditional) → `clearBackground('result')`
- [ ] Product card background → color-picker (presets `cardPresets`, conditional not finder-detail/hero-product) → `t.result.cardBackground`
- [ ] Card text → color-picker (presets `textPresets`, conditional not hero-product/finder-detail) → `t.result.cardText`
- [ ] Popular button text (map-list only) → color-picker (presets `textPresets`) → `t.result.popularText`
- [ ] Accent / highlight → color-picker (conditional not promo-map-rank/hero-product) → `t.result.accent`
- [ ] Find button (finder-detail only) → color-picker → `t.result.findColor`
- [ ] List background (finder-detail only) → color-picker → `t.result.listBg`
- [ ] Product / detail card (finder-detail only) → color-picker → `t.result.cardBg`
- [ ] Card text (finder-detail only) → color-picker → `t.result.cardTextColor`
- [ ] Promo panel (promo-map-rank only) → color-picker → `t.result.panelColor`
- [ ] Category rail (promo-map-rank only) → color-picker → `t.result.railBg`
- [ ] Sub-category panel (promo-map-rank only) → color-picker → `t.result.subPanelColor`
- [ ] Sub-category text (promo-map-rank only) → color-picker → `t.result.secondaryTextColor`
- [ ] Map pin (promo-map-rank only) → color-picker → `t.result.pinColor`
- [ ] Location dots (promo-map-rank only) → color-picker → `t.result.dotColor`
- [ ] Map area (promo-map-rank only) → color-picker → `t.result.mapBg`
- [ ] Header bar → segment (Show/Hide, conditional not finder-detail) → `t.result.showHeader`
- [ ] Header tracklist → segment (Show/Hide, conditional `showHeader`) → `t.result.showTracklist`

**Navigation buttons block (unconditional on this step) — same shared/independent split as Step 5, see Structural note 1:**

- [ ] Back · Icon color → color-picker → `t.nav.backColor` **[SHARED with Intermediate-colors step]**
- [ ] Back · Background → color-picker → `t.nav.backBg` **[SHARED]**
- [ ] Home · Icon color → color-picker → `t.nav.homeColor` **[SHARED]**
- [ ] Home · Background → color-picker → `t.nav.homeBg` **[SHARED]**
- [ ] Button style → segment (`navModes`) → `t.nav.mode` **[SHARED]**
- [ ] Back label → text input (conditional) → `t.nav.backLabel` **[SHARED]**
- [ ] Home label → text input (conditional) → `t.nav.homeLabel` **[SHARED]**
- [ ] Button size → segment (`navSizes`) → `t.nav.size` **[SHARED]**
- [ ] Back icon → icon-tile-group → `t.nav.backIcon` via `pickNavIcon('back')` **[SHARED]**
- [ ] Home icon → icon-tile-group → `t.nav.homeIcon` via `pickNavIcon('home')` **[SHARED]**
- [ ] Nav bar style → segment (`navStyles`) → `t.navStyle` **[SHARED]**
- [ ] Button layout → segment → `t.result.navSplit` via `setNavSplit('result', bool)` **[INDEPENDENT]**
- [ ] Button position → segment (conditional `!split`) → `t.result.navPosition` via `setNavPosition('result', p.id)` **[INDEPENDENT]**
- [ ] Back position → segment (conditional `split`) → `t.result.navBackPosition` via `setNavBackPosition('result', p.id)` **[INDEPENDENT]**
- [ ] Home position → segment (conditional `split`) → `t.result.navHomePosition` via `setNavHomePosition('result', p.id)` **[INDEPENDENT]**

**Step 7 total: 35 controls (21 base color/header rows + 15 nav-block, minus 1 dup — 20 base + 15 nav = 35; nav-block shared/independent split identical to Step 5)**

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
