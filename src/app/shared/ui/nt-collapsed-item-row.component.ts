import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';

/**
 * Collapsed row for repeating/unbounded list items (home cards, intermediate
 * items, result products, screensaver media, card-tree levels). Renders one
 * compact row: drag handle, thumbnail, name, summary badge, chevron, plus
 * small reorder/delete icon buttons. Tapping the row is expected to open a
 * caller-provided ion-modal bottom sheet with the item's full editor — that
 * modal is NOT built by this component.
 */
@Component({
  selector: 'nt-collapsed-item-row',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="nt-collapsed-row">
      <span class="handle" aria-hidden="true">
        <ion-icon name="reorder-two-outline"></ion-icon>
      </span>

      <button type="button" class="main" (click)="rowClick.emit()">
        <span class="thumb" [class.empty]="!thumbnail">
          <img *ngIf="thumbnail" [src]="thumbnail" alt="" />
          <ion-icon *ngIf="!thumbnail" name="image-outline" aria-hidden="true"></ion-icon>
        </span>
        <span class="name">{{ name }}</span>
        <span class="badge" *ngIf="badge">{{ badge }}</span>
        <ion-icon class="chev" name="chevron-forward-outline" aria-hidden="true"></ion-icon>
      </button>

      <span class="acts">
        <button type="button" class="ibtn" title="Move up" [disabled]="!canMoveUp" (click)="moveUp.emit()">
          <ion-icon name="chevron-up-outline" aria-hidden="true"></ion-icon>
        </button>
        <button type="button" class="ibtn" title="Move down" [disabled]="!canMoveDown" (click)="moveDown.emit()">
          <ion-icon name="chevron-down-outline" aria-hidden="true"></ion-icon>
        </button>
        <button type="button" class="ibtn danger" *ngIf="canDelete" title="Delete" (click)="delete.emit()">
          <ion-icon name="trash-outline" aria-hidden="true"></ion-icon>
        </button>
      </span>
    </div>
  `,
  styleUrls: ['./nt-collapsed-item-row.component.scss'],
})
export class NtCollapsedItemRowComponent {
  @Input() thumbnail: string | null = null;
  @Input() name = '';
  @Input() badge = '';
  @Input() canMoveUp = true;
  @Input() canMoveDown = true;
  /** Hide the delete action for read-only/locked lists (e.g. API-derived
   *  category cards, which have no remove concept). Defaults to true so every
   *  existing caller (Home cards, etc.) is unaffected. */
  @Input() canDelete = true;

  @Output() rowClick = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
}
