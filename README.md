# Newton Touch — Mobile App

An offline-capable companion app where a store manager **designs themes**, **creates content**, and **deploys** a `layout.json` to [Newton Touch LCD](https://github.com/solumApps/Newton-Touch-LCD) kiosks over the local network. It is a builder, **not** a live monitoring dashboard.

- **appId:** `com.solum.newtontouch.mobile`
- **Targets:** iOS 15+ / Android 10+ (portrait)
- **Stack:** Angular 20 · Ionic 8 (standalone) · Capacitor 7

---

## Wireframes (design reference)

The UI/UX spec lives in the [`custom-lcd-poc`](https://github.com/solumApps/custom-lcd-poc) repo under `deliverables/`:
- **Viewer:** [`deliverables/index.html`](https://github.com/solumApps/custom-lcd-poc/blob/main/deliverables/index.html) — tabbed viewer (LCD · Mobile · PRD)
- **Mobile wireframe:** [`deliverables/mobile-wireframe.html`](https://github.com/solumApps/custom-lcd-poc/blob/main/deliverables/mobile-wireframe.html)
- **LCD wireframe:** [`deliverables/lcd-wireframe.html`](https://github.com/solumApps/custom-lcd-poc/blob/main/deliverables/lcd-wireframe.html)
- **PRD:** [`deliverables/PRD.html`](https://github.com/solumApps/custom-lcd-poc/blob/main/deliverables/PRD.html)
- Browse all: https://github.com/solumApps/custom-lcd-poc/tree/main/deliverables

---

## How the two apps connect

```
┌────────────────────────┐   builds      ┌──────────────┐   deploy (LAN :8082)   ┌────────────────────┐
│  Mobile (this app)     │ ───────────▶  │ layout.json  │ ─────────────────────▶ │  LCD (Newton Touch) │
│  themes + content      │   produces    │  (<100 KB)   │   atomic, all-or-none  │  renders it          │
└────────────────────────┘               └──────────────┘                        └────────────────────┘
```
- **Shared contract:** `packages/layout-contract/layout.ts` (`LayoutJson`), imported via tsconfig path `@contract/*`.
- A **theme** = pure visuals (`ThemeTokens`). **Content** = theme + app mode + data. `ContentService.build(draft)` compiles them into the `LayoutJson` the LCD renders.
- **App mode lives in Content, not in the theme:** `category` (server API + uploaded images), `prototype` (fully static), `prototype-esl` (static + ESL tag blink at result).
- Transfer uses the [`capacitor-lan-transfer`](https://github.com/solumApps/capacitor-lan-transfer) plugin — NSD scan to discover LCD kiosks, then TCP push to `:8082` with live progress.

---

## Architecture

```
src/app/
  app.component.ts      <ion-app><ion-router-outlet>
  app.routes.ts         hash routing: auth → tabs → wizard/builder/deploy
  tabs/tabs.component    4-tab bottom nav (Themes / Content / Devices / Settings)
  auth/
    environment          pick API environment (Stage00 / KR / EU / US)
    login                POST /common/api/v2/token → session token
    workspace            company + store selection
  pages/
    themes.page          list predefined + My Themes, search, export/import .solumtheme
    content.page         list content drafts (mode / status / deploy badges)
    devices.page         saved devices + NSD discovery
    settings.page        workspace / environment info
  themes/
    theme-wizard         10-step editor (B4–B13) with live preview → save to My Themes
    theme-preview        3-page LCD preview (Home/Intermediate/Result) from tokens
  content/
    content-create       pick theme + pick mode + name → new draft
    content-builder      add Home cards + Result products (+ESL id-map) → Save & Deploy
    deploy               build layout.json, scan/pick device, transfer with progress, download
  services/
    session.service      JWT auth (POST /token), Preferences persistence, auth guard
    theme.service        CRUD themes, default tokens, .solumtheme export/import (version-checked)
    content.service      CRUD drafts, build() → LayoutJson, exportStructure() (no media)
    device.service       device registry + deploy history; NSD scan
    transfer.service     capacitor-lan-transfer: NSD scan + TCP connect/send with progress
    category-api.service real CapacitorHttp GET with creds, mock fallback
    workspace.service    signed-in workspace + API credentials (offline)
    image-picker.service camera/gallery image selection for content items
  settings/
    server-config        API credentials entry + test connection
  shared/
    color-picker         reusable component: presets + native color wheel + hex input
```

### Data model (offline, `@capacitor/preferences`)

| Entity | Key | Fields |
|--------|-----|--------|
| `SavedTheme` | `nt.themes` | `id, name, predefined?, tokens: ThemeTokens` |
| `ContentDraft` | `nt.content` | `id, name, themeId, themeTokens, appMode, home[], intermediate[], result, eslLinks?, eslBlinkBy?, status, deployedTo?, deployedAt?` |
| `SavedDevice` | `nt.devices` | `id, name, ip, port, lastContentName?, lastDeployedAt?` |

### Theme portability

- **Export/import** via `.solumtheme` files (small JSON, no media). Import merges onto defaults — unknown or missing tokens fall back safely.
- **Content export** is structure-only JSON (text + image *references*, no media). Category content re-fetches from the API on import.

---

## User Flow

1. **Auth:** select environment → login (POST /token) → pick company/store → tabs.
2. **Themes tab:** browse predefined + My Themes. **Create New Theme** opens the 10-step wizard (layout, card style, intermediate, result, colors with live preview). Editing a predefined theme auto-clones it. **Export** downloads `.solumtheme`, **Import** loads one back.
3. **Content tab → Create New Content:** pick a theme + app mode + name → **builder**:
   - **Category mode:** fetches from SOLUM API (`GET labels/category`), parses `labelList` (fields: `category1–4` and `etc0–3`, shelf from position), select subset → auto-maps to Home cards + Result products. Field-source picker chooses between category and etc fields.
   - **Prototype mode:** manually add cards and products.
   - **Prototype+ESL mode:** same as Prototype + per-product Article/Label ID + blink-by method.
   - Per-item **image upload** via camera or gallery.
4. **Save & Deploy:** shows payload size, scan for LCD kiosks via NSD or **add by IP** → transfers `layout.json` + `serverConfig` over LAN with live progress % → records deploy history.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode (iOS) / Android Studio (Android)
- [`capacitor-lan-transfer`](https://github.com/solumApps/capacitor-lan-transfer) plugin cloned alongside

### Install & Run (browser)

```bash
npm install
ionic serve            # browser preview at http://localhost:8100
```

**SOLUM API / CORS:** the app ships an Angular dev proxy (`src/proxy.conf.json`, wired in `angular.json`).
A `httpBase()` helper (`services/workspace.service.ts`) routes API calls through `/solum-proxy/*` **on web**
to dodge CORS, and uses the real URL directly **on native** (`CapacitorHttp`, no CORS). Restart `ionic serve`
after editing the proxy config.

### Pairing & deploying in the browser (dev relay)

Browser tabs can't run TCP/NSD, so to test deploy **mobile-tab → LCD-tab** on one machine, run the
dependency-free dev relay (bundled with the app, no npm install needed):

```bash
npm run relay        # → node tools/dev-relay.mjs → ws://localhost:8090
```

Run **one** relay per machine — both the mobile and LCD apps connect to it.

Then in the app: **Devices** (or **Content → Deploy**) → **Scan** → select the LCD → **Deploy**.
Without the relay, Deploy falls back to downloading `layout.json`. On real devices the relay is **not**
used — NSD + TCP handle pairing natively (or use **Add by IP**).

### Build for devices

Angular's `application` builder outputs to `www/` (flattened via `"outputPath": { "base": "www", "browser": "" }`
in `angular.json`). **Always build before syncing**, or `cap` fails with *"www must contain an index.html"*:

```bash
npx ng build                       # generates www/index.html
npx cap add android                # first time only
npx cap sync android
npx cap open android               # or open ios
```

---

## Capacitor Lan Transfer Plugin

### Installation

```bash
npm install github:solumApps/capacitor-lan-transfer
npx cap sync
```

### Required Android permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### Gradle configuration

In the root `build.gradle`:

```gradle
buildscript {
  ext {
    kotlin_version = '1.9.24'
  }
  dependencies {
    classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
  }
}

allprojects {
  configurations.all {
    resolutionStrategy {
      force "org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3"
      force "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
    }
  }
}
```

---

## API Integration

### Authentication

`SessionService.signIn()` sends `POST /common/api/v2/token` to the selected environment base URL. The token is stored via `@capacitor/preferences` and used for all subsequent API calls. `authGuard` protects the `/tabs` routes.

| Environment | Base URL |
|-------------|----------|
| Stage00 | `https://stage00.solum.com` |
| KR | `https://kr.solum.com` |
| EU | `https://eu.solum.com` |
| US | `https://us.solum.com` |

### Category API

`CategoryApiService` fetches product data via `CapacitorHttp` (`GET labels/category`) using the stored API credentials. It parses the `labelList` response and extracts hierarchy fields:
- **Category fields:** `category1`, `category2`, `category3`, `category4`
- **ETC fields:** `etc0`, `etc1`, `etc2`, `etc3`
- **Shelf position:** extracted from `position` field

The builder's **field-source picker** lets the user choose between category and etc fields for mapping products to the Home/Result layout.

### Server config push

On deploy, a `serverConfig` payload is sent alongside `layout.json` containing: `{ token, baseUrl, company, store, ledColour, ledDuration }`. The LCD uses this to authenticate ESL LED blink requests.

---

## Related Repositories

- **LCD app:** [solumApps/Newton-Touch-LCD](https://github.com/solumApps/Newton-Touch-LCD)
- **LAN transfer plugin:** [solumApps/capacitor-lan-transfer](https://github.com/solumApps/capacitor-lan-transfer)
- **Wireframes & shared contract:** [solumApps/custom-lcd-poc](https://github.com/solumApps/custom-lcd-poc)

## Mobile LCD Preview
- Add this inside android/app/src/main/java/com/solum/newtontouch/mobile/MainActivity.java

```
package com.solum.newtontouch.mobile;

import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.appcompat.app.AppCompatDelegate;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        super.onCreate(savedInstanceState);

        // The LCD preview intentionally renders sub-8px type when its 1920x540
        // canvas is scaled down to a phone. Android WebView otherwise clamps
        // those CSS sizes, so changing the preview font rules has no visible
        // effect. Keep normal page typography unchanged while allowing the
        // miniature preview to use its declared pixel sizes.
        WebSettings webSettings = getBridge().getWebView().getSettings();
        webSettings.setTextZoom(100);
        webSettings.setMinimumFontSize(1);
        webSettings.setMinimumLogicalFontSize(1);
    }
}
```