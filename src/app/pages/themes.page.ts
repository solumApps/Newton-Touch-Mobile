import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonContent } from '@ionic/angular/standalone';
import { ThemeService, SavedTheme } from '../services/theme.service';
import { WorkspaceService } from '../services/workspace.service';

@Component({
  selector: 'app-themes',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonContent],
  styles: [`
    .bar{display:flex;align-items:center;justify-content:space-between;padding:0 6px}
    .bar img{height:20px}
    .bar .store{font-size:11px;color:rgba(255,255,255,.8)}
    .wrap{padding:12px 16px 24px}
    .srch{display:flex;gap:8px;align-items:center;margin-bottom:8px}
    .srch input{flex:1;border:1px solid var(--nt-border);border-radius:8px;padding:9px 12px;font-size:13px;font-family:inherit}
    .sort{border:1.5px solid var(--nt-border);border-radius:8px;padding:8px 10px;font-size:11px;color:var(--nt-text-2);background:var(--nt-surface);white-space:nowrap}
    .chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px}
    .lbl{font-size:10px;font-weight:700;color:var(--nt-text-2);text-transform:uppercase;letter-spacing:.5px;margin:10px 0 6px}
    .hscroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}
    .thumb{flex-shrink:0;width:96px;border:1px solid var(--nt-border);border-radius:8px;overflow:hidden;cursor:pointer}
    .thumb .prev{height:54px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:2px;padding:8px 6px}
    .thumb .prev .c{border-radius:1px;background:rgba(255,255,255,.22)}
    .thumb .nm{padding:4px 6px;font-size:9px;font-weight:700;color:var(--nt-text)}
    .thumb .ds{padding:0 6px 5px;font-size:8px;color:var(--nt-muted)}
    .row{display:flex;align-items:center;gap:10px;margin-bottom:6px;cursor:pointer}
    .row .sw{width:36px;height:36px;border-radius:7px;flex-shrink:0}
    .row .nm{font-size:12px;font-weight:700;color:var(--nt-text)}
    .row .ds{font-size:9px;color:var(--nt-muted)}
    .row .chev{margin-left:auto;color:var(--nt-muted)}
    .foot{display:flex;gap:8px;margin-top:14px}
  `],
  template: `
    <ion-header><ion-toolbar>
      <div class="bar"><img src="assets/solum-logo-white.svg" alt="SOLUM" /><span class="store">{{ store }}</span></div>
    </ion-toolbar></ion-header>
    <ion-content>
      <div class="wrap">
        <div class="srch">
          <input placeholder="Search themes" (input)="q=$any($event.target).value||''" />
          <div class="sort">⇅ Sort</div>
        </div>
        <div class="chips">
          <span class="chip" [class.act]="filter==='All'" *ngFor="let f of filters" (click)="filter=f">{{ f }}</span>
        </div>

        <div class="lbl">Predefined · swipe →</div>
        <div class="hscroll">
          <div class="thumb" *ngFor="let t of predefined" (click)="use(t)">
            <div class="prev" [style.background]="t.tokens.background">
              <div class="c" [style.border]="'1px solid '+t.tokens.accent"></div><div class="c"></div><div class="c"></div>
              <div class="c"></div><div class="c"></div><div class="c"></div>
            </div>
            <div class="nm">{{ t.name }}</div><div class="ds">{{ t.tokens.homeLayout }} · {{ t.tokens.cardStyle }}</div>
          </div>
        </div>

        <div class="lbl">My Themes ({{ mine.length }})</div>
        <div class="crd row" *ngFor="let t of filtered(mine)" (click)="use(t)">
          <div class="sw" [style.background]="t.tokens.background"></div>
          <div><div class="nm">{{ t.name }}</div><div class="ds">{{ t.tokens.homeLayout }} · {{ t.tokens.cardStyle }} · {{ t.tokens.resultTemplate }}</div></div>
          <span class="chev">›</span>
        </div>
        <div *ngIf="!mine.length" class="ds" style="color:var(--nt-muted);font-size:12px">No saved themes yet.</div>

        <div class="foot">
          <button class="btn-y" (click)="createNew()">+ Create New Theme</button>
          <button class="btn-o" style="flex:0 0 96px" (click)="picker.click()">⬆ Import</button>
        </div>
        <input #picker type="file" accept=".solumtheme,application/json" hidden (change)="onImport($event)" />
      </div>
    </ion-content>
  `,
})
export class ThemesPage implements OnInit {
  q = '';
  filter = 'All';
  filters = ['All', 'Grid', 'Hero', 'List', 'Dark', 'Light'];
  predefined: SavedTheme[] = [];
  mine: SavedTheme[] = [];
  store = '';

  constructor(private themes: ThemeService, private ws: WorkspaceService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.predefined = ThemeService.predefined();
    this.mine = await this.themes.list();
    this.store = (await this.ws.get()).storeName || '';
  }
  async ionViewWillEnter(): Promise<void> { this.mine = await this.themes.list(); }

  filtered(list: SavedTheme[]): SavedTheme[] {
    const q = this.q.toLowerCase();
    return q ? list.filter((t) => t.name.toLowerCase().includes(q)) : list;
  }

  use(t: SavedTheme): void { this.router.navigateByUrl('/theme-preview/' + t.id); }
  createNew(): void { this.router.navigateByUrl('/theme-wizard'); }

  exportTheme(t: SavedTheme): void {
    const blob = new Blob([this.themes.export(t)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${t.name.replace(/\s+/g, '')}.solumtheme`; a.click();
    URL.revokeObjectURL(url);
  }

  async onImport(ev: Event): Promise<void> {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try { await this.themes.import(await file.text()); this.mine = await this.themes.list(); }
    catch (e) { console.error('Import failed', e); }
  }
}
