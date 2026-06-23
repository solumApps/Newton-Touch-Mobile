import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonProgressBar, IonSpinner, IonToast } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { DeviceService } from '../services/device.service';
import { TransferService, FoundDevice } from '../services/transfer.service';
import { WorkspaceService } from '../services/workspace.service';
import { SessionService } from '../services/session.service';
import { encryptText } from '../services/crypto-util';
import type { LayoutJson, CardItem } from '@contract/layout';

@Component({
  selector: 'app-deploy',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonProgressBar, IonSpinner, IonToast],
  templateUrl: './deploy.component.html',
  styleUrls: ['./deploy.component.scss'],
})
export class DeployComponent implements OnInit, OnDestroy {
  draft?: ContentDraft;
  payload?: LayoutJson;
  sizeKb = 0;

  found: FoundDevice[] = [];
  scanning = false;
  private sub?: Subscription;

  targetName = ''; targetHost = ''; targetPort = 8082;
  manualName = ''; manualIp = '';
  sending = false; percent = 0;
  doneMsg = ''; doneOk = false;
  showToast = false;
  toastMsg = '';
  /** Per-step deploy log surfaced in the UI so users can see what's happening. */
  steps: string[] = [];

  private pushStep(msg: string): void {
    const ts = new Date().toTimeString().slice(0, 8);
    this.steps = [...this.steps, `${ts}  ${msg}`].slice(-30);
  }

  constructor(
    private content: ContentService,
    private deviceSvc: DeviceService,
    private transfer: TransferService,
    private workspace: WorkspaceService,
    private session: SessionService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  get native(): boolean { return this.transfer.isNative; }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.draft = (await this.content.list()).find((d) => d.id === id);
    if (!this.draft) { this.router.navigateByUrl('/tabs/content'); return; }
    this.payload = this.content.build(this.draft);
    this.sizeKb = Math.max(1, Math.round(JSON.stringify(this.payload).length / 1024));
    this.sub = this.transfer.found$.subscribe((list) => (this.found = list));
  }

  /** Auto-stop discovery after this window — user can tap Scan again if not found. */
  private static readonly SCAN_WINDOW_MS = 10000;
  private scanTimer?: ReturnType<typeof setTimeout>;

  ngOnDestroy(): void { this.sub?.unsubscribe(); this.clearScanTimer(); this.transfer.stopScan(); }

  private clearScanTimer(): void {
    if (this.scanTimer) { clearTimeout(this.scanTimer); this.scanTimer = undefined; }
  }

  async toggleScan(): Promise<void> {
    if (this.scanning) { await this.stopScanning(); }
    else {
      this.scanning = true;
      try {
        await this.transfer.startScan();
        // Time-boxed scan: stop automatically after the window instead of
        // draining battery/network until manually stopped.
        this.clearScanTimer();
        this.scanTimer = setTimeout(() => { void this.stopScanning(); }, DeployComponent.SCAN_WINDOW_MS);
      } catch (err: any) {
        this.scanning = false;
        this.toastMsg = "WebSocket connection to 'ws://localhost:8090/' failed: Dev relay is not running.";
        this.showToast = true;
      }
    }
  }

  private async stopScanning(): Promise<void> {
    this.clearScanTimer();
    this.scanning = false;
    try { await this.transfer.stopScan(); } catch { /* */ }
  }

  isTarget(host: string, port: number): boolean { return this.targetHost === host && this.targetPort === port; }
  select(name: string, host: string, port: number): void {
    if (!host) return;
    this.targetName = name; this.targetHost = host; this.targetPort = port;
  }

