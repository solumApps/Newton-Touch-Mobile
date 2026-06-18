import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp } from '@capacitor/core';
import { WorkspaceService, httpBase } from './workspace.service';

export interface Session {
  token: string;
  username: string;
  environment: string;
  /** SOLUM refresh token (kept for reference; the LCD now logs in itself). */
  refreshToken?: string;
  /** Login password — forwarded to the LCD so it can generate its own token. */
  password?: string;
}

const KEY = 'nt.session';

/**
 * Auth session (offline-friendly). Today it stores a locally-issued token after
 * the login form; when the real backend lands, swap signIn() to call the auth
 * API and store the returned JWT — the guard and the rest stay the same.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private session: Session | null = null;
  private loaded = false;
  private refreshToken = '';

  constructor(private ws: WorkspaceService) {}

  private async ensure(): Promise<void> {
    if (this.loaded) return;
    const { value } = await Preferences.get({ key: KEY });
    this.session = value ? JSON.parse(value) : null;
    this.loaded = true;
  }

  async isAuthed(): Promise<boolean> {
    await this.ensure();
    // Require BOTH token and password: the LCD needs the password to generate its
    // own ESL token, so a legacy session that predates password storage is treated
    // as incomplete — forcing one clean re-login that captures the password.
    return !!this.session?.token && !!this.session?.password;
  }

  async current(): Promise<Session | null> {
    await this.ensure();
    return this.session;
  }

  /** Refresh token from the last sign-in (in-memory, else persisted session). */
  async getRefreshToken(): Promise<string> {
    if (this.refreshToken) return this.refreshToken;
    await this.ensure();
    return this.session?.refreshToken || '';
  }

  /** Username + password from the last sign-in — forwarded to the LCD so it can
   *  generate (and keep refreshing) its own SOLUM token, like the sample apps. */
  async getCredentials(): Promise<{ username: string; password: string }> {
    await this.ensure();
    return { username: this.session?.username || '', password: this.session?.password || '' };
  }

  /** Real SOLUM login: POST {base}/common/api/v2/token → store access/refresh token. */
  async signIn(username: string, password: string): Promise<void> {
    const w = await this.ws.get();
    if (!w.serverUrl) throw new Error('No server selected');
    const base = httpBase(w.serverUrl);
    const res = await CapacitorHttp.post({
      url: `${base}/common/api/v2/token`,
      headers: { 'Content-Type': 'application/json' },
      data: { username, password },
    });
    const body = this.parseHttpData(res.data);
    const msg = body?.responseMessage;
    const token = msg?.access_token;
    if (!token) throw new Error(this.responseError(body) || 'Invalid credentials');
    this.refreshToken = msg?.refresh_token || '';
    this.session = { token, username, environment: w.environment, refreshToken: this.refreshToken, password };
    this.loaded = true;
    await Preferences.set({ key: KEY, value: JSON.stringify(this.session) });
    // Make the token available to the Category API.
    await this.ws.set({
      username,
      token,
      companyId: '',
      companyName: '',
      storeId: '',
      storeName: '',
    });
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

  async signOut(): Promise<void> {
    this.session = null;
    this.loaded = true;
    await Preferences.remove({ key: KEY });
  }
}
