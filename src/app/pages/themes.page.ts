import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonModal } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, swapVerticalOutline, chevronForward, cloudUploadOutline, trashOutline, colorPaletteOutline } from 'ionicons/icons';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { WorkspaceService } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';
import { NtButtonComponent, NtBadgeComponent, NtEmptyComponent, NtSectionHeaderComponent } from '../shared/ui';

type Sort = 'Name' | 'Recent';

@Component({
  selector: 'app-themes',
  standalone: true,
  imports: [CommonModule, IonContent, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonIcon, IonModal, PageHeaderComponent, NtButtonComponent, NtBadgeComponent, NtEmptyComponent, NtSectionHeaderComponent],
  templateUrl: './themes.page.html',
  styleUrls: ['./themes.page.scss'],
})
export class ThemesPage implements OnInit {
  q = '';
  filter = 'All';
  filters = ['All', 'Grid', 'Hero', 'List', 'Dark', 'Light'];
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

  constructor(private themes: ThemeService, private ws: WorkspaceService, private router: Router) {
    addIcons({ searchOutline, swapVerticalOutline, chevronForward, cloudUploadOutline, trashOutline, colorPaletteOutline });
  }

  async ngOnInit(): Promise<void> {
    this.predefined = ThemeService.predefined();
    this.mine = await this.themes.list();
    this.loading = false;
    const w = await this.ws.get();
    this.company = w.companyName || '';
    this.store = w.storeName || '';
  }
  async ionViewWillEnter(): Promise<void> { this.mine = await this.themes.list(); }

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

  get filteredMine(): SavedTheme[] {
    const q = this.q.toLowerCase();
    let list = q ? this.mine.filter((t) => t.name.toLowerCase().includes(q)) : [...this.mine];
    if (this.filter !== 'All') {
      const f = this.filter.toLowerCase();
      list = list.filter((t) =>
        t.tokens.homeLayout.toLowerCase().includes(f) ||
        (f === 'dark' && /#0|#1|gradient/i.test(t.tokens.background)) ||
        (f === 'light' && /#f|#fff/i.test(t.tokens.background)));
    }
    list.sort((a, b) => this.sort === 'Name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt);
    return list;
  }

  /** Open the modal confirm dialog (replaces blocking JS confirm). */
  del(t: SavedTheme): void {
    this.confirmTheme = t;
    this.confirmOpen = true;
  }
  async doDelete(): Promise<void> {
    if (!this.confirmTheme) return;
    await this.themes.remove(this.confirmTheme.id);
    this.mine = await this.themes.list();
    this.confirmOpen = false;
    this.confirmTheme = null;
  }

  use(t: SavedTheme): void { this.router.navigateByUrl('/theme-preview/' + t.id); }
  createNew(): void { this.router.navigateByUrl('/theme-wizard'); }

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
