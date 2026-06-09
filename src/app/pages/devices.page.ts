import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonSpinner, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonToast, IonIcon, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, addOutline, scanOutline, closeCircleOutline, trashOutline, tvOutline, sendOutline } from 'ionicons/icons';
import { DeviceService, SavedDevice } from '../services/device.service';
import { TransferService } from '../services/transfer.service';
import { WorkspaceService } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';
import { NtButtonComponent, NtBadgeComponent, NtEmptyComponent } from '../shared/ui';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonSpinner, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonToast, IonIcon, IonModal, PageHeaderComponent, NtButtonComponent, NtBadgeComponent, NtEmptyComponent],
  templateUrl: './devices.page.html',
  styleUrls: ['./devices.page.scss'],
})
export class DevicesPage implements OnInit, OnDestroy {
  q = '';
  devices: SavedDevice[] = [];
  scanning = false;
  company = '';
  store = '';
  newName = '';
  newIp = '';
  addMsg = '';
  loading = true;
  skel = [1, 2];
  showToast = false;
  toastMsg = '';
  addModalOpen = false;
  confirmOpen = false;
  confirmDev: SavedDevice | null = null;
  private wsSub?: Subscription;

  constructor(
    private deviceSvc: DeviceService,
    private transfer: TransferService,
    private ws: WorkspaceService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ searchOutline, addOutline, scanOutline, closeCircleOutline, trashOutline, tvOutline, sendOutline });
  }

  /** Best-effort "recently active" indicator from deploy history.
   *  Returns 'live' if deployed within last 24h, 'idle' otherwise. */
  deviceState(d: SavedDevice): 'live' | 'offline' {
    if (!d.lastDeployedAt) return 'offline';
    return (Date.now() - d.lastDeployedAt) < 24 * 3.6e6 ? 'live' : 'offline';
  }

  get native(): boolean { return this.transfer.isNative; }

  push(): void { this.router.navigateByUrl('/tabs/content'); }

  async ngOnInit(): Promise<void> {
    this.wsSub = this.ws.changed.subscribe(w => {
      this.company = w.companyName || '';
      this.store = w.storeName || '';
      this.cdr.detectChanges();
    });
    this.devices = await this.deviceSvc.list();
    this.loading = false;
    await this.loadWorkspace();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }
  async ionViewWillEnter(): Promise<void> {
    this.devices = await this.deviceSvc.list();
    await this.loadWorkspace();
  }
  private async loadWorkspace(): Promise<void> {
    const w = await this.ws.get();
    this.company = w.companyName || '';
    this.store = w.storeName || '';
    this.cdr.detectChanges();
  }

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
    try {
      await this.transfer.startScan();
    } catch (err: any) {
      this.scanning = false;
      sub.unsubscribe();
      this.toastMsg = "WebSocket connection to 'ws://localhost:8090/' failed: Dev relay is not running.";
      this.showToast = true;
      return;
    }
    setTimeout(async () => {
      if (!this.scanning) return;
      this.scanning = false;
      sub.unsubscribe();
      await this.transfer.stopScan();
      this.devices = await this.deviceSvc.list();
    }, 8000);
  }

  del(d: SavedDevice): void {
    this.confirmDev = d;
    this.confirmOpen = true;
  }
  async doDelete(): Promise<void> {
    if (!this.confirmDev) return;
    await this.deviceSvc.remove(this.confirmDev.id);
    this.devices = await this.deviceSvc.list();
    this.confirmOpen = false;
    this.confirmDev = null;
  }

  validIp(): boolean { return /^\d{1,3}(\.\d{1,3}){3}$/.test(this.newIp.trim()); }

  async addManual(): Promise<void> {
    this.addMsg = '';
    if (!this.validIp()) { this.addMsg = 'Enter a valid IPv4 address.'; return; }
    const name = this.newName.trim() || this.newIp.trim();
    await this.deviceSvc.upsertReturning(name, this.newIp.trim(), 8082);
    this.devices = await this.deviceSvc.list();
    this.newName = ''; this.newIp = '';
    this.addModalOpen = false;
  }

  ago(ts?: number): string {
    if (!ts) return '';
    const h = Math.round((Date.now() - ts) / 3.6e6);
    return h < 1 ? 'just now' : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  }
}
