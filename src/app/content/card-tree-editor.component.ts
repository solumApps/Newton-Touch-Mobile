import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImagePickerService } from '../services/image-picker.service';
import { NtCollapsedItemRowComponent } from '../shared/ui';
import type { CardItem, ImageFit } from '@contract/layout';

/**
 * Recursive card editor — renders a CardItem's children as collapsed rows
 * (thumbnail, name, sub-item/product-count badge, expand chevron); expanding a
 * row (per-row, UI-REDESIGN-PROMPT.md §5) reveals its full inline editor (name
 * input, image, Fit, own result products) plus — nested inside that same
 * expanded block — this same component recursing into `child.children`, so
 * tree depth is unbounded (capped at maxDepth by the parent when needed — e.g.
 * Category mode caps at 4). Same recursive structure/inputs/outputs and the
 * same underlying CardItem tree model / add-remove logic as before — this is a
 * template-only change (see UI-REDESIGN-INVENTORY.md PART 3).
 */
@Component({
  selector: 'app-card-tree-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NtCollapsedItemRowComponent],
  template: `
    <div class="branch" *ngFor="let child of card.children; let i = index">
      <nt-collapsed-item-row
        [thumbnail]="needsImage ? (child.image || null) : null"
        [name]="child.name || 'Untitled item'"
        [badge]="childBadge(child)"
        [canMoveUp]="i !== 0"
        [canMoveDown]="i !== (card.children?.length || 1) - 1"
        (rowClick)="toggleExpand(child.id)"
        (moveUp)="moveNode(i, -1)"
        (moveDown)="moveNode(i, 1)"
        (delete)="remove(i)"></nt-collapsed-item-row>

      <div class="branch-editor" *ngIf="isExpanded(child.id)">
        <div class="erow">
          <div class="thumb" *ngIf="needsImage" [style.background-image]="child.image ? 'url('+child.image+')' : null" (click)="pickImage(child)">{{ child.image ? '' : '📷' }}</div>
          <input class="inp" [(ngModel)]="child.name" placeholder="Sub-item name" />
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
            <button class="del" (click)="moveProduct(child, pi, -1)" [disabled]="pi === 0" title="Move up">↑</button>
            <button class="del" (click)="moveProduct(child, pi, 1)" [disabled]="pi === (child.products?.length || 1) - 1" title="Move down">↓</button>
            <button class="del" (click)="removeProduct(child, pi)">✕</button>
          </div>
          <button class="mini prod-add" (click)="addProduct(child)">+ Result product (this item's own result page)</button>
        </div>
        <div class="nest">
          <app-card-tree-editor [card]="child" [depth]="depth + 1" [maxDepth]="maxDepth" [needsImage]="needsImage" [allowProducts]="allowProducts"></app-card-tree-editor>
        </div>
      </div>
    </div>
    <button class="mini sub-add" [disabled]="atMax" (click)="add()">+ Add sub-item<span *ngIf="atMax"> (max {{ maxDepth }})</span></button>
  `,
  styles: [`
    .branch { border-left: 2px solid var(--nt-border); padding-left: 8px; margin: 6px 0; }
    .branch-editor { padding: 10px 0 2px 4px; }
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

  /** View-only expand/collapse state for this level's rows — collapsed rows,
   *  expanding is per-row (UI-REDESIGN-PROMPT.md §5). Local to this component
   *  instance, so every recursion level tracks its own children independently;
   *  does not touch the CardItem model. */
  private expandedIds = new Set<string>();
  isExpanded(id: string): boolean { return this.expandedIds.has(id); }
  toggleExpand(id: string): void {
    if (this.expandedIds.has(id)) this.expandedIds.delete(id);
    else this.expandedIds.add(id);
  }
  /** Collapsed-row summary badge: sub-item count and/or own-product count. */
  childBadge(c: CardItem): string {
    const parts: string[] = [];
    const kids = c.children?.length || 0;
    if (kids) parts.push(`${kids} sub-item${kids === 1 ? '' : 's'}`);
    if (this.allowProducts && !(c.children && c.children.length)) {
      const n = (c.products || []).length;
      if (n) parts.push(`${n} product${n === 1 ? '' : 's'}`);
    }
    return parts.join(' · ');
  }

  get atMax(): boolean { return this.depth + 1 >= this.maxDepth; }

  add(): void {
    if (this.atMax) return;
    this.card.children = [...(this.card.children || []), { id: 's' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: '' }];
  }
  
  moveNode(i: number, dir: number): void {
    const arr = this.card.children;
    if (!arr) return;
    const target = i + dir;
    if (target < 0 || target >= arr.length) return;
    const item = arr.splice(i, 1)[0];
    arr.splice(target, 0, item);
    this.card.children = [...arr];
  }
  moveProduct(c: CardItem, i: number, dir: number): void {
    const arr = c.products;
    if (!arr) return;
    const target = i + dir;
    if (target < 0 || target >= arr.length) return;
    const item = arr.splice(i, 1)[0];
    arr.splice(target, 0, item);
    c.products = [...arr];
  }
  remove(i: number): void {
    const arr = this.card.children || [];
    arr.splice(i, 1);
    this.card.children = arr;
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
  setFit(c: CardItem, fit: ImageFit): void { c.imageFit = fit; }
}
