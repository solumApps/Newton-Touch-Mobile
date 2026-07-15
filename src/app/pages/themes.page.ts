import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, swapVerticalOutline, chevronForward, cloudUploadOutline, trashOutline, colorPaletteOutline, createOutline } from 'ionicons/icons';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { WorkspaceService } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';
import { ContentPreviewStripComponent } from '../shared/content-preview-strip.component';
import { NtButtonComponent, NtBadgeComponent, NtEmptyComponent, NtSectionHeaderComponent } from '../shared/ui';
import { Subscription } from 'rxjs';

type Sort = 'Name' | 'Recent';

@Component({
  selector: 'app-themes',
  standalone: true,
  imports: [CommonModule, IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonModal, PageHeaderComponent, ContentPreviewStripComponent, NtButtonComponent, NtBadgeComponent, NtEmptyComponent, NtSectionHeaderComponent],
  templateUrl: './themes.page.html',
  styleUrls: ['./themes.page.scss'],
})
export class ThemesPage implements OnInit, OnDestroy {
  q = '';
  filter = 'All';
  sort: Sort = 'Name';
  predefined: SavedTheme[] = [];
  mine: SavedTheme[] = [];
  company = '';
  store = '';
  msg = '';
  msgErr = false;
  loading = true;
  confirmOpen = false;
  confirmTheme: SavedTheme | null = null;
  featuredIndex = 0;
  private wsSub?: Subscription;

  constructor(
    private themes: ThemeService,
    private ws: WorkspaceService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ searchOutline, swapVerticalOutline, chevronForward, cloudUploadOutline, trashOutline, colorPaletteOutline, createOutline });
  }

  private themesSub?: Subscription;

  async ngOnInit(): Promise<void> {
    this.wsSub = this.ws.changed.subscribe(w => {
      this.company = w.companyName || '';
      this.store = w.storeName || '';
      this.cdr.detectChanges();
    });
    // Refresh the list whenever a theme is saved/removed/imported — covers the case
    // where returning from the wizard doesn't re-fire the Ionic view lifecycle.
    this.themesSub = this.themes.changed.subscribe(async () => {
      this.mine = await this.themes.list();
      this.cdr.detectChanges();
    });
    this.predefined = ThemeService.predefined();
    this.mine = await this.themes.list();
    this.loading = false;
    await this.loadWorkspace();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.themesSub?.unsubscribe();
  }
  async ionViewWillEnter(): Promise<void> {
    this.mine = await this.themes.list();
    await this.loadWorkspace();
  }
  private async loadWorkspace(): Promise<void> {
    const w = await this.ws.get();
    this.company = w.companyName || '';
    this.store = w.storeName || '';
    this.cdr.detectChanges();
  }

  cycleSort(): void { this.sort = this.sort === 'Name' ? 'Recent' : 'Name'; }

  onFeaturedScroll(el: HTMLElement): void {
    const w = this.featuredStepWidth(el);
    this.featuredIndex = Math.round(el.scrollLeft / w);
  }

  goFeatured(el: HTMLElement, i: number): void {
    el.scrollTo({ left: i * this.featuredStepWidth(el), behavior: 'smooth' });
    this.featuredIndex = i;
  }

  private featuredStepWidth(el: HTMLElement): number {
    const card = el.querySelector<HTMLElement>('.pre-card');
    if (!card) return el.clientWidth || 1;
    const gap = parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || '0');
    return card.offsetWidth + (Number.isFinite(gap) ? gap : 0);
  }

  get filters(): string[] {
    const labels = new Set<string>();
    for (const theme of this.mine) labels.add(this.themeFilterLabel(theme));
    return ['All', ...Array.from(labels).sort((a, b) => a.localeCompare(b))];
  }

  themeFilterLabel(t: SavedTheme): string {
    const layout = t.tokens.homeLayout;
    const labels: Partial<Record<string, string>> = {
      'promo-categories': 'Promo',
      'finder-select': 'Finder',
      'image-strip': 'Catalog',
      bento: 'Bento',
      fullscreen: 'Fullscreen',
      'col-2': 'Columns',
      'col-3': 'Columns',
      'col-4': 'Columns',
      'grid-2x2': 'Columns',
      'grid-2x3': 'Columns',
      'h-scroll': 'Rail',
      'hero-list': 'Hero list',
      list: 'Rows',
      'hero-start': 'Hero start',
    };
    return labels[layout] || layout;
  }

  get filteredMine(): SavedTheme[] {
    const q = this.q.toLowerCase();
    let list = q ? this.mine.filter((t) => t.name.toLowerCase().includes(q)) : [...this.mine];
    if (this.filter !== 'All') {
      list = list.filter((t) => this.themeFilterLabel(t) === this.filter);
    }
    list.sort((a, b) => this.sort === 'Name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt);
    return list;
  }

  /** Empty-state CTA: clears the search when one is active, otherwise creates. */
  emptyAction(): void {
    if (this.q) { this.q = ''; return; }
    this.createNew();
  }

  /** Open the modal confirm dialog (replaces blocking JS confirm). */
  del(t: SavedTheme): void {
    this.confirmTheme = t;
    this.confirmOpen = true;
  }
  doDelete(): void {
    if (!this.confirmTheme) return;
    const id = this.confirmTheme.id;
    // Close the modal right away; remove() updates the list synchronously via its
    // `changed` emit and persists in the background, so there's nothing to await.
    this.confirmOpen = false;
    this.confirmTheme = null;
    this.themes.remove(id);
  }

  use(t: SavedTheme): void { this.router.navigateByUrl('/theme-preview/' + t.id); }
  createNew(): void { this.router.navigateByUrl('/theme-wizard'); }
  edit(t: SavedTheme): void { this.router.navigate(['/theme-wizard', t.id], { queryParams: { from: 'themes' } }); }

  async onImport(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.msg = ''; this.msgErr = false;
    if (!file.name.toLowerCase().endsWith('.solumtheme')) {
      this.msgErr = true; this.msg = 'Only .solumtheme files are supported.'; return;
    }
    try {
      const t = await this.themes.import(await file.text());
      this.mine = await this.themes.list();
      this.msg = `Imported "${t.name}".`;
    } catch {
      this.msgErr = true; this.msg = 'Invalid .solumtheme file — could not import.';
    }
  }
}
