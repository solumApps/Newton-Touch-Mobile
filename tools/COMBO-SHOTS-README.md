# Newton Touch — Combo-Shots Scripts

Two Playwright scripts that screenshot every theme/content combination so the team can visually QA layouts without clicking through the app manually.

| Script | Output folder | What it captures |
|---|---|---|
| `tools/theme-combo-shots.mjs` | `combo-shots/` | Theme wizard preview — placeholder image blocks across all layout/shape/surface/intermediate/result/header combos |
| `tools/content-combo-shots.mjs` | `content-shots/` | Content builder preview — real dummy images across the same full set of combos |

---

## Prerequisites (one-time, per laptop)

### 1. Node 18+
```bash
node -v   # should be 18.x or higher
```
If not, install from https://nodejs.org or via `nvm`.

### 2. Install dependencies (if not already done)
```bash
cd apps/newtontouch-mobile
npm install
```

### 3. Install Playwright's Chromium browser
```bash
npx playwright install chromium
```

---

## Running the scripts

### Step 1 — Start the dev server
Open a terminal and leave it running:
```bash
cd apps/newtontouch-mobile
npm start          # or: ionic serve
```
Wait until you see `Compiled successfully` (or the app opens in your browser at http://localhost:8100).

> **Important:** Use the dev server, NOT a production build. The scripts use Angular's `window.ng` dev API which is only available in dev mode.

### Step 2 — Run a script
Open a **second** terminal:

```bash
cd apps/newtontouch-mobile

# Theme wizard combos → saved to ./combo-shots/
node tools/theme-combo-shots.mjs

# Content builder combos → saved to ./content-shots/
node tools/content-combo-shots.mjs
```

Both scripts will print a `✓ filename.png` line for each successful screenshot and `✗ combo-id` for any failures. When done they print a summary and the output path.

---

## Options

All options are set via environment variables — no flags needed.

| Variable | Default | Example |
|---|---|---|
| `BASE` | `http://localhost:8100` | `BASE=http://192.168.1.5:8100` |
| `OUT` | `./combo-shots` or `./content-shots` | `OUT=/tmp/shots` |
| `FILTER` | *(all combos)* | `FILTER=home_grid,result` |
| `HEADED` | headless | `HEADED=1` (shows the browser window) |

### Example: run only result-page combos
```bash
FILTER=result node tools/content-combo-shots.mjs
```

### Example: watch the browser while it runs
```bash
HEADED=1 FILTER=surface node tools/theme-combo-shots.mjs
```

### Example: custom output folder
```bash
OUT=~/Desktop/shots node tools/content-combo-shots.mjs
```

---

## Output files

After a run, the output folder contains:

- `NNN_combo-id__page.png` — one screenshot per combo × page (e.g. `042_home_circle_image-text_below__home.png`)
- `manifest.json` — machine-readable index of every shot and its token values
- `manifest.csv` — same data, open in Excel/Sheets to filter/flag bad combos
- `_debug.png` — only created when the app can't be found; helps diagnose setup issues

---

## How many screenshots to expect

| Script | ~Total shots |
|---|---|
| `theme-combo-shots.mjs` | ~260 |
| `content-combo-shots.mjs` | ~260 |

Exact count depends on which combos produce visible pages (e.g. intermediate/result pages are only shot when the combo targets them).

---

## Troubleshooting

**"window.ng not found"**
→ You ran a production build. Use `npm start` / `ionic serve`, not `ng build`.

**"Could not find `<app-theme-wizard>`"**
→ The app may have redirected away. Check `_debug.png` in the output folder and confirm the dev server is running and the route `/theme-wizard` opens in your browser.

**A combo shows `✗` but not all fail**
→ That specific combo hit a render error. Note the combo ID, check the manifest.csv row, and share with the dev who owns that layout.

**Script hangs / very slow**
→ Normal for 200+ shots — expect 5–15 minutes. Add `FILTER=` to run a subset while debugging.

**Port 8100 already in use**
→ Another process is using the port. Kill it or set `BASE=http://localhost:4200` if you used `ng serve` directly.

---

## Adding new combos

All option lists are defined at the top of each script (e.g. `homeLayouts`, `shapes`, `resultTemplates`). To add a new option:
1. Add it to the relevant array.
2. Re-run the script — the new combo IDs will appear automatically.
