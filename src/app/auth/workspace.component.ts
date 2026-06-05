import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonButtons, IonHeader, IonToolbar, IonContent, IonFooter, IonSpinner } from '@ionic/angular/standalone';
import { WorkspaceService, Company, Store } from '../services/workspace.service';
import { BrandComponent } from '../shared/brand.component';
import { SelectFieldComponent, SelectOption } from '../shared/select-field.component';

/**
 * A2 — company + store via real SOLUM login API, presented as collapsed dropdowns.
 * Login returns all companies + default stores; picking another company refetches its stores.
 */
@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, IonButton, IonButtons, IonHeader, IonToolbar, IonContent, IonFooter, IonSpinner, BrandComponent, SelectFieldComponent],
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss'],
})
export class WorkspaceComponent implements OnInit {
  companies: Company[] = [];
  stores: Store[] = [];
  companyId = '';
  storeId = '';
  loading = true;
  loadingStores = false;
  error = '';
  returnTo = '';
  companyOpen = false;
  storeOpen = false;

  constructor(private ws: WorkspaceService, private router: Router, private route: ActivatedRoute) {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo') || '';
  }

  get companyOpts(): SelectOption[] { return this.companies.map((c) => ({ value: c.id, label: c.name, sub: c.id })); }
  get storeOpts(): SelectOption[] { return this.stores.map((s) => ({ value: s.id, label: s.name, sub: s.code })); }

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
    this.router.navigateByUrl(this.returnTo || '/tabs/themes');
  }

  back(): void { this.router.navigateByUrl(this.returnTo || '/tabs/settings'); }

  onCompanyOpenChange(open: boolean): void {
    this.companyOpen = open;
    if (open) {
      this.storeOpen = false;
    }
  }

  onStoreOpenChange(open: boolean): void {
    this.storeOpen = open;
    if (open) {
      this.companyOpen = false;
    }
  }
}
