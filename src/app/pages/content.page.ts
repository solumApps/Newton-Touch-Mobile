import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonFooter, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonModal, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, chevronForward, trashOutline, documentsOutline, tvOutline, timeOutline } from 'ionicons/icons';
import { Router } from '@angular/router';
import { ContentService, ContentDraft } from '../services/content.service';
import { WorkspaceService } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';
import { NtButtonComponent, NtBadgeComponent, NtEmptyComponent, NtSectionHeaderComponent } from '../shared/ui';
import { Subscription } from 'rxjs';

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

  constructor(
    private content: ContentService,
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
      this.drafts = await this.content.list();
      this.cdr.detectChanges();
    });
    this.drafts = await this.content.list();
    this.loading = false;
    await this.loadWorkspace();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.contentSub?.unsubscribe();
  }

  async ionViewWillEnter(): Promise<void> {
    this.drafts = await this.content.list();
    this.loading = false;
    await this.loadWorkspace();
  }

  private async loadWorkspace(): Promise<void> {
    const w = await this.ws.get();
    this.company = w.companyName || '';
    this.store = w.storeName || '';
    this.cdr.detectChanges();
  }

  /** Pull-to-refresh — re-runs the existing reload methods. */
  async doRefresh(ev: Event): Promise<void> {
    this.drafts = await this.content.list();
    await this.loadWorkspace();
    (ev.target as any)?.complete();
  }

  /** Empty-state CTA: clears the search when one is active, otherwise creates. */
  emptyAction(): void {
    if (this.q) { this.q = ''; return; }
    this.create();
  }

  filtered(): ContentDraft[] {
    const q = this.q.toLowerCase();
    return q ? this.drafts.filter((d) => d.name.toLowerCase().includes(q)) : this.drafts;
  }

  /** Group filtered drafts by deployment status — Deployed first, then Drafts. */
  get groups(): { label: string; drafts: ContentDraft[] }[] {
    const list = this.filtered();
    const deployed = list.filter(d => !!d.deployedTo);
    const drafts = list.filter(d => !d.deployedTo);
    const out = [];
    if (deployed.length) out.push({ label: 'Deployed', drafts: deployed });
    if (drafts.length) out.push({ label: 'Drafts', drafts });
    return out;
  }

  modeLabel(m: ContentDraft['appMode']): string {
    return m === 'category' ? 'Category' : m === 'prototype' ? 'Prototype' : m === 'media' ? 'Media' : 'Prototype + ESL';
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
  async doDelete(): Promise<void> {
    if (!this.confirmDraft) return;
    await this.content.remove(this.confirmDraft.id);
    this.drafts = await this.content.list();
    this.confirmOpen = false;
    this.confirmDraft = null;
  }

  create(): void { this.router.navigateByUrl('/content-create'); }
  open(c: ContentDraft): void { this.router.navigateByUrl((c.appMode === 'media' ? '/content-media/' : '/content-builder/') + c.id); }
}
