import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular/standalone';
import { DeviceService, SavedDevice } from '../services/device.service';
import { TransferService } from '../services/transfer.service';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  styles: [`
    .wrap{padding:12px 16px 24px}
    .srch{border:1px solid var(--nt-border);border-radius:8px;padding:9px 12px;font-size:13px;width:100%;font-family:inherit;margin-bottom:10px}
    .dev{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .ic{width:38px;height:38px;border-radius:8px;background:var(--nt-tint);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .dev .nm{font-size:13px;font-weight:700;color:var(--nt-text)}
    .dev .meta{font-size:9px;color:var(--nt-muted)}
    .push{margin-left:auto;background:var(--nt-purple);color:#fff;border:none;border-radius:7px;padding:7px 12px;font-size:11px;font-weight:700;font-family:inherit}
    .empty{color:var(--nt-muted);font-size:12px;text-align:center;padding:20px}
  `],
  template: `
    <ion-header><ion-toolbar>
      <ion-title>Devices</ion-title>
      <ion-buttons slot="end"><ion-button (click)="scan()">{{ scanning ? '◼ Stop' : '🔍 Scan' }}</ion-button></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content>
      <div class="wrap">
        <input class="srch" placeholder="Search devices" (input)="q=$any($event.target).value||''" />
        <div class="crd dev" *ngFor="let d of filtered()">
          <div class="ic">🖥️</div>
          <div>
            <div class="nm">{{ d.name }}</div>
            <div class="meta">{{ d.ip }}:{{ d.port }}<span *ngIf="d.lastContentName"> · {{ d.lastContentName }} · {{ ago(d.lastDeployedAt) }}</span><span *ngIf="!d.lastContentName"> · no content deployed</span></div>
          </div>
          <button class="push" (click)="push()">Push</button>
        </div>
        <div class="empty" *ngIf="!devices.length">No saved devices. Deploy content or tap Scan.</div>
      </div>
    </ion-content>
  `,
})
export class DevicesPage implements OnInit {
  q = '';
  devices: SavedDevice[] = [];

  scanning = false;

  constructor(private deviceSvc: DeviceService, private transfer: TransferService, private router: Router) {}

  push(): void { this.router.navigateByUrl('/tabs/content'); }

  async ngOnInit(): Promise<void> { this.devices = await this.deviceSvc.list(); }
  async ionViewWillEnter(): Promise<void> { this.devices = await this.deviceSvc.list(); }

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
