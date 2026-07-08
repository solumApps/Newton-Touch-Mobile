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
    let creds: any; try { creds = await this.workspace.creds(); } catch { creds = undefined; }
    this.payload = this.content.build(this.draft, creds);
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
  private externalizeImages(src: LayoutJson, opts: { media?: boolean } = {}): { layout: LayoutJson; images: { id: string; data: string; ext: string }[]; videos: { id: string; data: string; ext: string }[]; media?: { id: string; data: string; ext: string } } {
    const layout: LayoutJson = JSON.parse(JSON.stringify(src));
    const images: { id: string; data: string; ext: string }[] = [];
    // Videos travel as a separate chunked stream so multi-MB base64 never hits the
    // native bridge / relay WebSocket as one giant frame (OOM + MP4 corruption).
    const videos: { id: string; data: string; ext: string }[] = [];
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
    // Screensaver media may include `data:video/*` blobs — route those to the
    // chunked stream instead of the one-shot images[] channel.
    const takeMaybeVideo = (v?: string): string | undefined => {
      if (v && v.startsWith('data:video/')) {
        const id = 'img_' + (n++);
        videos.push({ id, data: toBase64DataUri(v), ext: extFrom(v) });
        return 'ntimg:' + id;
      }
      return take(v);
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
    if (layout.screensaver?.media) layout.screensaver.media = layout.screensaver.media.map((m) => takeMaybeVideo(m) || m);
    // Externalize the header logo if it's a data URI.
    if (layout.header?.logo) layout.header.logo = take(layout.header.logo);
    const canvas = (c?: { elements?: { src?: string }[] }) => {
      c?.elements?.forEach((el) => {
        el.src = takeMaybeVideo(el.src);
      });
    };
    canvas(layout.customCanvas);
    canvas(layout.productPromo);
    // Media mode (appMode 'media'): externalize the image/video to a SEPARATE
    // streamed blob (not the images[] array — that one ships each file in a
    // single message, and a multi-MB video as one base64 string OOM-crashes the
    // low-end LCD's V8 heap on receive). The native deploy path sends this blob
    // in small chunks instead. layout.json keeps only a tiny ntimg: ref.
    let media: { id: string; data: string; ext: string } | undefined;
    if (opts.media && layout.media?.url && layout.media.url.startsWith('data:')) {
      const id = 'img_' + (n++);
      media = { id, data: toBase64DataUri(layout.media.url), ext: extFrom(layout.media.url) };
      layout.media = { ...layout.media, url: 'ntimg:' + id };
    }
    return { layout, images, videos, media };
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

  private async sendDeploySessionStart(totalPayloads: number): Promise<void> {
    const msg = JSON.stringify({
      kind: 'deploySession',
      action: 'start',
      totalPayloads: Math.max(1, totalPayloads),
      contentName: this.draft?.name || 'Receiving content',
    });
    try {
      if (this.transfer.isNative) await this.transfer.send(this.targetHost, this.targetPort, msg, () => {});
      else await this.transfer.sendRelayNoAck(this.targetHost, msg);
      await this.sleep(this.SEND_DELAY_MS);
    } catch {
      this.pushStep('⚠ Display did not acknowledge deploy-session progress; continuing deploy');
    }
  }

  /** Stream a media blob (image/video) to the LCD in small base64 chunks so its
   *  V8 heap never holds the whole multi-MB string (the OOM crash). Each chunk's
   *  base64 length is a multiple of 4, so the receiver can decode + append it to
   *  ntimg/<id>.<ext> standalone. Native LAN path only (browser keeps media
   *  inline → Blob URL). */
  private async sendMediaChunks(media: { id: string; data: string; ext: string }): Promise<void> {
    return this.sendMediaChunked(media, (json) =>
      this.transfer.send(this.targetHost, this.targetPort, json, () => {}));
  }

  /** Browser/relay sibling of sendMediaChunks — same `kind:'imageChunk'` envelope
   *  the receiver already understands, shipped through the dev-relay WebSocket. */
  private async sendMediaChunksRelay(media: { id: string; data: string; ext: string }): Promise<void> {
    return this.sendMediaChunked(media, (json) =>
      this.transfer.sendRelayNoAck(this.targetHost, json));
  }

  /** Loop body shared by sendMediaChunks / sendMediaChunksRelay. */
  private async sendMediaChunked(media: { id: string; data: string; ext: string }, sendJson: (json: string) => Promise<void>): Promise<void> {
    const comma = media.data.indexOf(',');
    const b64 = comma >= 0 ? media.data.slice(comma + 1) : media.data;
    // 1 MB slices (multiple of 4). A 1 MB string is trivial for V8 — the OOM was
    // the WHOLE multi-MB blob, not a slice — so larger chunks + a small fixed
    // gap (appendFile is fast) make a 9 MB video deploy in ~9 quick writes.
    const CHUNK = 1024 * 1024;                              // 1048576 — multiple of 4
    const total = Math.max(1, Math.ceil(b64.length / CHUNK));
    const kb = Math.round((b64.length * 0.75) / 1024);
    this.pushStep(`▸ media ${media.id}.${media.ext} — ${total} chunk(s), ${kb} KB`);
    for (let seq = 0; seq < total; seq++) {
      const slice = b64.slice(seq * CHUNK, (seq + 1) * CHUNK);
      const last = seq === total - 1;
      await sendJson(JSON.stringify({ kind: 'imageChunk', id: media.id, ext: media.ext, seq, total, last, data: slice, bytes: last ? this.decodedBytes(media.data) : undefined }));
      this.percent = Math.min(89, Math.round(((seq + 1) / total) * 88));
      await this.sleep(120);                                // small flush gap; append is cheap
    }
    this.pushStep(`  ✓ media sent (${total} chunk(s))`);
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

  private isBundledAsset(value?: string): value is string {
    return !!value && !value.startsWith('data:') && !value.startsWith('blob:') && !value.startsWith('http://') && !value.startsWith('https://') && value.indexOf('assets/') === 0;
  }

  private assetCache = new Map<string, Promise<string | undefined>>();

  private assetToDataUri(path: string): Promise<string | undefined> {
    const cached = this.assetCache.get(path);
    if (cached) return cached;
    const pending = (async () => {
      try {
        const res = await fetch(path);
        if (!res.ok) return undefined;
        const blob = await res.blob();
        return await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(blob);
        });
      } catch {
        return undefined;
      }
    })();
    this.assetCache.set(path, pending);
    return pending;
  }

  private async inlineBundledAssets(src: LayoutJson): Promise<LayoutJson> {
    const layout: LayoutJson = JSON.parse(JSON.stringify(src));
    const swap = async (value?: string): Promise<string | undefined> => {
      if (!this.isBundledAsset(value)) return value;
      return await this.assetToDataUri(value) || value;
    };
    const cards = async (arr?: CardItem[]): Promise<void> => {
      if (!arr?.length) return;
      for (const c of arr) {
        c.image = await swap(c.image);
        if (c.products?.length) {
          for (const p of c.products) p.image = await swap(p.image);
        }
        if (c.children?.length) await cards(c.children);
      }
    };
    await cards(layout.home);
    await cards(layout.intermediate);
    layout.theme.backgroundImage = await swap(layout.theme.backgroundImage);
    layout.theme.intermediate.backgroundImage = await swap(layout.theme.intermediate.backgroundImage);
    layout.theme.result.backgroundImage = await swap(layout.theme.result.backgroundImage);
    if (layout.theme.nav) {
      layout.theme.nav.backIcon = await swap(layout.theme.nav.backIcon);
      layout.theme.nav.homeIcon = await swap(layout.theme.nav.homeIcon);
    }
    layout.result.mapImage = await swap(layout.result.mapImage);
    layout.result.promoImage = await swap(layout.result.promoImage);
    if (layout.result.products?.length) {
      for (const p of layout.result.products) p.image = await swap(p.image);
    }
    if (layout.itemResults) {
      for (const rc of Object.values(layout.itemResults)) {
        rc.mapImage = await swap(rc.mapImage);
        rc.promoImage = await swap(rc.promoImage);
        if (rc.products?.length) {
          for (const p of rc.products) p.image = await swap(p.image);
        }
      }
    }
    if (layout.screensaver?.media?.length) {
      layout.screensaver.media = await Promise.all(layout.screensaver.media.map((m) => swap(m).then((v) => v || m)));
    }
    if (layout.header?.logo) layout.header.logo = await swap(layout.header.logo);
    const canvas = async (c?: { elements?: { src?: string }[] }): Promise<void> => {
      if (!c?.elements?.length) return;
      for (const el of c.elements) el.src = await swap(el.src);
    };
    await canvas(layout.customCanvas);
    await canvas(layout.productPromo);
    if (layout.media?.url) layout.media.url = await swap(layout.media.url) || layout.media.url;
    return layout;
  }

  async deploy(): Promise<void> {
    if (!this.draft || !this.payload || !this.targetHost) return;

    this.sending = true; this.percent = 0; this.doneMsg = ''; this.steps = [];
    try {
      const needsServerConfig = this.draft.appMode !== 'prototype'
        && this.draft.appMode !== 'media'
        && this.draft.appMode !== 'custom-canvas'
        && this.draft.appMode !== 'product-promo';
      let serverConfig = '';
      let serverConfigSummary = '';
      if (needsServerConfig) {
        const creds = await this.workspace.creds();
        const w = await this.workspace.get();
        if (creds) {
          const cred = await this.session.getCredentials();
          if (!cred.password) this.pushStep('⚠ No saved password — sign out & sign in again so the LCD can log in to ESL');
          const encUser = await encryptText(cred.username);
          const encPass = await encryptText(cred.password);
          serverConfigSummary = `server=${creds.serverUrl} company=${creds.companyId} store=${creds.storeId}`;
          serverConfig = JSON.stringify({ kind: 'serverConfig', serverUrl: creds.serverUrl, username: encUser, password: encPass, companyId: creds.companyId, storeId: creds.storeId, ledColour: this.draft.ledColour || 'Red', ledDuration: this.draft.ledDuration || '10s', environment: w.environment });
        }
      }
      // Built inside the branch, but sent LAST (after serverConfig) so nothing can
      // clobber the layout transfer — see note before the layout send below.
      let layoutJson = '';
      const payload = await this.inlineBundledAssets(this.payload);
      if (!this.transfer.isNative) {
        // Browser dev (relay): externalize images and send them individually,
        // then send the compact layout — mirrors the native path so the LCD
        // receives every image as a separate message (no multi-MB single frame).
        // Images use fire-and-forget (sendRelayNoAck) because the LCD only
        // sends a deploy_ack after the final layout, not after each image.
        const { layout, images, videos } = this.externalizeImages(payload);
        layout.imageManifest = [...images.map((im) => im.id), ...videos.map((vm) => vm.id)];
        layout.imageSizes = Object.fromEntries(
          [...images, ...videos].map((im) => [im.id, this.decodedBytes(im.data)]),
        );
        layout.imageFallbacks = await this.buildFallbacks(images);
        const total = images.length + videos.length + 1;
        await this.sendDeploySessionStart(total + (serverConfig ? 1 : 0));
        this.pushStep(`Preparing ${images.length} image(s)${videos.length ? ` + ${videos.length} video(s)` : ''} + layout (browser/relay)`);
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
        // Screensaver videos: chunked over the relay so neither the WebSocket frame
        // nor the LCD V8 heap ever holds the whole multi-MB blob at once.
        for (let i = 0; i < videos.length; i++) {
          await this.sendMediaChunksRelay(videos[i]);
          this.percent = Math.round(((images.length + i + 1) / total) * 90);
          await this.sleep(this.SEND_DELAY_MS);
        }
        layoutJson = JSON.stringify(layout);
      } else {
        // Device: send each image as its own file payload first, then the tiny layout.
        // media:true → video/image streamed to disk (keeps layout.json small; the
        // LCD plays video from a file URL, not an in-memory base64 blob).
        const { layout, images, videos, media } = this.externalizeImages(payload, { media: true });
        // Attach a manifest of expected image ids + decoded sizes so the LCD can
        // verify completeness AND integrity (size match) after the deploy.
        layout.imageManifest = [
          ...images.map((im) => im.id),
          ...videos.map((vm) => vm.id),
          ...(media ? [media.id] : []),
        ];
        layout.imageSizes = Object.fromEntries(
          [...images, ...videos, ...(media ? [media] : [])].map((im) => [im.id, this.decodedBytes(im.data)]),
        );
        // NOTE: do NOT embed imageFallbacks on native — the LCD resolves images from
        // the ntimg/ files on disk, so the inline fallbacks only bloat layout.json
        // (up to ~1MB) and that oversized payload fails to transfer over real LAN
        // (the layout was being dropped). Keep the native layout small & reliable.
        layout.imageFallbacks = {};
        const total = images.length + videos.length + 1;
        const sessionPayloads = images.length + (videos.length * 2) + (media ? 2 : 0) + (serverConfig ? 1 : 0) + 1;
        await this.sendDeploySessionStart(sessionPayloads);
        this.pushStep(`Preparing ${images.length} image(s)${videos.length ? ` + ${videos.length} video(s)` : ''} + layout`);
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
        // Screensaver videos: RAW BINARY via mediaMeta + sendBinary (the same
        // proven path as appMode='media'). The chunked base64 path corrupted the
        // MP4 on the LCD (FFmpegDemuxer: open context failed) because per-chunk
        // appendFile decode left the file misaligned.
        for (let i = 0; i < videos.length; i++) {
          const v = videos[i];
          const comma = v.data.indexOf(',');
          const b64 = comma >= 0 ? v.data.slice(comma + 1) : v.data;
          this.pushStep(`▸ video ${v.id}.${v.ext} (${Math.round((b64.length * 0.75) / 1024)} KB)…`);
          await this.transfer.send(this.targetHost, this.targetPort,
            JSON.stringify({ kind: 'mediaMeta', id: v.id, ext: v.ext, bytes: this.decodedBytes(v.data) }), () => {});
          await this.sleep(this.SEND_DELAY_MS);
          await this.transfer.sendBinary(this.targetHost, this.targetPort, b64, (p) => (this.percent = Math.min(89, p)));
          this.pushStep(`  ✓ ${v.id} sent`);
          this.percent = Math.min(89, Math.round(((images.length + i + 1) / total) * 90));
          await this.sleep(1500);
        }
        // Media (image/video) is sent as RAW BINARY: a small JSON 'mediaMeta'
        // announces the id/ext, then the bytes go via sendBinary (the plugin
        // decodes base64 → streams binary → the LCD writes byte-exact to disk).
        // This avoids base64 reassembly on the receiver (which corrupted the MP4)
        // AND the V8 OOM (the LCD never holds the blob in JS). Layout is sent LAST.
        if (media) {
          const comma = media.data.indexOf(',');
          const b64 = comma >= 0 ? media.data.slice(comma + 1) : media.data;
          this.pushStep(`▸ media ${media.id}.${media.ext} (${Math.round((b64.length * 0.75) / 1024)} KB)…`);
          await this.transfer.send(this.targetHost, this.targetPort,
            JSON.stringify({ kind: 'mediaMeta', id: media.id, ext: media.ext, bytes: this.decodedBytes(media.data) }), () => {});
          await this.sleep(this.SEND_DELAY_MS);
          await this.transfer.sendBinary(this.targetHost, this.targetPort, b64, (p) => (this.percent = Math.min(89, p)));
          this.pushStep('  ✓ media sent');
          await this.sleep(1500);
        }
        layoutJson = JSON.stringify(layout);
      }
      // Send serverConfig FIRST (it's only present for Category / +ESL), THEN the
      // layout LAST — so the layout is always the final payload and nothing opens a
      // new connection while it's still in flight (this is exactly why +ESL deploys
      // were dropping layout.json while plain Prototype, which sends no serverConfig,
      // worked). Throttle between each so the receiver flushes one before the next.
      await this.sleep(this.SEND_DELAY_MS);
      if (needsServerConfig) {
        if (serverConfig) {
          this.pushStep(`▸ serverConfig … (encrypted creds, NO token · ${serverConfigSummary})`);
          if (this.draft.appMode === 'category') this.pushStep(`  • category: LED ${this.draft.ledColour || 'Red'}/${this.draft.ledDuration || '10s'} · LCD will self-login + fetch category API on load`);
          try { await this.transfer.send(this.targetHost, this.targetPort, serverConfig, () => {}); await this.sleep(this.SEND_DELAY_MS); this.pushStep('  ✓ serverConfig sent'); }
          catch { this.pushStep('  ⚠ serverConfig send failed (non-fatal)'); }
        } else {
          this.pushStep('⚠ No server credentials — sign in so the LCD can fetch live data');
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
