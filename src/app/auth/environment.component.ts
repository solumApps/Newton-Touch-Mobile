import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  servers = SERVERS;
  envs = Object.keys(SERVERS).filter((name) => name !== 'Stage 00');
  selected = 'Korea';
  privateServerPage = false;
  customUrl = '';
  customUrlValid = false;
  customTouched = false;
  private readonly knownServerUrls = new Set(Object.values(SERVERS).map((url) => normalizeServerUrl(url)));

  constructor(private ws: WorkspaceService, private router: Router) {}

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
      this.customUrlValid = this.isKnownServerUrl(this.customUrl);
      if (!this.customUrlValid) return;
      await this.ws.set({ environment: this.environmentForUrl(this.customUrl), serverUrl: normalizeServerUrl(this.customUrl) });
    } else {
      await this.ws.setEnvironment(this.selected);
    }
    this.router.navigateByUrl('/auth/login');
  }
}