  /** Pull every data-URI image out of the layout into a separate list, replacing it
   *  with a small `ntimg:<id>` reference — so layout.json stays tiny and images are
   *  sent + stored as files (no base64 bloat → no renderer OOM on the LCD). */
  private externalizeImages(src: LayoutJson, opts: { media?: boolean } = {}): { layout: LayoutJson; images: { id: string; data: string; ext: string }[] } {
    const layout: LayoutJson = JSON.parse(JSON.stringify(src));
    const images: { id: string; data: string; ext: string }[] = [];
    let n = 0;
    /** Parse extension from a data URI ("data:image/png;base64,..." → "png").
     *  Default to "png" if MIME is missing/unknown — the LCD WebView refuses to
     *  serve files without an extension under the `_capacitor_file_` scheme. */
    const extFrom = (uri: string): string => {
      const m = /^data:(?:image|video)\/([a-zA-Z0-9.+-]+)/.exec(uri);
      let raw = (m && m[1] ? m[1] : 'png').toLowerCase();
      if (raw === 'jpeg') raw = 'jpg';
      if (raw === 'svg+xml') raw = 'svg';
      if (raw === 'quicktime') raw = 'mov';
      return raw;
    };
    /** The LCD receiver decodes the payload after the comma as BASE64 binary.
     *  Re-encode utf8/url-encoded data URIs (e.g. `data:image/svg+xml;utf8,…`
     *  used by the built-in sample art) to base64 so the written file isn't
     *  corrupted on the kiosk. Base64 URIs pass through untouched. */
    const toBase64DataUri = (uri: string): string => {
      const comma = uri.indexOf(',');
      if (comma < 0) return uri;
      const head = uri.slice(0, comma);
      if (/;base64$/i.test(head)) return uri;
      const mime = (/^data:([^;,]+)/.exec(head) || [])[1] || 'image/png';
      try {
        const text = decodeURIComponent(uri.slice(comma + 1));
        return `data:${mime};base64,` + btoa(unescape(encodeURIComponent(text)));
      } catch { return uri; }
    };
    const take = (v?: string): string | undefined => {
      if (v && v.startsWith('data:')) { const id = 'img_' + (n++); images.push({ id, data: toBase64DataUri(v), ext: extFrom(v) }); return 'ntimg:' + id; }
      return v;
    };
    const cards = (arr?: CardItem[]) => arr?.forEach((c) => {
      c.image = take(c.image);
      c.products?.forEach((p) => (p.image = take(p.image)));
      if (c.children) cards(c.children);
    });
    cards(layout.home); cards(layout.intermediate);
    layout.theme.backgroundImage = take(layout.theme.backgroundImage);
    layout.theme.intermediate.backgroundImage = take(layout.theme.intermediate.backgroundImage);
    layout.theme.result.backgroundImage = take(layout.theme.result.backgroundImage);
    // Custom nav-button icons (data URIs) ship as ntimg files like other token images.
    if (layout.theme.nav) {
      layout.theme.nav.backIcon = take(layout.theme.nav.backIcon);
      layout.theme.nav.homeIcon = take(layout.theme.nav.homeIcon);
    }
    layout.result.mapImage = take(layout.result.mapImage);
    layout.result.promoImage = take(layout.result.promoImage);
    layout.result.products?.forEach((p) => (p.image = take(p.image)));
    // Per-item result pages (resultMode 'per-item') carry the same media fields —
    // walk each card's ResultContent exactly like the common result above.
    if (layout.itemResults) {
      for (const rc of Object.values(layout.itemResults)) {
        rc.mapImage = take(rc.mapImage);
        rc.promoImage = take(rc.promoImage);
        rc.products?.forEach((p) => (p.image = take(p.image)));
      }
    }
    if (layout.screensaver?.media) layout.screensaver.media = layout.screensaver.media.map((m) => take(m) || m);
    // Externalize the header logo if it's a data URI.
    if (layout.header?.logo) layout.header.logo = take(layout.header.logo);
    // Media mode (appMode 'media'): externalize the image/video to a streamed
    // file so layout.json stays tiny. CRITICAL for video — keeping a multi-MB
    // base64 data URI inline makes the LCD WebView load + decode the whole blob
    // in memory (endless loading → OOM crash on low-end Android). Streamed to
    // disk, the LCD plays it from a file URL (fast, smooth, no decode spike).
    if (opts.media && layout.media?.url) layout.media = { ...layout.media, url: take(layout.media.url)! };
    return { layout, images };
  }

  /** Pause between sends so the LCD's LAN-transfer plugin can flush each file
   *  to disk before the next payload arrives — otherwise the receiver sometimes
   *  reads a 0-byte file on receiveComplete and the image is silently dropped. */
  private readonly SEND_DELAY_MS = 450;
  private sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
  /** Throttle that scales with payload size — big images (e.g. 100KB+) need more
   *  time for the receiver to finish writing to disk before the next TCP connection
   *  opens, otherwise the larger payload is dropped with a transfer error. */
  private delayFor(charLen: number): number {
    return Math.min(2000, this.SEND_DELAY_MS + Math.round(charLen / 350));
  }

  /** Decoded (binary) size of a base64 data URI — sent alongside each image and in
   *  the layout's imageSizes map so the LCD can verify every file on disk. */
  private decodedBytes(dataUri: string): number {
    const comma = dataUri.indexOf(',');
    const b64 = comma >= 0 ? dataUri.slice(comma + 1) : dataUri;
    const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
  }

