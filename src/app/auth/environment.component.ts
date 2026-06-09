import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonFooter, IonIcon } from '@ionic/angular/standalone';
import { isValidServerUrl, normalizeServerUrl, WorkspaceService, SERVERS } from '../services/workspace.service';
import { BrandComponent } from '../shared/brand.component';

/** A0 — Environment / server selection. Curated SOLUM servers + a private-server URL path. */
@Component({
  selector: 'app-environment',
  standalone: true,
  imports: [IonIcon, CommonModule, FormsModule, IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonFooter, BrandComponent],
  templateUrl: './environment.component.html',
  styleUrls: ['./environment.component.scss'],
})
export class EnvironmentComponent {
  servers: Record<string, string> = { ...SERVERS };
  envs: string[] = Object.keys(SERVERS).filter((name) => name !== 'Stage 00');
  selected = 'Korea';
  privateServerPage = false;
  customUrl = '';
  customUrlValid = false;
  customTouched = false;
  returnTo = '';

  private readonly knownServerUrls = new Set(Object.values(SERVERS).map((url) => normalizeServerUrl(url)));

  constructor(private ws: WorkspaceService, private router: Router, private route: ActivatedRoute) {}

  /** Ionic fires this every time the page becomes active — unlike ngOnInit which
   *  only runs once when the component is first created and may be cached. */
  async ionViewWillEnter(): Promise<void> {
    // Re-read returnTo on every activation so it reflects the latest navigation.
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo') || '';

    // Reset private-server state so we don't carry over from a previous visit.
    this.privateServerPage = false;
    this.customUrl = '';
    this.customUrlValid = false;
    this.customTouched = false;
    this.selected = 'Korea';

    if (!this.returnTo) return;
    // Coming from Settings: load the current workspace.
    const workspace = await this.ws.get();

    // Check if the saved environment is one of the servers shown in the list.
    // If not (e.g. 'Custom', 'Stage 00', or any non-standard name),
    // the user is on a private server → jump straight to private server URL screen.
    if (!this.envs.includes(workspace.environment)) {
      this.customUrl = workspace.serverUrl;
      this.customUrlValid = true;
      this.privateServerPage = true;
    } else {
      // Pre-select the current known server in the list.
      this.selected = workspace.environment;
    }
  }

  pick(name: string): void { this.selected = name; }

  onCustomUrlChange(value: string): void {
    this.customUrl = value;
    this.customUrlValid = this.isKnownServerUrl(value);
  }

  validCustom(): boolean { return this.customUrlValid; }

  canContinue(): boolean {
    return this.privateServerPage ? this.validCustom() : !!this.selected;
  }

  private isKnownServerUrl(value: string): boolean {
    if (!isValidServerUrl(value)) return false;
    return this.knownServerUrls.has(normalizeServerUrl(value));
  }

  private environmentForUrl(value: string): string {
    const normalized = normalizeServerUrl(value);
    return Object.entries(SERVERS).find(([, url]) => normalizeServerUrl(url) === normalized)?.[0] ?? 'Custom';
  }

  async continue(): Promise<void> {
    if (this.privateServerPage) {
      this.customTouched = true;
      if (!isValidServerUrl(this.customUrl)) return;
      await this.ws.set({
        environment: this.environmentForUrl(this.customUrl),
        serverUrl: normalizeServerUrl(this.customUrl),
        companyId: '',
        companyName: '',
        storeId: '',
        storeName: '',
      });
    } else {
      await this.ws.setEnvironment(this.selected);
    }
    // If we came from Settings, go back there; otherwise proceed to login.
    this.router.navigateByUrl(this.returnTo || '/auth/login');
  }

  back(): void {
    if (this.privateServerPage) {
      this.privateServerPage = false;
      return;
    }
    this.router.navigateByUrl(this.returnTo || '/tabs/settings');
  }
}
