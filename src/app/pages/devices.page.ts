import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSearchbar, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { DeviceService, SavedDevice } from '../services/device.service';
import { TransferService } from '../services/transfer.service';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSearchbar, IonList, IonItem, IonLabel],
  template: `
    <ion-header><ion-toolbar>
      <ion-title>Devices</ion-title>
      <ion-buttons slot="end"><ion-button (click)="scan()">🔍 Scan</ion-button></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <ion-searchbar placeholder="Search devices" (ionInput)="q = $any($event.target).value || ''"></ion-searchbar>
      <!-- No live status — last-deployed content + time only (local registry). -->
      <ion-list>
        <ion-item *ngFor="let d of filtered()" button detail>
          <ion-label>{{ d.name }}
            <p>{{ d.ip }}:{{ d.port }}<span *ngIf="d.lastContentName"> · {{ d.lastContentName }} · {{ ago(d.lastDeployedAt) }}</span>
              <span *ngIf="!d.lastContentName"> · no content deployed</span></p>
          </ion-label>
        </ion-item>
        <ion-item *ngIf="!devices.length"><ion-label color="medium">No saved devices. Deploy content or tap Scan.</ion-label></ion-item>
      </ion-list>
    </ion-content>
  `,
})
export class DevicesPage implements OnInit {
  q = '';
  devices: SavedDevice[] = [];

  scanning = false;

  constructor(private deviceSvc: DeviceService, private transfer: TransferService) {}

  async ngOnInit(): Promise<void> { this.devices = await this.deviceSvc.list(); }

  filtered(): SavedDevice[] {
    const q = this.q.toLowerCase();
    return q ? this.devices.filter((d) => d.name.toLowerCase().includes(q) || d.ip.includes(q)) : this.devices;
  }

  /** Discover advertising LCDs (NSD) and add them to the local registry. */
  async scan(): Promise<void> {
    if (this.scanning) { this.scanning = false; await this.transfer.stopScan(); return; }
    this.scanning = true;
    const sub = this.transfer.found$.subscribe(async (list) => {
      for (const f of list) await this.deviceSvc.upsertReturning(f.deviceName || f.name, f.host, f.port);
      this.devices = await this.deviceSvc.list();
    });
    await this.transfer.startScan();
    // auto-stop after 8s
    setTimeout(async () => { this.scanning = false; sub.unsubscribe(); await this.transfer.stopScan(); this.devices = await this.deviceSvc.list(); }, 8000);
  }

  ago(ts?: number): string {
    if (!ts) return '';
    const h = Math.round((Date.now() - ts) / 3.6e6);
    return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  }
}
