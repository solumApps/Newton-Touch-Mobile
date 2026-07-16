import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonFooter, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonModal, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, chevronForward, trashOutline, documentsOutline, tvOutline, timeOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { ContentService, ContentDraft } from '../services/content.service';
import { DeviceService, SavedDevice } from '../services/device.service';
import { WorkspaceService } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';
import { NtButtonComponent, NtBadgeComponent, NtEmptyComponent, NtSectionHeaderComponent } from '../shared/ui';
import { Subscription } from 'rxjs';
import { BAKERY_GLOW_SAMPLE_ID, FURNITURE_SAMPLE_ID, SUPERMARKET2_SAMPLE_ID } from '../services/sample-content';

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonModal, IonRefresher, IonRefresherContent, PageHeaderComponent, NtButtonComponent, NtBadgeComponent, NtEmptyComponent, NtSectionHeaderComponent],
  templateUrl: './content.page.html',
  styleUrls: ['./content.page.scss'],
})
export class ContentPage implements OnInit, OnDestroy {
  q = '';
  drafts: ContentDraft[] = [];
  company = '';
  store = '';
  loading = true;
  skel = [1, 2, 3];
  confirmOpen = false;
  confirmDraft: ContentDraft | null = null;
  private wsSub?: Subscription;
  private contentSub?: Subscription;
  private devices: SavedDevice[] = [];

