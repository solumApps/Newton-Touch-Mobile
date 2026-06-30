import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonButtons, IonHeader, IonToolbar, IonContent, IonFooter, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack } from 'ionicons/icons';
import { WorkspaceService, Company, Store } from '../services/workspace.service';
import { SessionService } from '../services/session.service';
import { BrandComponent } from '../shared/brand.component';
import { SelectFieldComponent, SelectOption } from '../shared/select-field.component';

/**
 * A2 — company + store via real SOLUM login API, presented as collapsed dropdowns.
 * Login returns all companies + default stores; picking another company refetches its stores.
 */
@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, IonButton, IonButtons, IonHeader, IonToolbar, IonContent, IonFooter, IonIcon, BrandComponent, SelectFieldComponent],
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
  sessionExpired = false;
  returnTo = '';
  companyOpen = false;
  storeOpen = false;

  constructor(private ws: WorkspaceService, private session: SessionService, private router: Router, private route: ActivatedRoute) {
    this.returnTo = this.route.snapshot.queryParamMap.get('returnTo') || '';
    addIcons({ chevronBack });
  }

  get companyOpts(): SelectOption[] { return this.companies.map((c) => ({ value: c.id, label: c.name, sub: c.id })); }
  get storeOpts(): SelectOption[] { return this.stores.map((s) => ({ value: s.id, label: s.name, sub: s.code })); }

  async ngOnInit(): Promise<void> {
    try {
      const currentWs = await this.ws.get();
      const { companies, stores } = await this.ws.login();
      this.companies = companies;

      const hasSavedCompany = !!(currentWs.companyId && companies.some((c) => c.id === currentWs.companyId));
      if (hasSavedCompany) {
        this.companyId = currentWs.companyId;
        this.stores = companies[0]?.id === this.companyId ? stores : await this.ws.fetchStores(this.companyId);
        const hasSavedStore = !!(currentWs.storeId && this.stores.some((s) => s.id === currentWs.storeId));
        this.storeId = hasSavedStore ? currentWs.storeId : (this.stores[0]?.id ?? '');
      } else {
        this.companyId = companies[0]?.id ?? '';
        this.stores = this.companyId ? stores : [];
        this.storeId = this.stores[0]?.id ?? '';
      }
    } catch (e: any) {
      this.handleError(e, 'Failed to load workspace');
    } finally {
      this.loading = false;
    }
  }

  /** Auth-aware error handling: expired token → friendly message + re-sign-in path. */
  private handleError(e: any, fallback: string): void {
    if (e?.authExpired) {
      this.sessionExpired = true;
      this.error = 'Your session has expired. Please sign in again.';
    } else {
      this.error = e?.message || fallback;
    }
  }

  /** Clear the stale session and go to the sign-in page (it returns here after login). */
  async signInAgain(): Promise<void> {
    await this.session.signOut();
    this.router.navigateByUrl('/auth/login');
  }

  async selectCompany(id: string): Promise<void> {
    if (id === this.companyId) return;
    this.companyId = id;
    this.loadingStores = true; this.storeId = ''; this.stores = [];
    try {
      this.stores = await this.ws.fetchStores(id);   // change-company API
      this.storeId = this.stores[0]?.id ?? '';
    } catch (e: any) {
      this.handleError(e, 'Failed to load stores');
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
