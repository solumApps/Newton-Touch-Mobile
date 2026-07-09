import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImagePickerService } from '../services/image-picker.service';
import type { CardItem, ImageFit } from '@contract/layout';

/**
 * Recursive card editor — renders a CardItem with name/image inputs and an
 * "Add sub-item" button that pushes onto card.children. Each child is rendered
 * via this same component, so the tree depth is unbounded (capped at maxDepth
 * by the parent when needed — e.g. Category mode caps at 4).
 */
@Component({
  selector: 'app-card-tree-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="branch" *ngFor="let child of card.children; let i = index">
      <div class="erow">
        <button class="mini move" [disabled]="i === 0" (click)="moveUp(i)" title="Move up">↑</button>
        <button class="mini move" [disabled]="i === (card.children?.length || 0) - 1" (click)="moveDown(i)" title="Move down">↓</button>
        <div class="thumb" *ngIf="needsImage" [style.background-image]="child.image ? 'url('+child.image+')' : null" (click)="pickImage(child)">{{ child.image ? '' : '📷' }}</div>
        <input class="inp" [(ngModel)]="child.name" placeholder="Sub-item name" />
        <button class="del" (click)="remove(i)">✕</button>
      </div>
      <div class="fit-seg" *ngIf="needsImage && child.image">
        <span class="fit-lbl">Fit</span>
        <button class="mini" *ngFor="let f of fitOpts" [class.sel]="fitOf(child)===f" (click)="setFit(child, f)">{{ f | titlecase }}</button>
      </div>
      <!-- Per-leaf result products (Individual result mode): only on nodes WITHOUT children -->
      <div class="prods" *ngIf="allowProducts && !(child.children && child.children.length)">
        <div class="erow" *ngFor="let p of child.products || []; let pi = index">
          <div class="thumb" [style.background-image]="p.image ? 'url('+p.image+')' : null" (click)="pickImage($any(p))">{{ p.image ? '' : '📷' }}</div>
          <input class="inp" [(ngModel)]="p.name" placeholder="Product name" />
          <input class="inp psm" [(ngModel)]="p.price" placeholder="Price" />
          <input class="inp psm" [(ngModel)]="p.aisle" placeholder="Aisle" />
          <button class="del" (click)="removeProduct(child, pi)">✕</button>
        </div>
        <button class="mini prod-add" (click)="addProduct(child)">+ Result product (this item's own result page)</button>
      </div>
      <div class="nest">
        <app-card-tree-editor [card]="child" [depth]="depth + 1" [maxDepth]="maxDepth" [needsImage]="needsImage" [allowProducts]="allowProducts"></app-card-tree-editor>
      </div>
    </div>
    <button class="mini sub-add" [disabled]="atMax" (click)="add()">+ Add sub-item<span *ngIf="atMax"> (max {{ maxDepth }})</span></button>
  `,
  styles: [`
    .branch { border-left: 2px solid var(--nt-border); padding-left: 8px; margin: 6px 0; }
    .nest { margin-left: 8px; }
    .sub-add { display: inline-block; margin: 4px 0 10px; font-size: 12px; }
    .sub-add[disabled] { opacity: .5; }
    .inp { flex: 1; min-width: 0; border: 1.5px solid var(--nt-border); border-radius: 9px; padding: 11px 12px; font-size: 14px; font-family: inherit; outline: none; }
    .inp:focus { border-color: var(--nt-purple); }
    .del { border: none; background: none; color: var(--nt-muted); font-size: 15px; cursor: pointer; padding: 6px; }
    .thumb { width: 42px; height: 42px; border-radius: 8px; border: 1.5px dashed var(--nt-border); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; flex-shrink: 0; }
    .thumb.wide { width: 100%; height: auto; min-height: 130px; border-radius: 10px; border: 2px dashed var(--nt-border); background: var(--nt-tint, #F8F5FF); font-size: 13px; font-weight: 600; color: var(--nt-muted); flex-shrink: 1; }
    .erow { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .mini { border: 1.5px solid var(--nt-brand-ink); color: var(--nt-brand-ink); background: var(--nt-card); border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; }
    .mini.move { padding: 5px 8px; font-size: 14px; flex-shrink: 0; }
    .mini.move[disabled] { opacity: 0.3; cursor: default; }
    .fit-seg { display: flex; align-items: center; gap: 6px; margin: -2px 0 8px; }
    .fit-seg .fit-lbl { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; color: var(--nt-muted); }
    .fit-seg .mini { padding: 3px 10px; font-size: 11px; border-radius: 999px; }
    .fit-seg .mini.sel { background: var(--nt-brand-ink); color: #fff; }
    .prods { margin: 2px 0 8px 6px; padding-left: 8px; border-left: 2px dashed var(--nt-border); }
    .prods .psm { flex: 0 0 72px; }
    .prod-add { font-size: 11px; }
  `],
})
export class CardTreeEditorComponent {
  @Input() card!: CardItem;
  @Input() depth = 0;
  @Input() maxDepth = Infinity;
  @Input() needsImage = false;
  /** Individual result mode: leaves (nodes without children) get their own product list. */
  @Input() allowProducts = false;

  constructor(private picker: ImagePickerService) {}

  get atMax(): boolean { return this.depth + 1 >= this.maxDepth; }

  add(): void {
    if (this.atMax) return;
    this.card.children = [...(this.card.children || []), { id: 's' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: '' }];
  }
  remove(i: number): void {
    const arr = this.card.children || [];
    arr.splice(i, 1);
    this.card.children = arr;
  }
  moveUp(i: number): void {
    if (i <= 0 || !this.card.children) return;
    const arr = this.card.children;
    const temp = arr[i - 1];
    arr[i - 1] = arr[i];
    arr[i] = temp;
  }
  moveDown(i: number): void {
    if (!this.card.children || i >= this.card.children.length - 1) return;
    const arr = this.card.children;
    const temp = arr[i + 1];
    arr[i + 1] = arr[i];
    arr[i] = temp;
  }
  async pickImage(c: CardItem): Promise<void> {
    const d = await this.picker.pick();
    if (d) c.image = d;
  }
  addProduct(c: CardItem): void {
    c.products = [...(c.products || []), { id: 'p' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: '' } as any];
  }
  removeProduct(c: CardItem, i: number): void {
    const arr = c.products || [];
    arr.splice(i, 1);
    c.products = [...arr];
  }

  /** Per-image fit segment (shown when an image is set). 'cover' = default → field omitted. */
  readonly fitOpts: ImageFit[] = ['cover', 'contain', 'fill'];
  fitOf(c: CardItem): ImageFit { return c.imageFit || 'cover'; }
  setFit(c: CardItem, fit: ImageFit): void { c.imageFit = fit === 'cover' ? undefined : fit; }
}