  constructor(
    private content: ContentService,
    private deviceSvc: DeviceService,
    private ws: WorkspaceService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ searchOutline, chevronForward, trashOutline, documentsOutline, tvOutline, timeOutline });
  }

  async ngOnInit(): Promise<void> {
    this.wsSub = this.ws.changed.subscribe(w => {
      this.company = w.companyName || '';
      this.store = w.storeName || '';
      this.cdr.detectChanges();
    });
    // Refresh when a draft is saved/removed — covers returning from the builder
    // when the Ionic view lifecycle doesn't re-fire.
    this.contentSub = this.content.changed.subscribe(async () => {
      await this.loadContentState();
      this.cdr.detectChanges();
    });
    await this.loadContentState();
    this.loading = false;
    await this.loadWorkspace();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.contentSub?.unsubscribe();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadContentState();
    this.loading = false;
    await this.loadWorkspace();
  }

  private async loadContentState(): Promise<void> {
    const [drafts, devices] = await Promise.all([
      this.content.list(),
      this.deviceSvc.list(),
    ]);
    this.drafts = drafts;
    this.devices = devices;
  }

  private async loadWorkspace(): Promise<void> {
    const w = await this.ws.get();
    this.company = w.companyName || '';
    this.store = w.storeName || '';
    this.cdr.detectChanges();
  }

  /** Pull-to-refresh — re-runs the existing reload methods. */
  async doRefresh(ev: Event): Promise<void> {
    await this.loadContentState();
    await this.loadWorkspace();
    (ev.target as any)?.complete();
  }

  /** Empty-state CTA: clears the search when one is active, otherwise creates. */
  emptyAction(): void {
    if (this.q) { this.q = ''; return; }
    this.create();
  }

  filtered(): ContentDraft[] {
    const q = this.q.trim().toLowerCase();
    const list = q ? this.drafts.filter((d) => this.searchText(d).includes(q)) : this.drafts;
    return this.sortContent(list);
  }

  /** Group filtered drafts with the built-in sample pinned first. */
  get groups(): { label: string; drafts: ContentDraft[] }[] {
    const list = this.filtered();
    const sample = list.filter(d => this.isSample(d));
    const rest = list.filter(d => !this.isSample(d));
    const deployed = rest.filter(d => !!d.deployedTo);
    const drafts = rest.filter(d => !d.deployedTo);
    const out = [];
    if (sample.length) out.push({ label: 'Sample', drafts: sample });
    if (deployed.length) out.push({ label: 'Deployed', drafts: deployed });
    if (drafts.length) out.push({ label: 'Drafts', drafts });
    return out;
  }

  private isSample(d: ContentDraft): boolean {
    return d.id === BAKERY_GLOW_SAMPLE_ID || d.id === SUPERMARKET2_SAMPLE_ID || d.id === FURNITURE_SAMPLE_ID;
  }

  private sortContent(list: ContentDraft[]): ContentDraft[] {
    return [...list].sort((a, b) => {
      if (this.isSample(a) !== this.isSample(b)) return this.isSample(a) ? -1 : 1;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }

  modeLabel(m: ContentDraft['appMode']): string {
    return m === 'category' ? 'Category'
      : m === 'prototype' ? 'Prototype'
      : m === 'media' ? 'Media'
      : m === 'custom-canvas' ? 'Custom Canvas'
      : m === 'product-promo' ? 'Product Promo'
      : 'Prototype + ESL';
  }

  isLiveOnLcd(c: ContentDraft): boolean {
    if (!c.deployedTo) return false;
    const name = (c.name || '').trim().toLowerCase();
    return !!name && this.devices.some((d) => (d.lastContentName || '').trim().toLowerCase() === name);
  }

  previewImage(c: ContentDraft): string | undefined {
    const sampleCover = this.sampleCover(c.id);
    if (sampleCover) return sampleCover;
    return c.home.find((card) => !!card.image)?.image
      || c.result.promoImage
      || c.result.products.find((p) => !!p.image)?.image
      || Object.values(c.itemResults || {}).find((r) => !!r.promoImage)?.promoImage
      || Object.values(c.itemResults || {}).flatMap((r) => r.products || []).find((p) => !!p.image)?.image
      || c.screensaver?.media?.[0]
      || c.header?.logo;
  }

  private sampleCover(id: string): string | undefined {
    if (id === BAKERY_GLOW_SAMPLE_ID) return 'assets/sample/covers/bakery-glow-cover.svg';
    if (id === SUPERMARKET2_SAMPLE_ID) return 'assets/sample/covers/supermarket2-cover.svg';
    if (id === FURNITURE_SAMPLE_ID) return 'assets/sample/covers/furniture-cover.svg';
    return undefined;
  }

  private searchText(d: ContentDraft): string {
    const itemResultProducts = Object.values(d.itemResults || {}).flatMap((r) => r.products || []);
    const cardParts = (items: ContentDraft['home']): string[] =>
      items.flatMap((c) => ([
        c.name,
        c.price,
        c.unit,
        c.articleId,
        ...(c.products || []).map((p) => [p.name, p.price, p.aisle, p.shelf, p.zone, p.articleId].filter(Boolean).join(' ')),
        ...cardParts(c.children || []),
      ].filter((v): v is string => !!v)));
    const parts = [
      d.name,
      d.themeName,
      this.modeLabel(d.appMode),
      d.header?.title,
      d.header?.caption,
      ...cardParts(d.home),
      ...cardParts(d.intermediate),
      ...d.result.products.map((p) => [p.name, p.price, p.aisle, p.shelf, p.zone, p.articleId].filter(Boolean).join(' ')),
      ...itemResultProducts.map((p) => [p.name, p.price, p.aisle, p.shelf, p.zone, p.articleId].filter(Boolean).join(' ')),
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  /** Human-readable "deployed N ago". */
  ago(ts?: number): string {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
  }

  /** Open the modal confirm (replaces blocking JS confirm). */
  del(c: ContentDraft): void {
    this.confirmDraft = c;
    this.confirmOpen = true;
  }
  doDelete(): void {
    if (!this.confirmDraft) return;
    const id = this.confirmDraft.id;
    // Close the modal right away; remove() updates the list synchronously via its
    // `changed` emit and persists in the background, so there's nothing to await.
    this.confirmOpen = false;
    this.confirmDraft = null;
    this.content.remove(id);
  }

  create(): void { this.router.navigateByUrl('/content-create'); }
  open(c: ContentDraft): void {
    const base = c.appMode === 'media' ? '/content-media/'
      : c.appMode === 'custom-canvas' || c.appMode === 'product-promo' ? '/content-canvas/'
      : '/content-builder/';
    this.router.navigateByUrl(base + c.id);
  }
}