  /** Inline-fallback caps: each fallback is downscaled/recompressed via canvas and
   *  embedded in layout.json so the LCD can still render every image if a file
   *  transfer is lost or the ref can't be resolved (e.g. browser relay context). */
  private static readonly FALLBACK_MAX_EDGE = 384;
  private static readonly FALLBACK_QUALITY = 0.6;
  private static readonly FALLBACK_MAX_BYTES = 120 * 1024;    // per image (encoded length)
  private static readonly FALLBACK_TOTAL_BYTES = 1024 * 1024; // whole map, keeps layout.json sane

  /** Build a size-capped id → small-data-URI map for layout.imageFallbacks. Images
   *  that can't be compressed under the cap are skipped (file transfer remains the
   *  primary path; the fallback is best-effort delivery insurance). */
  private async buildFallbacks(images: { id: string; data: string }[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    let total = 0;
    for (const img of images) {
      try {
        const uri = img.data.length <= DeployComponent.FALLBACK_MAX_BYTES
          ? img.data
          : await this.compressForFallback(img.data);
        if (!uri || uri.length > DeployComponent.FALLBACK_MAX_BYTES) continue;
        if (total + uri.length > DeployComponent.FALLBACK_TOTAL_BYTES) break;
        out[img.id] = uri;
        total += uri.length;
      } catch { /* skip — fallback is best-effort */ }
    }
    return out;
  }

  /** Canvas downscale + JPEG re-encode for the inline fallback copy. */
  private compressForFallback(dataUri: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const max = DeployComponent.FALLBACK_MAX_EDGE;
          let { width, height } = img;
          if (width > max || height > max) {
            if (width >= height) { height = Math.round((height * max) / width); width = max; }
            else { width = Math.round((width * max) / height); height = max; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', DeployComponent.FALLBACK_QUALITY));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = dataUri;
    });
  }

  async deploy(): Promise<void> {
    if (!this.draft || !this.payload || !this.targetHost) return;

    this.sending = true; this.percent = 0; this.doneMsg = ''; this.steps = [];
    try {
      // Built inside the branch, but sent LAST (after serverConfig) so nothing can
      // clobber the layout transfer — see note before the layout send below.
      let layoutJson = '';
      if (!this.transfer.isNative) {
        // Browser dev (relay): externalize images and send them individually,
        // then send the compact layout — mirrors the native path so the LCD
        // receives every image as a separate message (no multi-MB single frame).
        // Images use fire-and-forget (sendRelayNoAck) because the LCD only
        // sends a deploy_ack after the final layout, not after each image.
        const { layout, images } = this.externalizeImages(this.payload);
        layout.imageManifest = images.map((im) => im.id);
        layout.imageSizes = Object.fromEntries(images.map((im) => [im.id, this.decodedBytes(im.data)]));
        layout.imageFallbacks = await this.buildFallbacks(images);
        const total = images.length + 1;
        this.pushStep(`Preparing ${images.length} image(s) + layout (browser/relay)`);
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const sizeKb = Math.round(img.data.length / 1024);
          this.pushStep(`▸ ${img.id}.${img.ext}  (${sizeKb} KB)…`);
          await this.transfer.sendRelayNoAck(this.targetHost,
            JSON.stringify({ kind: 'image', id: img.id, ext: img.ext, bytes: this.decodedBytes(img.data), data: img.data }));
          this.pushStep(`  ✓ ${img.id} sent`);
          this.percent = Math.round(((i + 1) / total) * 90);
          await this.sleep(this.delayFor(img.data.length));
        }
        layoutJson = JSON.stringify(layout);
      } else {
        // Device: send each image as its own file payload first, then the tiny layout.
        // media:true → video/image streamed to disk (keeps layout.json small; the
        // LCD plays video from a file URL, not an in-memory base64 blob).
        const { layout, images } = this.externalizeImages(this.payload, { media: true });
        // Attach a manifest of expected image ids + decoded sizes so the LCD can
        // verify completeness AND integrity (size match) after the deploy.
        layout.imageManifest = images.map((im) => im.id);
        layout.imageSizes = Object.fromEntries(images.map((im) => [im.id, this.decodedBytes(im.data)]));
        // NOTE: do NOT embed imageFallbacks on native — the LCD resolves images from
        // the ntimg/ files on disk, so the inline fallbacks only bloat layout.json
        // (up to ~1MB) and that oversized payload fails to transfer over real LAN
        // (the layout was being dropped). Keep the native layout small & reliable.
        layout.imageFallbacks = {};
        const total = images.length + 1;
        this.pushStep(`Preparing ${images.length} image(s) + layout`);
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const sizeKb = Math.round(img.data.length / 1024);
          this.pushStep(`▸ ${img.id}.${img.ext}  (${sizeKb} KB)…`);
          await this.transfer.send(this.targetHost, this.targetPort,
            JSON.stringify({ kind: 'image', id: img.id, ext: img.ext, bytes: this.decodedBytes(img.data), data: img.data }), () => {});
          this.pushStep(`  ✓ ${img.id} sent`);
          this.percent = Math.round(((i + 1) / total) * 90);
          // CRITICAL: throttle (scaled by size) so the receiver finishes flushing
          // the previous file before we open a new TCP write. Without enough time,
          // larger payloads are dropped with a transfer error.
          await this.sleep(this.delayFor(img.data.length));
        }
        layoutJson = JSON.stringify(layout);
      }
      // Send serverConfig FIRST (it's only present for Category / +ESL), THEN the
      // layout LAST — so the layout is always the final payload and nothing opens a
      // new connection while it's still in flight (this is exactly why +ESL deploys
      // were dropping layout.json while plain Prototype, which sends no serverConfig,
      // worked). Throttle between each so the receiver flushes one before the next.
      await this.sleep(this.SEND_DELAY_MS);
      if (this.draft.appMode !== 'prototype' && this.draft.appMode !== 'media') {
        const creds = await this.workspace.creds();
        const w = await this.workspace.get();
        if (creds) {
          // Forward CREDENTIALS (not a token) so the LCD logs in and manages its
          // own token lifecycle (generate + refresh) exactly like the sample apps.
          // Username/password are AES-GCM encrypted; the LCD decrypts them.
          const cred = await this.session.getCredentials();
          if (!cred.password) this.pushStep('⚠ No saved password — sign out & sign in again so the LCD can log in to ESL');
          const encUser = await encryptText(cred.username);
          const encPass = await encryptText(cred.password);
          const serverConfig = JSON.stringify({ kind: 'serverConfig', serverUrl: creds.serverUrl, username: encUser, password: encPass, companyId: creds.companyId, storeId: creds.storeId, ledColour: this.draft.ledColour || 'Red', ledDuration: this.draft.ledDuration || '10s', environment: w.environment });
          try { await this.transfer.send(this.targetHost, this.targetPort, serverConfig, () => {}); await this.sleep(this.SEND_DELAY_MS); } catch { /* non-fatal */ }
        }
      }
      // LAYOUT LAST — the final payload, so no other send can clobber it in flight.
      // The LCD applies it on receive and navigates to the home screen.
      this.pushStep('▸ layout.json …');
      await this.transfer.send(this.targetHost, this.targetPort, layoutJson,
        (p) => (this.percent = 90 + Math.round(p * 0.1)));
      this.pushStep('  ✓ layout sent');
      const dev = await this.deviceSvc.upsertReturning(this.targetName, this.targetHost, this.targetPort);
      await this.deviceSvc.recordDeploy(dev.id, this.draft.name);
      this.draft.deployedTo = this.targetName; this.draft.deployedAt = Date.now(); this.draft.status = 'complete';
      await this.content.save(this.draft);
      this.doneOk = true; this.doneMsg = '✓ Deployed to ' + this.targetName;
    } catch (e: any) {
      // Browser with no relay running → fall back to downloading the payload.
      if (!this.transfer.isNative) {
        this.download();
        this.doneOk = false;
        this.doneMsg = (e?.message || 'Relay unavailable') + ' — payload downloaded instead. Start the dev relay (node tools/dev-relay.mjs) to deploy in-browser.';
      } else {
        this.doneOk = false;
        const base = 'Deploy failed: ' + (e?.message || e);
        this.pushStep('✗ ' + (e?.message || e));
        this.doneMsg = base;
        // Probe the network to explain WHY (client isolation / wrong subnet /
        // LCD app not running / transient) — the most actionable part of the UX.
        try {
          const hint = await this.transfer.diagnose(this.targetHost, this.targetPort);
          if (hint) { this.doneMsg = base + ' — ' + hint; this.pushStep('ℹ ' + hint); }
        } catch { /* diagnosis is best-effort */ }
      }
    } finally {
      this.sending = false;
    }
  }

  download(): void {
    if (!this.payload) return;
    const blob = new Blob([JSON.stringify(this.payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'layout.json'; a.click();
    URL.revokeObjectURL(url);
  }

  back(): void { this.router.navigateByUrl('/tabs/content'); }
}
