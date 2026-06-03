import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonFooter } from '@ionic/angular/standalone';
import { WorkspaceService, SERVERS } from '../services/workspace.service';
import { BrandComponent } from '../shared/brand.component';

/** A0 — Environment / server selection. Curated SOLUM servers + a private-server URL path. */
@Component({
  selector: 'app-environment',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonFooter, BrandComponent],
  templateUrl: './environment.component.html',
  styleUrls: ['./environment.component.scss'],
})
export class EnvironmentComponent {
  servers = SERVERS;
  envs = Object.keys(SERVERS);
  selected = 'Stage 00';
  privateServerPage = false;
  customUrl = '';
  customTouched = false;

  constructor(private ws: WorkspaceService, private router: Router) {}

  pick(name: string): void { this.selected = name; }

  validCustom(): boolean { return /^https?:\/\/.+/i.test(this.customUrl.trim()); }

  canContinue(): boolean {
    return this.privateServerPage ? this.validCustom() : !!this.selected;
  }

  async continue(): Promise<void> {
    if (this.privateServerPage) {
      this.customTouched = true;
      if (!this.validCustom()) return;
      await this.ws.set({ environment: 'Custom', serverUrl: this.customUrl.trim() });
    } else {
      await this.ws.setEnvironment(this.selected);
    }
    this.router.navigateByUrl('/auth/login');
  }
}
