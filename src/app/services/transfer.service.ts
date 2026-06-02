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
@Injectable({ providedIn: 'root' })
export class TransferService {
  readonly found$ = new BehaviorSubject<FoundDevice[]>([]);
  private listeners: Array<{ remove: () => Promise<void> }> = [];

  get isNative(): boolean { return Capacitor.isNativePlatform(); }

  async startScan(): Promise<void> {
    if (!this.isNative) return;
    this.found$.next([]);
    const { LanTransfer } = await import('capacitor-lan-transfer');
    this.listeners.push(await LanTransfer.addListener('deviceFound', (e: any) => {
      const dev: FoundDevice = { name: e.name, host: e.host, port: e.port, deviceName: e.deviceName, storeId: e.storeId };
      const list = this.found$.value.filter((d) => d.name !== dev.name);
      list.push(dev);
      this.found$.next(list);
    }));
    this.listeners.push(await LanTransfer.addListener('deviceLost', (e: any) => {
      this.found$.next(this.found$.value.filter((d) => d.name !== e.name));
    }));
    await LanTransfer.startDiscovery();
  }

  async stopScan(): Promise<void> {
    if (!this.isNative) return;
    const { LanTransfer } = await import('capacitor-lan-transfer');
    try { await LanTransfer.stopDiscovery(); } catch { /* */ }
    for (const l of this.listeners) { try { await l.remove(); } catch { /* */ } }
    this.listeners = [];
  }

  /** Connect + send a string payload (layout.json or serverConfig). Resolves on send_complete. */
  async send(host: string, port: number, text: string, onPercent: (p: number) => void): Promise<void> {
    if (!this.isNative) throw new Error('LAN transfer requires a native device.');
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
}
