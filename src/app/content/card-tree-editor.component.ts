import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImagePickerService } from '../services/image-picker.service';
import type { CardItem } from '@contract/layout';

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
        <div class="thumb" *ngIf="needsImage" [style.background-image]="child.image ? 'url('+child.image+')' : null" (click)="pickImage(child)">{{ child.image ? '' : '📷' }}</div>
        <input class="inp" [(ngModel)]="child.name" placeholder="Sub-item name" />
        <button class="del" (click)="remove(i)">✕</button>
      </div>
      <div class="nest">
        <app-card-tree-editor [card]="child" [depth]="depth + 1" [maxDepth]="maxDepth" [needsImage]="needsImage"></app-card-tree-editor>
      </div>
    </div>
    <button class="mini sub-add" [disabled]="atMax" (click)="add()">+ Add sub-item<span *ngIf="atMax"> (max {{ maxDepth }})</span></button>
  `,
  styles: [`
    .branch { border-left: 2px solid #eee; padding-left: 8px; margin: 6px 0; }
    .nest { margin-left: 8px; }
    .sub-add { display: inline-block; margin: 4px 0 10px; font-size: 12px; }
    .sub-add[disabled] { opacity: .5; }
  `],
})
export class CardTreeEditorComponent {
  @Input() card!: CardItem;
  @Input() depth = 0;
  @Input() maxDepth = Infinity;
  @Input() needsImage = false;

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
  async pickImage(c: CardItem): Promise<void> {
    const d = await this.picker.pick();
    if (d) c.image = d;
  }
}
