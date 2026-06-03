import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp } from '@capacitor/core';
import { WorkspaceService, httpBase } from './workspace.service';

export interface Session {
  token: string;
  username: string;
  environment: string;
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
    return !!this.session?.token;
  }

  async current(): Promise<Session | null> {
    await this.ensure();
    return this.session;
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
    const msg = res.data?.responseMessage;
    const token = msg?.access_token;
    if (!token) throw new Error(res.data?.responseMessage?.toString?.() || 'Invalid credentials');
    this.refreshToken = msg?.refresh_token || '';
    this.session = { token, username, environment: w.environment };
    this.loaded = true;
    await Preferences.set({ key: KEY, value: JSON.stringify(this.session) });
    // Make the token available to the Category API.
    await this.ws.set({ username, token });
  }

  async signOut(): Promise<void> {
    this.session = null;
    this.loaded = true;
    await Preferences.remove({ key: KEY });
  }
}
