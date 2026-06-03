import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter } from '@ionic/angular/standalone';
import { ContentService, ContentDraft } from '../services/content.service';
import { CategoryApiService, ApiProduct } from '../services/category-api.service';
import { WorkspaceService } from '../services/workspace.service';
import { ImagePickerService } from '../services/image-picker.service';
import { SelectFieldComponent, SelectOption } from '../shared/select-field.component';
import type { ResultProduct, CardItem } from '@contract/layout';

/**
 * Prototype / Prototype+ESL data entry + Category fetch/map. Add/remove home cards &
 * result products with per-item image upload; +ESL adds id mapping. Saves to the draft.
 */
@Component({
  selector: 'app-content-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFooter, SelectFieldComponent],
  templateUrl: './content-builder.component.html',
  styleUrls: ['./content-builder.component.scss'],
})
export class ContentBuilderComponent implements OnInit {
  draft?: ContentDraft;
  apiProducts: ApiProduct[] = [];
  selected = new Set<string>();
  fetchError = '';

  fieldSourceOpts: SelectOption[] = [
    { value: 'category', label: 'Category fields', sub: 'category1–4' },
    { value: 'etc', label: 'ETC fields', sub: 'etc0–3' },
  ];
  eslByOpts: SelectOption[] = [
    { value: 'article', label: 'Article ID' },
    { value: 'label', label: 'Label ID' },
  ];

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
    return m === 'category' ? 'Category' : m === 'prototype' ? 'Prototype' : 'Prototype + ESL';
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
  setEslBy(v: 'article' | 'label'): void { this.draft!.eslBlinkBy = v; this.save(); }

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
