import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { ThemeService, SavedTheme } from '../services/theme.service';

@Component({
  selector: 'app-themes',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonList, IonItem, IonLabel],
  template: `
    <ion-header><ion-toolbar><ion-title>Themes</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <ion-searchbar placeholder="Search themes" (ionInput)="q = $any($event.target).value || ''"></ion-searchbar>

      <h3 style="font-size:12px;color:#64748B;text-transform:uppercase">Predefined</h3>
      <ion-card *ngFor="let t of filter(predefined)" button (click)="use(t)">
        <ion-card-header><ion-card-title>{{ t.name }}</ion-card-title>
          <ion-card-subtitle>{{ t.tokens.homeLayout }} · {{ t.tokens.cardStyle }}</ion-card-subtitle></ion-card-header>
      </ion-card>

      <h3 style="font-size:12px;color:#64748B;text-transform:uppercase">My Themes ({{ mine.length }})</h3>
      <ion-list>
        <ion-item *ngFor="let t of filter(mine)" button detail (click)="use(t)">
          <ion-label>{{ t.name }}<p>{{ t.tokens.homeLayout }} · {{ t.tokens.cardStyle }} · {{ t.tokens.resultTemplate }}</p></ion-label>
          <ion-button slot="end" fill="clear" (click)="exportTheme(t); $event.stopPropagation()">⤴</ion-button>
        </ion-item>
        <ion-item *ngIf="!mine.length"><ion-label color="medium">No saved themes yet</ion-label></ion-item>
      </ion-list>

      <ion-button expand="block" (click)="createNew()">+ Create New Theme</ion-button>
      <ion-button expand="block" fill="outline" (click)="picker.click()">⬆ Import (.solumtheme)</ion-button>
      <input #picker type="file" accept=".solumtheme,application/json" hidden (change)="onImport($event)" />
    </ion-content>
  `,
})
export class ThemesPage implements OnInit {
  q = '';
  predefined: SavedTheme[] = [];
  mine: SavedTheme[] = [];

  constructor(private themes: ThemeService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.predefined = ThemeService.predefined();
    this.mine = await this.themes.list();
  }

  filter(list: SavedTheme[]): SavedTheme[] {
    const q = this.q.toLowerCase();
    return q ? list.filter((t) => t.name.toLowerCase().includes(q)) : list;
  }

  async ionViewWillEnter(): Promise<void> { this.mine = await this.themes.list(); }

  use(t: SavedTheme): void { this.router.navigateByUrl('/theme-preview/' + t.id); }

  createNew(): void { this.router.navigateByUrl('/theme-wizard'); }

  exportTheme(t: SavedTheme): void {
    const blob = new Blob([this.themes.export(t)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${t.name.replace(/\s+/g, '')}.solumtheme`; a.click();
    URL.revokeObjectURL(url);
  }

  async onImport(ev: Event): Promise<void> {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const t = await this.themes.import(await file.text());
      this.mine = await this.themes.list();
      console.log('Imported theme', t.name);
    } catch (e) {
      console.error('Import failed', e);
    }
  }
}
