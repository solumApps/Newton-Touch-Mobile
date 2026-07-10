import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';

export interface FoundDevice {
  name: string;        // NSD instance name
  host: string;
  port: number;
  deviceName?: string;
  storeId?: string;
  /** How the device was discovered: 'mdns' (NSD/Bonjour) or 'udp' (broadcast fallback). */
  via?: string;
}

/**
 * Mobile side of the LAN transfer (wraps capacitor-lan-transfer).
 * - scan(): NSD discovery → live list of advertising LCDs (distinguished by name/TXT).
 * - deploy(): connect by IP:port → sendString(layout.json) with live % → resolves on send_complete.
 * Manual IP is just deploy() with a typed host. Native-only; web throws (deploy screen
 * falls back to downloading the payload).
 */
const RELAY_URL = 'ws://localhost:8090';   // DEV browser-pairing relay (tools/dev-relay.mjs)

@Injectable({ providedIn: 'root' })
export class TransferService {
  readonly found$ = new BehaviorSubject<FoundDevice[]>([]);
  private listeners: Array<{ remove: () => Promise<void> }> = [];
  private ws?: WebSocket;
  /** FIFO of pending relay deploy_acks. A queue (not a single field) so that
   *  rapid/overlapping send() calls can't clobber each other's ack resolver —
   *  a previous send's ackResolve being overwritten was leaving it hung until
   *  its own timeout, which surfaced as a stuck deploy on the next attempt. */
  private pendingAcks: Array<() => void> = [];

  constructor(private zone: NgZone) { }

  get isNative(): boolean { return Capacitor.isNativePlatform(); }

