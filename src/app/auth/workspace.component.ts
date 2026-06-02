import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { WorkspaceService, Company, Store } from '../services/workspace.service';

/**
 * A2 — company + store selection via the real SOLUM login API.
 * Login returns all companies + the default company's stores; selecting another
 * company refetches its stores. Card-based UI to match the wireframe.
 */
@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, IonContent, IonSpinner],
  styles: [`
    .wrap{padding:16px}
    h2{font-size:18px;font-weight:800;color:var(--nt-text);margin:0 0 4px}
    .step{font-size:10px;font-weight:700;color:var(--nt-text-2);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px}
    .row{display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer}
    .ava{width:30px;height:30px;border-radius:7px;background:linear-gradient(135deg,#2F006D,#001973);flex-shrink:0}
    .row .name{font-size:13px;font-weight:700;color:var(--nt-text)}
    .row .meta{font-size:9px;color:var(--nt-muted)}
    .tick{margin-left:auto;color:var(--nt-purple);font-weight:800}
    .err{color:#dc2626;font-size:12px}
  `],
  template: `
    <ion-content>
      <div class="wrap">
        <h2>Select Workspace</h2>
        <div *ngIf="loading" style="text-align:center;padding:24px"><ion-spinner></ion-spinner></div>
        <div class="err" *ngIf="error">{{ error }}</div>

        <ng-container *ngIf="!loading && !error">
          <div class="step">Step 1 · Company</div>
          <div class="crd row" [class.sel]="c.id===companyId" *ngFor="let c of companies" (click)="selectCompany(c.id)">
            <div class="ava"></div>
            <div><div class="name">{{ c.name }}</div><div class="meta">{{ c.id }}</div></div>
            <span class="tick" *ngIf="c.id===companyId">✓</span>
          </div>

          <div class="step">Step 2 · Store {{ loadingStores ? '· loading…' : '' }}</div>
          <div class="crd row" [class.sel]="s.id===storeId" *ngFor="let s of stores" (click)="storeId=s.id">
            <div><div class="name">{{ s.name }}</div><div class="meta">{{ s.code }}</div></div>
            <span class="tick" *ngIf="s.id===storeId">✓</span>
          </div>
          <div *ngIf="!stores.length && !loadingStores" class="meta" style="color:var(--nt-muted);font-size:12px">No stores for this company.</div>

          <button class="btn-y" style="margin-top:18px" [disabled]="!companyId || !storeId" (click)="enter()">Enter →</button>
        </ng-container>
      </div>
    </ion-content>
  `,
})
export class WorkspaceComponent implements OnInit {
  companies: Company[] = [];
  stores: Store[] = [];
  companyId = '';
  storeId = '';
  loading = true;
  loadingStores = false;
  error = '';

  constructor(private ws: WorkspaceService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      const { companies, stores } = await this.ws.login();
      this.companies = companies;
      this.stores = stores;
      this.companyId = companies[0]?.id ?? '';
      this.storeId = stores[0]?.id ?? '';
    } catch (e: any) {
      this.error = e?.message || 'Failed to load workspace';
    } finally {
      this.loading = false;
    }
  }

  async selectCompany(id: string): Promise<void> {
    if (id === this.companyId) return;
    this.companyId = id;
    this.loadingStores = true; this.storeId = ''; this.stores = [];
    try {
      this.stores = await this.ws.fetchStores(id);   // change-company API
      this.storeId = this.stores[0]?.id ?? '';
    } catch (e: any) {
      this.error = e?.message || 'Failed to load stores';
    } finally {
      this.loadingStores = false;
    }
  }

  async enter(): Promise<void> {
    const company = this.companies.find((c) => c.id === this.companyId);
    const store = this.stores.find((s) => s.id === this.storeId);
    await this.ws.set({
      companyId: this.companyId, companyName: company?.name ?? this.companyId,
      storeId: this.storeId, storeName: store?.name ?? this.storeId,
    });
    this.router.navigateByUrl('/tabs/themes');
  }
}
