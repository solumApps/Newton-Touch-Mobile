import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { ApiCreds } from './category-api.service';

export interface Workspace {
  environment: string;   // e.g. 'Stage 00'
  serverUrl: string;
  username: string;
  token: string;
  companyId: string;
  companyName: string;
  storeId: string;
  storeName: string;
}

const KEY = 'nt.workspace';

/** SOLUM environments (base URLs) — from the reference apps. */
export const SERVERS: Record<string, string> = {
  'Stage 00': 'https://stage00.common.solumesl.com',
  'Korea': 'https://kr.common.solumesl.com',
  'Europe': 'https://eu.common.solumesl.com',
  'USA': 'https://eastus.common.solumesl.com',
};

const DEFAULT: Workspace = {
  environment: 'Stage 00', serverUrl: '', username: '', token: '',
  companyId: 'RCI-001', companyName: 'RetailCo International',
  storeId: 'STR-042', storeName: 'Main Street Store',
};

/** Holds the signed-in workspace + Category API credentials (offline). */
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private ws: Workspace | null = null;

  async get(): Promise<Workspace> {
    if (!this.ws) {
      const { value } = await Preferences.get({ key: KEY });
      this.ws = value ? { ...DEFAULT, ...JSON.parse(value) } : { ...DEFAULT };
    }
    return this.ws!;
  }

  async set(patch: Partial<Workspace>): Promise<void> {
    const ws = await this.get();
    this.ws = { ...ws, ...patch };
    await Preferences.set({ key: KEY, value: JSON.stringify(this.ws) });
  }

  /** Set environment by name → also sets the matching base server URL. */
  async setEnvironment(name: string): Promise<void> {
    await this.set({ environment: name, serverUrl: SERVERS[name] ?? '' });
  }

  /** Creds for CategoryApiService; returns undefined if server not configured (→ mock). */
  async creds(): Promise<ApiCreds | undefined> {
    const w = await this.get();
    if (!w.serverUrl || !w.token) return undefined;
    return { serverUrl: w.serverUrl, username: w.username, token: w.token, companyId: w.companyId, storeId: w.storeId };
  }
}
