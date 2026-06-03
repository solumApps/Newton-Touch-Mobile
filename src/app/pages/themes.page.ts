import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonFooter, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption } from '@ionic/angular/standalone';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { WorkspaceService } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';

type Sort = 'Name' | 'Recent';

@Component({
  selector: 'app-themes',
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, PageHeaderComponent],
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

  constructor(private themes: ThemeService, private ws: WorkspaceService, private router: Router) {}

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

  async del(t: SavedTheme): Promise<void> {
    if (!confirm(`Delete theme "${t.name}"? This cannot be undone.`)) return;
    await this.themes.remove(t.id);
    this.mine = await this.themes.list();
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
