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
    <div class="uprow">
      <button class="btn-o" (click)="pickImage()">{{ media?.type === 'image' ? 'Replace image' : 'Upload image' }}</button>
      <button class="btn-o" (click)="pickVideo()">{{ media?.type === 'video' ? 'Replace video' : 'Upload video' }}</button>
    </div>
    <p class="hint" *ngIf="!media">Choose an image or a video to play full-screen on the kiosk.</p>

    <ng-container *ngIf="media">
      <label class="lbl">How it fills the screen</label>
      <div class="seg">
        <button class="tile" [class.sel]="media.fit==='fill'" (click)="setFit('fill')">Fill</button>
        <button class="tile" [class.sel]="media.fit==='fit'" (click)="setFit('fit')">Fit</button>
        <button class="tile" [class.sel]="media.fit==='cover'" (click)="setFit('cover')">Cover</button>
      </div>
      <p class="hint">{{ fitHint }}</p>

      <label class="lbl">Preview (1920 × 540)</label>
      <div class="stage">
        <img *ngIf="media.type==='image'" [src]="media.url" [style.object-fit]="objectFit" />
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
    .wrap { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .uprow { display: flex; gap: 10px; }
    .btn-o { flex: 1; padding: 12px; border: 1px solid var(--ion-color-step-300, #ccc); border-radius: 10px; background: transparent; font-weight: 600; }
    .lbl { font-size: 13px; font-weight: 700; opacity: .8; }
    .seg { display: flex; gap: 8px; }
    .tile { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--ion-color-step-300, #ccc); background: transparent; font-weight: 700; }
    .tile.sel { background: #2F006D; color: #fff; border-color: #2F006D; }
    .hint { font-size: 12px; opacity: .65; margin: 0; }
    .stage { width: 100%; aspect-ratio: 1920 / 540; background: #0A0A1A; border-radius: 10px; overflow: hidden; }
    .stage img, .stage video { width: 100%; height: 100%; display: block; }
    .foot { padding: 12px 16px; }
    .btn-y { width: 100%; padding: 14px; border: 0; border-radius: 12px; background: #FFCD00; font-weight: 800; }
    .btn-y[disabled] { opacity: .45; }
    .ghost-action { font-size: 26px; }
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