  /** DEV: connect to the local relay (browser pairing). Rejects if it isn't running. */
  private ensureRelay(): Promise<WebSocket> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve(this.ws);
    return new Promise((resolve, reject) => {
      let ws: WebSocket;
      try { ws = new WebSocket(RELAY_URL); } catch { reject(new Error('relay unavailable')); return; }
      const to = setTimeout(() => { try { ws.close(); } catch { /* */ } reject(new Error('Dev relay not running on ws://localhost:8090')); }, 2500);
      ws.onopen = () => { clearTimeout(to); this.ws = ws; ws.send(JSON.stringify({ type: 'hello', role: 'sender' })); resolve(ws); };
      ws.onerror = () => { clearTimeout(to); reject(new Error('Cannot reach dev relay on ws://localhost:8090')); };
      ws.onclose = () => { if (this.ws === ws) { this.ws = undefined; this.pendingAcks = []; } };
      ws.onmessage = (m) => {
        let msg: any; try { msg = JSON.parse(m.data); } catch { return; }
        if (msg.type === 'devices') {
          // Dedupe by id — the relay may report the same display more than once
          // (multiple announce frames / reconnects), which would otherwise render
          // duplicate rows in the Deploy device list.
          const seen = new Set<string>();
          const devices = (msg.devices || [])
            .filter((d: any) => { const k = String(d.id); if (seen.has(k)) return false; seen.add(k); return true; })
            .map((d: any) => ({ name: d.id, host: d.id, port: 8090, deviceName: d.deviceName, storeId: d.code }));
          this.found$.next(devices);
        } else if (msg.type === 'deploy_ack') {
          this.pendingAcks.shift()?.();
        }
      };
    });
  }

  async startScan(): Promise<void> {
    if (!this.isNative) {
      this.found$.next([]);
      const ws = await this.ensureRelay();
      ws.send(JSON.stringify({ type: 'list' }));
      return;
    }
    this.found$.next([]);
    const { LanTransfer } = await import('capacitor-lan-transfer');
    this.listeners.push(await (LanTransfer as any).addListener('deviceFound', (e: any) => {
      // Capacitor plugin callbacks fire outside Angular's NgZone on Android.
      // Without zone.run(), BehaviorSubject.next() changes state but Angular
      // never schedules a re-render, so the device list stays blank on-screen.
      this.zone.run(() => {
        const dev: FoundDevice = { name: e.name, host: e.host, port: e.port, deviceName: e.deviceName, storeId: e.storeId, via: e.via };
        const list = this.found$.value.filter((d) => d.name !== dev.name);
        list.push(dev);
        this.found$.next(list);
      });
    }));
    this.listeners.push(await (LanTransfer as any).addListener('deviceLost', (e: any) => {
      this.zone.run(() => {
        this.found$.next(this.found$.value.filter((d) => d.name !== e.name));
      });
    }));
    await (LanTransfer as any).startDiscovery();
  }

  async stopScan(): Promise<void> {
    if (!this.isNative) return;   // relay scan is passive (push-based); nothing to stop
    const { LanTransfer } = await import('capacitor-lan-transfer');
    try { await (LanTransfer as any).stopDiscovery(); } catch { /* */ }
    for (const l of this.listeners) { try { await l.remove(); } catch { /* */ } }
    this.listeners = [];
  }

  /** Connect + send a string payload (layout.json or serverConfig). Resolves on send_complete.
   *  Native path retries up to 3 times with backoff (800/1600 ms) and aborts an
   *  attempt if no progress/completion arrives within an activity timeout. */
  async send(host: string, port: number, text: string, onPercent: (p: number) => void): Promise<void> {
    if (!this.isNative) {
      // Browser dev: push through the relay to the target receiver id (host == LCD id).
      const ws = await this.ensureRelay();
      onPercent(20);
      return new Promise<void>((resolve, reject) => {
        // Scale timeout with payload size: 8 s base + 2 s per 100 KB.
        const timeoutMs = 8000 + Math.ceil(text.length / 102400) * 2000;
        const resolveAck = () => { clearTimeout(timer); onPercent(100); resolve(); };
        const timer = setTimeout(() => {
          const idx = this.pendingAcks.indexOf(resolveAck);
          if (idx >= 0) this.pendingAcks.splice(idx, 1);
          reject(new Error('No ack from display — is the LCD tab open & connected to the relay?'));
        }, timeoutMs);
        this.pendingAcks.push(resolveAck);
        try { ws.send(JSON.stringify({ type: 'deploy', to: host, payload: text })); onPercent(60); }
        catch (e) {
          clearTimeout(timer);
          const idx = this.pendingAcks.indexOf(resolveAck);
          if (idx >= 0) this.pendingAcks.splice(idx, 1);
          reject(e as Error);
        }
      });
    }
    const MAX_ATTEMPTS = 3;
    let lastErr: any;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.sendOnce(host, port, text, onPercent);
        return;
      } catch (e: any) {
        lastErr = e;
        if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 800 * attempt));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr?.message || lastErr || 'transfer failed'));
  }

  /** One native connect→send attempt with an activity watchdog: the timer re-arms
   *  on every progress event, so a slow-but-moving transfer never times out while
   *  a stalled one fails fast (12 s base + 1 s per 100 KB of payload). */
  private async sendOnce(host: string, port: number, text: string, onPercent: (p: number) => void): Promise<void> {
    const { LanTransfer } = await import('capacitor-lan-transfer');
    const idleTimeoutMs = 12000 + Math.ceil(text.length / 102400) * 1000;
    return new Promise<void>(async (resolve, reject) => {
      const subs: Array<{ remove: () => Promise<void> }> = [];
      let settled = false;
      let watchdog: any;
      const cleanup = async () => {
        clearTimeout(watchdog);
        for (const s of subs) { try { await s.remove(); } catch { /* */ } }
      };
      const fail = async (err: Error) => { if (settled) return; settled = true; await cleanup(); reject(err); };
      const ok = async () => { if (settled) return; settled = true; await cleanup(); resolve(); };
      const armWatchdog = () => {
        clearTimeout(watchdog);
        watchdog = setTimeout(() => fail(new Error(`Transfer stalled — no data for ${Math.round(idleTimeoutMs / 1000)}s`)), idleTimeoutMs);
      };
      armWatchdog();
      try {
        subs.push(await LanTransfer.addListener('progress', (e: any) => {
          if (e.direction === 'send') { armWatchdog(); onPercent(Math.round(e.percent)); }
        }));
        subs.push(await LanTransfer.addListener('status', (e: any) => { if (e.status === 'send_complete') ok(); }));
        subs.push(await LanTransfer.addListener('error', (e: any) => fail(new Error(e.message || 'transfer error'))));
        await LanTransfer.connect({ host, port });   // blocking + retry in native; rejects on real failure
        await LanTransfer.sendString({ text });
      } catch (e: any) { fail(e instanceof Error ? e : new Error(String(e?.message || e))); }
    });
  }

  /** Send raw bytes (decoded from base64) as a BINARY payload — used for media
   *  (image/video). The plugin streams the bytes and the LCD writes them straight
   *  to a file, so the assembled file is byte-exact (no base64 reassembly on the
   *  receiver → no MP4 corruption) and the LCD never holds it in its JS heap.
   *  Native-only; retries up to 3× with backoff. */
  async sendBinary(host: string, port: number, base64: string, onPercent: (p: number) => void): Promise<void> {
    if (!this.isNative) throw new Error('binary send is native-only');
    const MAX_ATTEMPTS = 3;
    let lastErr: any;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try { await this.sendBinaryOnce(host, port, base64, onPercent); return; }
      catch (e: any) { lastErr = e; if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 800 * attempt)); }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr?.message || lastErr || 'binary transfer failed'));
  }

  private async sendBinaryOnce(host: string, port: number, base64: string, onPercent: (p: number) => void): Promise<void> {
    const { LanTransfer } = await import('capacitor-lan-transfer');
    const idleTimeoutMs = 15000 + Math.ceil(base64.length / 102400) * 1000;
    return new Promise<void>(async (resolve, reject) => {
      const subs: Array<{ remove: () => Promise<void> }> = [];
      let settled = false; let watchdog: any;
      const cleanup = async () => { clearTimeout(watchdog); for (const s of subs) { try { await s.remove(); } catch { /* */ } } };
      const fail = async (err: Error) => { if (settled) return; settled = true; await cleanup(); reject(err); };
      const ok = async () => { if (settled) return; settled = true; await cleanup(); resolve(); };
      const armWatchdog = () => { clearTimeout(watchdog); watchdog = setTimeout(() => fail(new Error(`Media transfer stalled — no data for ${Math.round(idleTimeoutMs / 1000)}s`)), idleTimeoutMs); };
      armWatchdog();
      try {
        subs.push(await LanTransfer.addListener('progress', (e: any) => { if (e.direction === 'send') { armWatchdog(); onPercent(Math.round(e.percent)); } }));
        subs.push(await LanTransfer.addListener('status', (e: any) => { if (e.status === 'send_complete') ok(); }));
        subs.push(await LanTransfer.addListener('error', (e: any) => fail(new Error(e.message || 'transfer error'))));
        await LanTransfer.connect({ host, port });
        await LanTransfer.sendBase64({ base64 });            // decoded to binary by the plugin
      } catch (e: any) { fail(e instanceof Error ? e : new Error(String(e?.message || e))); }
    });
  }

  /**
   * Post-failure diagnosis. Distinguishes:
   *  - peer reachable (transient error) · port closed (LCD app not running)
   *  - gateway reachable but peer not → AP client isolation (suggest hotspot)
   *  - different subnet → phone and display on different networks
   */
  async diagnose(host: string, port: number): Promise<string> {
    if (!this.isNative) return '';
    try {
      const { LanTransfer } = await import('capacitor-lan-transfer');
      const probe = (h: string, p: number, timeoutMs: number) =>
        (LanTransfer as any).checkReachable({ host: h, port: p, timeoutMs })
          .catch(() => ({ reachable: false, latencyMs: timeoutMs }));

      const direct = await probe(host, port, 2500);
      if (direct.reachable) {
        return `The display at ${host}:${port} is reachable — the failure was transient. Try Deploy again.`;
      }
      // Fast failure (<1 s) usually means an RST: host is up, port closed.
      if ((direct.latencyMs ?? 2500) < 1000) {
        return `${host} responded but port ${port} is closed — is the Newton Touch LCD app running on the display?`;
      }

      // Same-subnet check (assume /24 when the prefix is unknown).
      try {
        const ni = await (LanTransfer as any).getNetworkInfo();
        const sameSubnet = (ni?.interfaces || []).some((i: any) => {
          const bits = typeof i.prefixLength === 'number' && i.prefixLength > 0 ? i.prefixLength : 24;
          return this.inSameSubnet(i.ip, host, bits);
        });
        if (!sameSubnet) {
          const own = (ni?.interfaces || []).map((i: any) => i.ip).join(', ') || 'unknown';
          return `This phone (${own}) and ${host} appear to be on different networks — join the same Wi-Fi, or enable the phone hotspot and connect the display to it.`;
        }
      } catch { /* network info unavailable — skip subnet check */ }

      // Gateway probe: if the router answers but the peer doesn't, the AP almost
      // certainly blocks device-to-device traffic (client isolation).
      const gateway = host.split('.').slice(0, 3).join('.') + '.1';
      const gw = await probe(gateway, 80, 1500);
      const gatewayAnswers = gw.reachable || (gw.latencyMs ?? 1500) < 900;
      if (gatewayAnswers) {
        return `Can reach the router (${gateway}) but not the display (${host}) — this Wi-Fi likely blocks device-to-device traffic (client isolation). Use the phone hotspot: enable it, connect the display to it, then rescan.`;
      }
      return `${host} is unreachable — check the IP on the display's pairing screen and that both devices are on the same network.`;
    } catch {
      return '';
    }
  }

  private inSameSubnet(a: string, b: string, prefix: number): boolean {
    const toNum = (ip: string): number | null => {
      const p = ip.split('.').map((x) => parseInt(x, 10));
      if (p.length !== 4 || p.some((x) => isNaN(x) || x < 0 || x > 255)) return null;
      return (((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0);
    };
    const na = toNum(a); const nb = toNum(b);
    if (na === null || nb === null) return false;
    const bits = Math.min(Math.max(prefix, 0), 32);
    if (bits === 0) return true;
    const mask = bits === 32 ? 0xFFFFFFFF : ((0xFFFFFFFF << (32 - bits)) >>> 0);
    return (na & mask) === (nb & mask);
  }

  /**
   * Browser-relay only: send a payload WITHOUT waiting for a deploy_ack.
   * Used for image payloads — the LCD only acks the final layout, not
   * intermediary image messages.  On native this is a no-op (use send()).
   */
  async sendRelayNoAck(host: string, text: string): Promise<void> {
    if (this.isNative) return;            // caller should use send() on native
    const ws = await this.ensureRelay();
    ws.send(JSON.stringify({ type: 'deploy', to: host, payload: text }));
  }
}
