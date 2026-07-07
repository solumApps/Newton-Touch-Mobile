import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { ImagePickerService } from '../services/image-picker.service';
import type { MediaContent } from '@contract/layout';

type Fit = MediaContent['fit'];

/** Media-only editor (appMode 'media'): upload a single image or video, choose how
 *  it fills the screen (Fill / Fit / Cover), preview it on a 1920:540 stage mock,
 *  then deploy. The chosen fit maps 1:1 to CSS object-fit on the LCD. */
@Component({
  selector: 'app-content-media',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter],
  template: `
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="start"><ion-button class="ghost-action" (click)="back()" aria-label="Back">‹</ion-button></ion-buttons>
    <ion-title>Upload Media</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="wrap" *ngIf="draft">
    <div class="media-panel" [class.has-media]="!!media">
      <div class="panel-copy">
        <div class="eyebrow">Media screen</div>
        <h2>{{ media ? 'Ready to deploy' : 'Add full-screen kiosk media' }}</h2>
        <p>{{ media ? 'Preview the 1920 × 540 LCD crop and choose how the media fills the screen.' : 'Upload one image or video that will play as a full-screen LCD experience.' }}</p>
      </div>
      <div class="uprow">
        <button class="btn-o" (click)="pickImage()">
          <span class="btn-ic">＋</span>
          {{ media?.type === 'image' ? 'Replace image' : 'Upload image' }}
        </button>
        <button class="btn-o" (click)="pickVideo()">
          <span class="btn-ic">▶</span>
          {{ media?.type === 'video' ? 'Replace video' : 'Upload video' }}
        </button>
      </div>
    </div>

    <ng-container *ngIf="media">
      <div class="lbl">How it fills the screen</div>
      <div class="seg">
        <button class="tile" [class.sel]="media.fit==='fill'" (click)="setFit('fill')">Fill</button>
        <button class="tile" [class.sel]="media.fit==='fit'" (click)="setFit('fit')">Fit</button>
        <button class="tile" [class.sel]="media.fit==='cover'" (click)="setFit('cover')">Cover</button>
      </div>
      <p class="hint">{{ fitHint }}</p>

      <div class="lbl">Preview (1920 × 540)</div>
      <div class="stage">
        <img *ngIf="media.type==='image'" [src]="media.url" [style.object-fit]="objectFit" alt="Uploaded media preview" />
        <video *ngIf="media.type==='video'" [src]="media.url" [style.object-fit]="objectFit" autoplay loop muted playsinline></video>
      </div>
    </ng-container>
  </div>
</ion-content>

<ion-footer class="foot">
  <button class="btn-y" [disabled]="!media" (click)="deploy()">Deploy →</button>
</ion-footer>
`,
  styles: [`
    ion-toolbar {
      --background: linear-gradient(135deg, #2F006D 0%, #001973 100%);
      --color: #fff;
      --min-height: 72px;
      --padding-start: 12px;
      --padding-end: 12px;
      box-shadow: 0 8px 22px rgba(15, 23, 42, .16);
    }
    ion-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -.5px;
    }
    .wrap {
      min-height: 100%;
      padding: 20px 20px 92px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      background:
        radial-gradient(circle at 20% 0%, rgba(255, 205, 0, .12), transparent 26%),
        #f7f8fb;
    }
    .media-panel {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 22px;
      border: 1px solid rgba(47, 0, 109, .10);
      border-radius: 24px;
      background: linear-gradient(180deg, #fff 0%, #fbfaff 100%);
      box-shadow: 0 18px 45px rgba(15, 23, 42, .08);
    }
    .media-panel.has-media { padding-bottom: 18px; }
    .panel-copy { display: grid; gap: 7px; }
    .eyebrow {
      color: #2F006D;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .12em;
    }
    h2 {
      margin: 0;
      color: #101828;
      font-size: 24px;
      line-height: 1.08;
      font-weight: 900;
      letter-spacing: -.35px;
    }
    .panel-copy p {
      margin: 0;
      color: #667085;
      font-size: 14px;
      line-height: 1.45;
    }
    .uprow {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .btn-o {
      min-height: 62px;
      padding: 12px 10px;
      border: 1.5px solid rgba(47, 0, 109, .18);
      border-radius: 18px;
      background: #fff;
      color: #2F006D;
      font-weight: 850;
      font-size: 15px;
      font-family: inherit;
      box-shadow: 0 8px 20px rgba(47, 0, 109, .06);
    }
    .btn-o:active { transform: translateY(1px); }
    .btn-ic {
      display: block;
      margin: 0 auto 4px;
      color: #FFCD00;
      font-size: 18px;
      line-height: 1;
    }
    .lbl {
      color: #344054;
      font-size: 13px;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .seg {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .tile {
      min-height: 44px;
      padding: 10px;
      border-radius: 14px;
      border: 1.5px solid rgba(47, 0, 109, .16);
      background: #fff;
      color: #475467;
      font-weight: 800;
      font-family: inherit;
    }
    .tile.sel { background: #2F006D; color: #fff; border-color: #2F006D; box-shadow: 0 8px 18px rgba(47, 0, 109, .18); }
    .hint { font-size: 13px; color: #667085; margin: -8px 0 0; line-height: 1.4; }
    .stage {
      width: 100%;
      aspect-ratio: 1920 / 540;
      background: #0A0A1A;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 16px 34px rgba(15, 23, 42, .16);
    }
    .stage img, .stage video { width: 100%; height: 100%; display: block; }
    .foot {
      padding: 14px 20px 20px;
      background: rgba(255, 255, 255, .92);
      border-top: 1px solid rgba(15, 23, 42, .08);
      box-shadow: 0 -12px 30px rgba(15, 23, 42, .08);
    }
    .btn-y {
      width: 100%;
      min-height: 58px;
      padding: 14px;
      border: 0;
      border-radius: 18px;
      background: #FFCD00;
      color: #12002D;
      font-size: 18px;
      font-family: inherit;
      font-weight: 900;
      box-shadow: 0 10px 24px rgba(255, 205, 0, .24);
    }
    .btn-y[disabled] {
      background: #e4e7ec;
      color: #98a2b3;
      box-shadow: none;
    }
    .ghost-action { font-size: 32px; --color: #fff; --padding-start: 4px; --padding-end: 12px; }
    @media (max-width: 380px) {
      ion-title { font-size: 23px; }
      .wrap { padding-left: 14px; padding-right: 14px; }
      .media-panel { padding: 18px; border-radius: 20px; }
      .uprow { grid-template-columns: 1fr; }
    }
  `],
})
export class ContentMediaComponent implements OnInit {
  draft?: ContentDraft;
  media?: MediaContent;

