import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonLabel, IonList, IonListHeader, IonNote, IonSelect, IonSelectOption, IonCheckbox } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { CategoryApiService, ApiProduct } from '../services/category-api.service';
import { WorkspaceService } from '../services/workspace.service';
import { ImagePickerService } from '../services/image-picker.service';
import type { ResultProduct, CardItem } from '@contract/layout';

/**
 * Prototype / Prototype+ESL data entry (offline, fully static).
 * Add/remove Home cards & Result products with dynamic count; +ESL adds id mapping.
 * Category mode shows a fetch placeholder (API wiring later). Saves to the draft.
 */
@Component({
  selector: 'app-content-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonLabel, IonList, IonListHeader, IonNote, IonSelect, IonSelectOption, IonCheckbox],
  styles: [`
    ion-list-header ion-label{font-size:11px !important;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--nt-text-2)}
    .tband{display:flex;align-items:center;gap:10px;margin:0 0 8px}
    .tband .sw{width:30px;height:30px;border-radius:7px;flex-shrink:0}
    .tband .nm{font-size:13px;font-weight:700;color:var(--nt-text)}
    .tband .ds{font-size:10px;color:var(--nt-muted);text-transform:uppercase;letter-spacing:.5px}
  `],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="back()">‹</ion-button></ion-buttons>
      <ion-title>{{ draft?.name }} · {{ modeLabel }}</ion-title>
      <ion-buttons slot="end"><ion-button (click)="save()">Save</ion-button></ion-buttons>
    </ion-toolbar></ion-header>

    <ion-content class="ion-padding" *ngIf="draft as d">
      <div class="tband">
        <div class="sw" [style.background]="d.themeTokens.background"></div>
        <div><div class="nm">{{ d.themeName }}</div><div class="ds">{{ modeLabel }} · {{ d.themeTokens.homeLayout }}</div></div>
      </div>
      <!-- CATEGORY (CAT-1): fetch from API → select subset → map -->
      <ion-list *ngIf="d.appMode === 'category'">
        <ion-list-header><ion-label>Category API</ion-label>
          <ion-button size="small" (click)="fetch()">{{ apiProducts.length ? 'Re-fetch' : 'Fetch products' }}</ion-button>
        </ion-list-header>
        <ion-note color="medium" *ngIf="!apiProducts.length && !fetchError">Pull products from the server (name, price, IDs come from API · images are uploaded).</ion-note>
        <ion-note color="danger" *ngIf="fetchError">{{ fetchError }}</ion-note>
        <ion-item *ngIf="apiProducts.length">
          <ion-select label="Hierarchy fields" [(ngModel)]="d.fieldSource" placeholder="choose">
            <ion-select-option value="category">Category fields (category1–4)</ion-select-option>
            <ion-select-option value="etc">ETC fields (etc0–3)</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item *ngFor="let p of apiProducts">
          <ion-checkbox slot="start" [checked]="selected.has(p.productId)" (ionChange)="toggle(p.productId)"></ion-checkbox>
          <ion-label>{{ p.name }}<p>{{ p.price }}<span *ngIf="p.zone"> · {{ p.zone }}</span> · {{ p.articleId }}</p></ion-label>
        </ion-item>
        <ion-button *ngIf="apiProducts.length" expand="block" fill="outline" (click)="applySelection()">
          Use {{ selected.size }} selected → build pages
        </ion-button>
      </ion-list>

      <ion-list>
        <ion-list-header><ion-label>Home cards ({{ d.home.length }})</ion-label>
          <ion-button size="small" (click)="addCard()">+ Add</ion-button></ion-list-header>
        <ion-item *ngFor="let c of d.home; let i = index">
          <div *ngIf="needsImage" slot="start" style="width:40px;height:40px;border-radius:6px;border:1.5px dashed #cbd5e1;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer"
               [style.background-image]="c.image ? 'url('+c.image+')' : null" (click)="pickImage(c)">{{ c.image ? '' : '📷' }}</div>
          <ion-input [(ngModel)]="c.name" placeholder="Card name"></ion-input>
          <ion-button slot="end" fill="clear" color="medium" (click)="d.home.splice(i,1)">✕</ion-button>
        </ion-item>
        <ion-note *ngIf="needsImage" color="medium" style="font-size:11px;padding-left:16px">Card style “{{ d.themeTokens.cardStyle }}” shows an image — tap 📷 to upload one per card.</ion-note>
      </ion-list>

      <ion-list>
        <ion-list-header><ion-label>Result products ({{ d.result.products.length }})</ion-label>
          <ion-button size="small" (click)="addProduct()">+ Add</ion-button></ion-list-header>
        <div *ngFor="let p of d.result.products; let i = index" style="border-bottom:1px solid #eee;padding:4px 0">
          <ion-item lines="none">
            <div slot="start" style="width:40px;height:40px;border-radius:6px;border:1.5px dashed #cbd5e1;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer"
                 [style.background-image]="p.image ? 'url('+p.image+')' : null" (click)="pickImage(p)">{{ p.image ? '' : '📷' }}</div>
            <ion-input [(ngModel)]="p.name" placeholder="Product name"></ion-input>
            <ion-button slot="end" fill="clear" color="medium" (click)="d.result.products.splice(i,1)">✕</ion-button></ion-item>
          <ion-item lines="none"><ion-input [(ngModel)]="p.price" placeholder="Price"></ion-input>
            <ion-input [(ngModel)]="p.aisle" placeholder="Aisle"></ion-input>
            <ion-input [(ngModel)]="p.shelf" placeholder="Shelf"></ion-input></ion-item>
          <!-- +ESL: id mapping per product -->
          <ion-item lines="none" *ngIf="d.appMode === 'prototype-esl'">
            <ion-input [ngModel]="eslId(p.id)" (ngModelChange)="setEslId(p.id, $event)"
              [placeholder]="(d.eslBlinkBy || 'article') === 'article' ? 'Article ID' : 'Label ID'"></ion-input>
          </ion-item>
        </div>
      </ion-list>

      <ion-item *ngIf="d.appMode === 'prototype-esl'">
        <ion-select label="Blink by" [(ngModel)]="d.eslBlinkBy" (ngModelChange)="save()">
          <ion-select-option value="article">Article ID</ion-select-option>
          <ion-select-option value="label">Label ID</ion-select-option>
        </ion-select>
      </ion-item>

      <button class="btn-y" (click)="saveAndDeploy()" style="margin-top:14px">Save &amp; Deploy →</button>
    </ion-content>
  `,
})
export class ContentBuilderComponent implements OnInit {
  draft?: ContentDraft;
  apiProducts: ApiProduct[] = [];
  selected = new Set<string>();

  /** Card styles that render an image → image upload is required per item. */
  private static IMAGE_STYLES = ['image-text', 'image-only', 'circle'];
  get needsImage(): boolean {
    return !!this.draft && ContentBuilderComponent.IMAGE_STYLES.includes(this.draft.themeTokens.cardStyle);
  }

  constructor(private content: ContentService, private categoryApi: CategoryApiService, private workspace: WorkspaceService, private picker: ImagePickerService, private route: ActivatedRoute, private router: Router) {}

  async pickImage(item: CardItem | ResultProduct): Promise<void> {
    const dataUrl = await this.picker.pick();
    if (dataUrl) item.image = dataUrl;
  }

  fetchError = '';
  async fetch(): Promise<void> {
    this.fetchError = '';
    try {
      const creds = await this.workspace.creds();
      this.apiProducts = await this.categoryApi.fetchProducts(creds);
      if (!this.apiProducts.length) this.fetchError = 'No products returned for this store.';
    } catch (e: any) {
      this.apiProducts = [];
      this.fetchError = e?.message || 'Fetch failed';
    }
  }

  toggle(id: string): void {
    if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
  }

  /** Map selected API products → Home cards + Result products (text from API, images uploaded later). */
  applySelection(): void {
    const picks = this.apiProducts.filter((p) => this.selected.has(p.productId));
    if (!this.draft!.fieldSource) this.draft!.fieldSource = 'etc';
    this.draft!.home = picks.map((p) => ({ id: p.productId, name: p.name, price: p.price, articleId: p.articleId }));
    this.draft!.result.products = picks.map((p) => ({ id: p.productId, name: p.name, price: p.price, articleId: p.articleId, labelId: p.labelId, shelf: p.shelf, aisle: p.zone }));
  }

  get modeLabel(): string {
    const m = this.draft?.appMode;
    return m === 'category' ? 'Category' : m === 'prototype' ? 'Prototype' : 'Prototype+ESL';
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.draft = (await this.content.list()).find((d) => d.id === id);
    if (!this.draft) { this.router.navigateByUrl('/tabs/content'); return; }
    if (this.draft.appMode === 'prototype-esl' && !this.draft.eslBlinkBy) this.draft.eslBlinkBy = 'article';
  }

  addCard(): void { this.draft!.home.push({ id: 'c' + Date.now(), name: '' }); }
  addProduct(): void { this.draft!.result.products.push({ id: 'p' + Date.now(), name: '' }); }

  eslId(productId: string): string {
    const link = this.draft!.eslLinks?.find((l) => l.productId === productId);
    return (this.draft!.eslBlinkBy === 'label' ? link?.labelId : link?.articleId) ?? '';
  }
  setEslId(productId: string, val: string): void {
    this.draft!.eslLinks = this.draft!.eslLinks ?? [];
    let link = this.draft!.eslLinks.find((l) => l.productId === productId);
    if (!link) { link = { productId }; this.draft!.eslLinks.push(link); }
    if (this.draft!.eslBlinkBy === 'label') link.labelId = val; else link.articleId = val;
  }

  async save(): Promise<void> {
    if (!this.draft) return;
    this.draft.status = this.draft.home.length && this.draft.result.products.length ? 'complete' : 'draft';
    await this.content.save(this.draft);
  }

  async saveAndDeploy(): Promise<void> {
    await this.save();
    this.router.navigateByUrl('/deploy/' + this.draft!.id);
  }

  back(): void { this.router.navigateByUrl('/tabs/content'); }
}
