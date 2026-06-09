import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject } from 'rxjs';

export interface FoundDevice {
  name: string;        // NSD instance name
  host: string;
  port: number;
  deviceName?: string;
  storeId?: string;
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
  private ackResolve?: () => void;

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
      ws.onclose = () => { if (this.ws === ws) this.ws = undefined; };
      ws.onmessage = (m) => {
        let msg: any; try { msg = JSON.parse(m.data); } catch { return; }
        if (msg.type === 'devices') {
          this.found$.next((msg.devices || []).map((d: any) => ({ name: d.id, host: d.id, port: 8090, deviceName: d.deviceName, storeId: d.code })));
        } else if (msg.type === 'deploy_ack') {
          this.ackResolve?.(); this.ackResolve = undefined;
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
      const dev: FoundDevice = { name: e.name, host: e.host, port: e.port, deviceName: e.deviceName, storeId: e.storeId };
      const list = this.found$.value.filter((d) => d.name !== dev.name);
      list.push(dev);
      this.found$.next(list);
    }));
    this.listeners.push(await (LanTransfer as any).addListener('deviceLost', (e: any) => {
      this.found$.next(this.found$.value.filter((d) => d.name !== e.name));
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

  /** Connect + send a string payload (layout.json or serverConfig). Resolves on send_complete. */
  async send(host: string, port: number, text: string, onPercent: (p: number) => void): Promise<void> {
    if (!this.isNative) {
      // Browser dev: push through the relay to the target receiver id (host == LCD id).
      const ws = await this.ensureRelay();
      onPercent(20);
      return new Promise<void>((resolve, reject) => {
        // Scale timeout with payload size: 8 s base + 2 s per 100 KB.
        const timeoutMs = 8000 + Math.ceil(text.length / 102400) * 2000;
        const timer = setTimeout(() => { this.ackResolve = undefined; reject(new Error('No ack from display — is the LCD tab open & connected to the relay?')); }, timeoutMs);
        this.ackResolve = () => { clearTimeout(timer); onPercent(100); resolve(); };
        try { ws.send(JSON.stringify({ type: 'deploy', to: host, payload: text })); onPercent(60); }
        catch (e) { clearTimeout(timer); reject(e as Error); }
      });
    }
    const { LanTransfer } = await import('capacitor-lan-transfer');
    return new Promise<void>(async (resolve, reject) => {
      const subs: Array<{ remove: () => Promise<void> }> = [];
      const cleanup = async () => { for (const s of subs) { try { await s.remove(); } catch { /* */ } } };
      subs.push(await LanTransfer.addListener('progress', (e: any) => { if (e.direction === 'send') onPercent(Math.round(e.percent)); }));
      subs.push(await LanTransfer.addListener('status', async (e: any) => { if (e.status === 'send_complete') { await cleanup(); resolve(); } }));
      subs.push(await LanTransfer.addListener('error', async (e: any) => { await cleanup(); reject(new Error(e.message || 'transfer error')); }));
      try {
        await LanTransfer.connect({ host, port });   // blocking + retry in native; rejects on real failure
        await LanTransfer.sendString({ text });
      } catch (e) { await cleanup(); reject(e); }
    });
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
