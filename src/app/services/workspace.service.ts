import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { Subject } from 'rxjs';
import type { ApiCreds } from './category-api.service';
import { AuthExpiredService } from './auth-expired.service';

/** Browser dev: route SOLUM calls through the Angular dev-proxy to dodge CORS.
 *  On native (Android/iOS) CapacitorHttp bypasses CORS → use the real URL. */
const WEB_PROXY: Record<string, string> = {
  'https://stage00.common.solumesl.com': '/solum-proxy/stage00',
  'https://kr.common.solumesl.com': '/solum-proxy/kr',
  'https://eu.common.solumesl.com': '/solum-proxy/eu',
  'https://eastus.common.solumesl.com': '/solum-proxy/us',
};
export function httpBase(serverUrl: string): string {
  const normalized = normalizeServerUrl(serverUrl);
  return Capacitor.getPlatform() === 'web' ? (WEB_PROXY[normalized] ?? normalized) : normalized;
}

export function normalizeServerUrl(serverUrl: string): string {
  const trimmed = serverUrl.trim();
  if (!trimmed) return '';
  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (!/^https?:$/i.test(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Invalid server URL');
  }
  return parsed.toString().replace(/\/+$/, '');
}

export function isValidServerUrl(serverUrl: string): boolean {
  try {
    return !!normalizeServerUrl(serverUrl);
  } catch {
    return false;
  }
}

export interface Company { id: string; name: string; }
export interface Store { id: string; name: string; code: string; }

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
  environment: 'Korea', serverUrl: '', username: '', token: '',
  companyId: '', companyName: '', storeId: '', storeName: '',
};

/** Holds the signed-in workspace + Category API credentials (offline). */
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private ws: Workspace | null = null;
  public changed = new Subject<Workspace>();

  constructor(private authExpired: AuthExpiredService) {}

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
    this.changed.next(this.ws);
  }

  /** Set environment by name → also sets the matching base server URL. */
  async setEnvironment(name: string): Promise<void> {
    await this.set({
      environment: name,
      serverUrl: SERVERS[name] ?? '',
      companyId: '',
      companyName: '',
      storeId: '',
      storeName: '',
    });
  }

  /**
   * SOLUM login (SaaS) — POST {base}/common/api/v2/common/login (Bearer).
   * No `company` param → returns all companies + the default company's stores.
   * With `?company=` → returns that company's stores. Mirrors STI-Lcd-Wine.
   */
  async login(companyId?: string): Promise<{ companies: Company[]; stores: Store[] }> {
    const w = await this.get();
    if (!w.serverUrl || !w.token) throw new Error('Not signed in');
    const url = `${httpBase(w.serverUrl)}/common/api/v2/common/login` + (companyId ? `?company=${encodeURIComponent(companyId)}` : '');
    const res = await CapacitorHttp.post({
      url,
      headers: { Authorization: `Bearer ${w.token}`, 'Content-Type': 'application/json' },
    });
    const body = this.parseHttpData(res.data);
    if (res.status < 200 || res.status >= 300) {
      const msg = this.responseError(body) || `Workspace login failed (${res.status})`;
      const err: Error & { authExpired?: boolean } = new Error(msg);
      // 401 / TOKEN_EXPIRED → stored access token is no longer valid; caller should re-authenticate.
      err.authExpired = res.status === 401 || /TOKEN_EXPIRED|UNAUTHORIZED/i.test(msg);
      if (err.authExpired) {
        this.authExpired.triggerExpired();
      }
      throw err;
    }

    const root: any = this.objectOrNull(body?.data) ?? body;
    const companies = this.toArray(root?.company ?? root?.companyList ?? root?.companies)
      .map((c: any) => this.mapCompany(c))
      .filter((c) => c.id);
    const stores = this.toArray(root?.managedStores ?? body?.managedStores ?? root?.storeList ?? root?.stores)
      .map((s: any) => this.mapStore(s))
      .filter((s) => s.id);
    return { companies, stores };
  }

  private parseHttpData(data: unknown): any {
    if (typeof data !== 'string') return data ?? {};
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private responseError(body: any): string {
    const message = body?.responseMessage ?? body?.message ?? body?.error;
    return typeof message === 'string' ? message : '';
  }

  private objectOrNull(value: any): any | null {
    return value && typeof value === 'object' ? value : null;
  }

  private toArray(value: any): any[] {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  }

  /** Company element may be a plain string (code) OR an object — handle both. */
  private mapCompany(c: any): Company {
    if (c == null) return { id: '', name: '' };
    if (typeof c === 'string') return { id: c, name: c };
    const id = String(c.company ?? c.companyId ?? c.code ?? c.id ?? '');
    const name = String(c.companyName ?? c.name ?? c.label ?? c.displayName ?? (id || c));
    return { id, name };
  }

  /** Store element may be a plain string (code) OR an object. */
  private mapStore(s: any): Store {
    if (s == null) return { id: '', code: '', name: '' };
    if (typeof s === 'string') return { id: s, code: s, name: s };
    const code = String(s.code ?? s.storeCode ?? s.stationCode ?? s.store ?? s.storeId ?? s.id ?? '');
    const name = String(s.name ?? s.storeName ?? s.stationName ?? s.label ?? s.displayName ?? code);
    return { id: code, code, name };
  }

  /** Stores for a selected company. */
  async fetchStores(companyId: string): Promise<Store[]> {
    return (await this.login(companyId)).stores;
  }

  /** Creds for CategoryApiService; undefined if server/token not configured. */
  async creds(): Promise<ApiCreds | undefined> {
    const w = await this.get();
    if (!w.serverUrl || !w.token) return undefined;
    return { serverUrl: w.serverUrl, username: w.username, token: w.token, companyId: w.companyId, storeId: w.storeId };
  }
}
