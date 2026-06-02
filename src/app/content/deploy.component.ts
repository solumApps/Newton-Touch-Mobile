import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonLabel, IonList, IonListHeader, IonNote, IonProgressBar, IonSpinner } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { DeviceService } from '../services/device.service';
import { TransferService, FoundDevice } from '../services/transfer.service';
import { WorkspaceService } from '../services/workspace.service';
import type { LayoutJson } from '@contract/layout';

@Component({
  selector: 'app-deploy',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonLabel, IonList, IonListHeader, IonNote, IonProgressBar, IonSpinner],
  styles: [`
    ion-list-header ion-label{font-size:11px !important;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--nt-text-2)}
    .sumc{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--nt-border);border-radius:10px;padding:12px;margin:4px 0 14px}
    .sumc .sw{width:46px;height:46px;border-radius:8px;flex-shrink:0}
    .sumc .nm{font-size:15px;font-weight:800;color:var(--nt-text)}
    .sumc .meta{font-size:11px;color:var(--nt-muted);margin-top:2px}
    .sumc .kb{margin-left:auto;text-align:right;font-size:10px;color:var(--nt-muted);text-transform:uppercase;letter-spacing:.5px}
    .sumc .kb b{display:block;font-size:15px;color:var(--nt-purple)}
    .done{text-align:center;padding:40px 20px}
    .done .ck{width:72px;height:72px;border-radius:50%;background:#10B981;color:#fff;font-size:38px;line-height:72px;margin:0 auto 16px}
    .done h2{font-family:'Barlow Condensed';font-weight:900;font-size:24px;color:var(--nt-text);margin:0}
    .done p{color:var(--nt-muted);font-size:13px;margin:6px 0 24px}
    .dots{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11px;color:var(--nt-muted)}
    .dot{width:9px;height:9px;border-radius:50%;background:#CBD5E1}
    .dot.on{background:#10B981}
  `],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="back()">‹</ion-button></ion-buttons>
      <ion-title>Deploy</ion-title>
    </ion-toolbar></ion-header>

    <!-- SUCCESS SCREEN -->
    <ion-content class="ion-padding" *ngIf="doneOk; else form">
      <div class="done">
        <div class="ck">✓</div>
        <h2>Deployed</h2>
        <p>{{ draft?.name }} is now live on <b>{{ targetName }}</b>.</p>
        <button class="btn-y" (click)="back()">Done</button>
        <button class="btn-o" style="margin-top:8px" (click)="doneOk=false">Deploy to another</button>
      </div>
    </ion-content>

    <ng-template #form>
    <ion-content class="ion-padding" *ngIf="draft as d">
      <div class="sumc">
        <div class="sw" [style.background]="d.themeTokens.background"></div>
        <div><div class="nm">{{ d.name }}</div>
          <div class="meta">{{ d.themeName }} · {{ d.appMode }}</div></div>
        <div class="kb"><b>{{ sizeKb }}</b>KB · atomic</div>
      </div>

      <ion-list>
        <ion-list-header><ion-label>Nearby devices</ion-label>
          <ion-button size="small" (click)="toggleScan()">{{ scanning ? '◼ Stop' : '🔍 Scan' }}</ion-button></ion-list-header>
        <ion-item *ngIf="scanning && !found.length"><ion-spinner name="dots"></ion-spinner><ion-label color="medium">&nbsp; Searching…</ion-label></ion-item>
        <ion-item *ngFor="let dev of found" button [color]="isTarget(dev.host, dev.port) ? 'light' : undefined" (click)="select(dev.deviceName || dev.name, dev.host, dev.port)">
          <ion-label>{{ dev.deviceName || dev.name }}<p>{{ dev.host }}:{{ dev.port }}<span *ngIf="dev.storeId"> · store {{ dev.storeId }}</span></p></ion-label>
        </ion-item>
        <ion-item *ngIf="!scanning && !found.length"><ion-label color="medium">No devices found — add by IP below.</ion-label></ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header><ion-label>Add by IP (manual fallback)</ion-label></ion-list-header>
        <ion-item><ion-input [(ngModel)]="manualName" placeholder="Device name"></ion-input></ion-item>
        <ion-item><ion-input [(ngModel)]="manualIp" placeholder="192.168.x.x"></ion-input>
          <ion-button slot="end" (click)="select(manualName || manualIp, manualIp, 8082)">Select</ion-button></ion-item>
      </ion-list>

      <div class="dots" *ngIf="targetHost">
        <span class="dot on"></span> Target: <b>&nbsp;{{ targetName }}</b> &nbsp;({{ targetHost }}:{{ targetPort }})
      </div>
      <div *ngIf="sending" style="margin:10px 0"><ion-progress-bar [value]="percent/100"></ion-progress-bar><div style="text-align:center;font-size:12px;color:#64748B">{{ percent }}%</div></div>

      <button class="btn-y" style="margin-top:12px" [disabled]="!targetHost || sending" (click)="deploy()">🚀 Deploy to selected</button>
      <button class="btn-o" style="margin-top:8px" (click)="download()">⬇ Download layout.json</button>
      <ion-note *ngIf="doneMsg && !doneOk" color="danger">{{ doneMsg }}</ion-note>
    </ion-content>
    </ng-template>
  `,
})
export class DeployComponent implements OnInit, OnDestroy {
  draft?: ContentDraft;
  payload?: LayoutJson;
  sizeKb = 0;

  found: FoundDevice[] = [];
  scanning = false;
  private sub?: Subscription;

  targetName = ''; targetHost = ''; targetPort = 8082;
  manualName = ''; manualIp = '';
  sending = false; percent = 0;
  doneMsg = ''; doneOk = false;

  constructor(
    private content: ContentService,
    private deviceSvc: DeviceService,
    private transfer: TransferService,
    private workspace: WorkspaceService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.draft = (await this.content.list()).find((d) => d.id === id);
    if (!this.draft) { this.router.navigateByUrl('/tabs/content'); return; }
    this.payload = this.content.build(this.draft);
    this.sizeKb = Math.max(1, Math.round(JSON.stringify(this.payload).length / 1024));
    this.sub = this.transfer.found$.subscribe((list) => (this.found = list));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); this.transfer.stopScan(); }

  async toggleScan(): Promise<void> {
    if (this.scanning) { this.scanning = false; await this.transfer.stopScan(); }
    else { this.scanning = true; await this.transfer.startScan(); }
  }

  isTarget(host: string, port: number): boolean { return this.targetHost === host && this.targetPort === port; }
  select(name: string, host: string, port: number): void {
    if (!host) return;
    this.targetName = name; this.targetHost = host; this.targetPort = port;
  }

  async deploy(): Promise<void> {
    if (!this.draft || !this.payload || !this.targetHost) return;
    const text = JSON.stringify(this.payload);

    if (!this.transfer.isNative) { this.download(); this.doneOk = true; this.doneMsg = 'Web preview — payload downloaded (LAN transfer needs a device).'; return; }

    this.sending = true; this.percent = 0; this.doneMsg = '';
    try {
      await this.transfer.send(this.targetHost, this.targetPort, text, (p) => (this.percent = p));
      // Category / +ESL need the server config on the LCD for runtime LED blink.
      if (this.draft.appMode !== 'prototype') {
        const creds = await this.workspace.creds();
        const w = await this.workspace.get();
        if (creds) {
          const serverConfig = JSON.stringify({ kind: 'serverConfig', serverUrl: creds.serverUrl, token: creds.token, companyId: creds.companyId, storeId: creds.storeId, ledColour: 'red', ledDuration: '10', environment: w.environment });
          try { await this.transfer.send(this.targetHost, this.targetPort, serverConfig, () => {}); } catch { /* non-fatal */ }
        }
      }
      const dev = await this.deviceSvc.upsertReturning(this.targetName, this.targetHost, this.targetPort);
      await this.deviceSvc.recordDeploy(dev.id, this.draft.name);
      this.draft.deployedTo = this.targetName; this.draft.deployedAt = Date.now(); this.draft.status = 'complete';
      await this.content.save(this.draft);
      this.doneOk = true; this.doneMsg = '✓ Deployed to ' + this.targetName;
    } catch (e: any) {
      this.doneOk = false; this.doneMsg = 'Deploy failed: ' + (e?.message || e);
    } finally {
      this.sending = false;
    }
  }

  download(): void {
    if (!this.payload) return;
    const blob = new Blob([JSON.stringify(this.payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'layout.json'; a.click();
    URL.revokeObjectURL(url);
  }

  back(): void { this.router.navigateByUrl('/tabs/content'); }
}
