import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export interface SavedDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  lastContentName?: string;
  lastDeployedAt?: number;
}

const KEY = 'nt.devices';

/**
 * Local device registry (no live status — config tool, not a monitor).
 * TCP discovery/push is ON HOLD; this stores devices + deploy history only.
 */
@Injectable({ providedIn: 'root' })
export class DeviceService {
  private cache: SavedDevice[] = [];

  async list(): Promise<SavedDevice[]> {
    if (!this.cache.length) {
      const { value } = await Preferences.get({ key: KEY });
      this.cache = value ? JSON.parse(value) : [];
    }
    return this.cache;
  }

  async upsert(d: SavedDevice): Promise<void> {
    await this.list();
    const i = this.cache.findIndex((x) => x.id === d.id || x.ip === d.ip);
    if (i >= 0) this.cache[i] = { ...this.cache[i], ...d }; else this.cache.push(d);
    await Preferences.set({ key: KEY, value: JSON.stringify(this.cache) });
  }

  /** Create-or-update a device by IP and return it (used after a successful deploy). */
  async upsertReturning(name: string, ip: string, port: number): Promise<SavedDevice> {
    await this.list();
    let dev = this.cache.find((x) => x.ip === ip);
    if (!dev) { dev = { id: 'dev_' + Date.now(), name, ip, port }; this.cache.push(dev); }
    else { dev.name = name || dev.name; dev.port = port; }
    await Preferences.set({ key: KEY, value: JSON.stringify(this.cache) });
    return dev;
  }

  /** Remove a saved device. */
  async remove(id: string): Promise<void> {
    await this.list();
    this.cache = this.cache.filter((x) => x.id !== id);
    await Preferences.set({ key: KEY, value: JSON.stringify(this.cache) });
  }

  async recordDeploy(deviceId: string, contentName: string): Promise<void> {
    await this.list();
    const dev = this.cache.find((x) => x.id === deviceId);
    if (dev) {
      dev.lastContentName = contentName;
      dev.lastDeployedAt = Date.now();
      await Preferences.set({ key: KEY, value: JSON.stringify(this.cache) });
    }
  }

}
