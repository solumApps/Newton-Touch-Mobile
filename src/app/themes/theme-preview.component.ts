import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonNote } from '@ionic/angular/standalone';
import { ThemeService, SavedTheme } from '../services/theme.service';

/**
 * B2 — Theme preview. Shows 3 LCD mini-previews (Home / Intermediate / Result)
 * rendered from the theme tokens, plus Edit (→ wizard; predefined clones first)
 * and "Use in Content" (→ content create with theme preselected).
 */
@Component({
  selector: 'app-theme-preview',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonNote],
  styles: [`
    .lcd{border-radius:8px;overflow:hidden;margin-bottom:12px;aspect-ratio:1920/540;display:flex;flex-direction:column}
    .lcd .hdr{font-family:'Barlow Condensed';font-weight:900;color:#fff;font-size:13px;padding:5px 10px}
    .lcd .area{flex:1;display:flex;padding:7px}
    .cap{font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin:2px 0 5px}
    .cell{flex:1;margin:0 3px;border-radius:4px;display:flex;align-items:flex-end;padding:4px;font-size:9px;font-weight:800}
    .row{display:flex;flex-direction:column}
    .barrow{height:10px;border-radius:3px;margin:0 3px 4px}
  `],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="back()">‹</ion-button></ion-buttons>
      <ion-title>{{ theme?.name }}</ion-title>
      <ion-buttons slot="end"><ion-button (click)="edit()">Edit</ion-button></ion-buttons>
    </ion-toolbar></ion-header>

    <ion-content class="ion-padding" *ngIf="theme as th">
      <ion-note color="medium">Theme = visuals only. Attach data &amp; deploy in Content.</ion-note>

      <div class="cap">Home · {{ th.tokens.homeLayout }} · {{ th.tokens.cardStyle }}</div>
      <div class="lcd" [style.background]="th.tokens.background">
        <div class="hdr" [style.background]="th.tokens.headerColor">NEWTON TOUCH</div>
        <div class="area">
          <div class="cell" *ngFor="let i of [1,2,3]" [style.background]="th.tokens.cardBackground" [style.color]="th.tokens.cardText"
               [style.border]="i===1 ? '2px solid ' + th.tokens.accent : 'none'">{{ i }}</div>
        </div>
      </div>

      <div class="cap">Intermediate · {{ th.tokens.intermediateStyle }}</div>
      <div class="lcd" [style.background]="th.tokens.intermediate.background">
        <div class="hdr" [style.background]="th.tokens.intermediate.headerColor">Bakery › Choose a type</div>
        <div class="area row">
          <div class="barrow" [style.background]="th.tokens.accent" style="flex:2"></div>
          <div class="barrow" [style.background]="th.tokens.intermediate.cardBackground"></div>
          <div class="barrow" [style.background]="th.tokens.intermediate.cardBackground"></div>
        </div>
      </div>

      <div class="cap">Result · {{ th.tokens.resultTemplate }}</div>
      <div class="lcd" [style.background]="th.tokens.result.background">
        <div class="hdr" [style.background]="th.tokens.result.headerColor">Sourdough — Aisle 4</div>
        <div class="area">
          <div class="cell" style="flex:1" [style.background]="th.tokens.result.cardBackground"></div>
          <div class="row" style="flex:1">
            <div class="barrow" [style.background]="th.tokens.result.accent"></div>
            <div class="barrow" [style.background]="th.tokens.result.cardBackground"></div>
          </div>
        </div>
      </div>

      <ion-button expand="block" (click)="useInContent()">Use in Content →</ion-button>
      <ion-button expand="block" fill="outline" (click)="edit()">Edit theme</ion-button>
    </ion-content>
  `,
})
export class ThemePreviewComponent implements OnInit {
  theme?: SavedTheme;

  constructor(private themes: ThemeService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.theme = await this.themes.getById(id);
    if (!this.theme) this.router.navigateByUrl('/tabs/themes');
  }

  async edit(): Promise<void> {
    if (!this.theme) return;
    if (this.theme.predefined) {
      const copy = await this.themes.cloneFrom(this.theme, this.theme.name + ' Copy');
      this.router.navigateByUrl('/theme-wizard/' + copy.id);
    } else {
      this.router.navigateByUrl('/theme-wizard/' + this.theme.id);
    }
  }

  useInContent(): void { this.router.navigateByUrl('/content-create?theme=' + this.theme!.id); }
  back(): void { this.router.navigateByUrl('/tabs/themes'); }
}
