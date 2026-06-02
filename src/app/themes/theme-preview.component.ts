import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent } from '@ionic/angular/standalone';
import { ThemeService, SavedTheme } from '../services/theme.service';

/**
 * B2 — Theme preview. 3 compact side-by-side LCD thumbnails (Home/Intermediate/Result)
 * + config summary + swatch row + Use-in-Content + Edit + Export (.solumtheme).
 */
@Component({
  selector: 'app-theme-preview',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  styles: [`
    .wrap{padding:14px 16px 24px}
    .note{font-size:11px;color:var(--nt-muted);margin-bottom:10px}
    .thumbs{display:flex;gap:8px}
    .t{flex:1}
    .lcd{aspect-ratio:1920/540;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--nt-border)}
    .lcd .hdr{height:26%;font-family:'Barlow Condensed';font-weight:900;color:#fff;font-size:6px;display:flex;align-items:center;padding:0 5px}
    .lcd .area{flex:1;display:flex;padding:3px}
    .cell{flex:1;margin:0 1.5px;border-radius:2px}
    .cap{font-size:8px;color:var(--nt-text-2);text-align:center;margin-top:3px;font-weight:700}
    .sum{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
    .sum td{padding:6px 0;border-top:1px solid var(--nt-border)}
    .sum td:first-child{color:var(--nt-muted);width:46%}
    .sw{display:flex;gap:6px;margin-top:12px}
    .sw .s{width:28px;height:28px;border-radius:6px;border:1px solid var(--nt-border)}
    .foot{margin-top:16px}
    .exp{display:flex;gap:8px;margin-top:8px}
    .exp button{flex:1}
  `],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="back()">‹</ion-button></ion-buttons>
      <ion-title>{{ theme?.name }}</ion-title>
      <ion-buttons slot="end"><ion-button (click)="edit()">Edit</ion-button></ion-buttons>
    </ion-toolbar></ion-header>

    <ion-content *ngIf="theme as th">
      <div class="wrap">
        <div class="note">Theme = visuals only. Attach data &amp; deploy in Content.</div>

        <div class="thumbs">
          <div class="t">
            <div class="lcd" [style.background]="th.tokens.background">
              <div class="hdr" [style.background]="th.tokens.headerColor">SOLUM</div>
              <div class="area"><div class="cell" [style.background]="th.tokens.cardBackground" [style.border]="'1px solid '+th.tokens.accent"></div><div class="cell" [style.background]="th.tokens.cardBackground"></div><div class="cell" [style.background]="th.tokens.cardBackground"></div></div>
            </div><div class="cap">HOME</div>
          </div>
          <div class="t" *ngIf="th.tokens.includeIntermediate">
            <div class="lcd" [style.background]="th.tokens.intermediate.background">
              <div class="hdr" [style.background]="th.tokens.intermediate.headerColor">Bakery ›</div>
              <div class="area" style="flex-direction:column"><div class="cell" style="margin:1.5px 0" [style.background]="th.tokens.accent"></div><div class="cell" style="margin:1.5px 0" [style.background]="th.tokens.intermediate.cardBackground"></div></div>
            </div><div class="cap">INTERMEDIATE</div>
          </div>
          <div class="t">
            <div class="lcd" [style.background]="th.tokens.result.background">
              <div class="hdr" [style.background]="th.tokens.result.headerColor">Result</div>
              <div class="area"><div class="cell" [style.background]="th.tokens.result.cardBackground"></div><div class="cell" [style.background]="th.tokens.result.accent"></div></div>
            </div><div class="cap">RESULT</div>
          </div>
        </div>

        <table class="sum">
          <tr><td>Home layout</td><td>{{ th.tokens.homeLayout }}</td></tr>
          <tr><td>Card style</td><td>{{ th.tokens.cardStyle }}</td></tr>
          <tr><td>Intermediate</td><td>{{ th.tokens.includeIntermediate ? th.tokens.intermediateStyle : 'Skipped (Home → Result)' }}</td></tr>
          <tr><td>Result</td><td>{{ th.tokens.resultTemplate }}</td></tr>
        </table>

        <div class="sw">
          <div class="s" [style.background]="th.tokens.headerColor"></div>
          <div class="s" [style.background]="th.tokens.background"></div>
          <div class="s" [style.background]="th.tokens.accent"></div>
          <div class="s" [style.background]="th.tokens.cardText"></div>
        </div>

        <div class="foot">
          <button class="btn-y" (click)="useInContent()">Use in Content →</button>
          <div class="exp">
            <button class="btn-o" (click)="edit()">Edit</button>
            <button class="btn-o" (click)="download()">⬇ Export</button>
            <button class="btn-o" (click)="copy()">⧉ Copy</button>
          </div>
          <div class="note" *ngIf="msg">{{ msg }}</div>
        </div>
      </div>
    </ion-content>
  `,
})
export class ThemePreviewComponent implements OnInit {
  theme?: SavedTheme;
  msg = '';

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

  download(): void {
    if (!this.theme) return;
    const blob = new Blob([this.themes.export(this.theme)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${this.theme.name.replace(/\s+/g, '')}.solumtheme`; a.click();
    URL.revokeObjectURL(url);
    this.msg = 'Exported .solumtheme';
  }

  async copy(): Promise<void> {
    if (!this.theme) return;
    try { await navigator.clipboard.writeText(this.themes.export(this.theme)); this.msg = 'Theme code copied'; }
    catch { this.msg = 'Copy not available'; }
  }

  useInContent(): void { this.router.navigateByUrl('/content-create?theme=' + this.theme!.id); }
  back(): void { this.router.navigateByUrl('/tabs/themes'); }
}
