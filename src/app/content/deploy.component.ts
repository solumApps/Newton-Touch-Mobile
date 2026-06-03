import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonProgressBar, IonSpinner } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { DeviceService } from '../services/device.service';
import { TransferService, FoundDevice } from '../services/transfer.service';
import { WorkspaceService } from '../services/workspace.service';
import type { LayoutJson } from '@contract/layout';

@Component({
  selector: 'app-deploy',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, IonProgressBar, IonSpinner],
  templateUrl: './deploy.component.html',
  styleUrls: ['./deploy.component.scss'],
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

  get native(): boolean { return this.transfer.isNative; }

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
      // Browser with no relay running → fall back to downloading the payload.
      if (!this.transfer.isNative) {
        this.download();
        this.doneOk = false;
        this.doneMsg = (e?.message || 'Relay unavailable') + ' — payload downloaded instead. Start the dev relay (node tools/dev-relay.mjs) to deploy in-browser.';
      } else {
        this.doneOk = false; this.doneMsg = 'Deploy failed: ' + (e?.message || e);
      }
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