  constructor(private content: ContentService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.draft = (await this.content.list()).find((d) => d.id === id);
    if (!this.draft) { this.router.navigateByUrl('/tabs/content'); return; }
    this.media = this.draft.media;
  }

  /** Fill → stretch (object-fit:fill); Fit → letterbox (contain); Cover → crop. */
  get objectFit(): string { return this.media?.fit === 'fit' ? 'contain' : (this.media?.fit || 'cover'); }
  get fitHint(): string {
    return this.media?.fit === 'fill' ? 'Stretches to fill the screen — may distort aspect ratio.'
      : this.media?.fit === 'fit' ? 'Shows the whole media — may letterbox with bars.'
      : 'Fills the screen and crops the overflow — no distortion.';
  }

  async pickImage(): Promise<void> {
    const url = await this.picker.pick('image/*');
    if (url) this.set({ type: 'image', url, fit: this.media?.fit || 'cover' });
  }
  async pickVideo(): Promise<void> {
    const url = await this.picker.pickRaw('video/*');
    if (url) this.set({ type: 'video', url, fit: this.media?.fit || 'cover' });
  }
  setFit(fit: Fit): void { if (this.media) this.set({ ...this.media, fit }); }

  private async set(m: MediaContent): Promise<void> {
    this.media = m;
    if (this.draft) { this.draft.media = m; this.draft.updatedAt = Date.now(); await this.content.save(this.draft); }
  }

  async deploy(): Promise<void> {
    if (!this.draft || !this.media) return;
    await this.content.save(this.draft);
    this.router.navigateByUrl('/deploy/' + this.draft.id);
  }

  back(): void { this.router.navigateByUrl('/tabs/content'); }
}
