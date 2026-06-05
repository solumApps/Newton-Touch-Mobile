import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';

/**
 * Empty-state pattern: large soft icon → title → 1-2 sentence guidance →
 * optional primary action. Used wherever a list is empty.
 */
@Component({
  selector: 'nt-empty',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="nt-empty">
      <div class="ic" *ngIf="icon">
        <ion-icon [name]="icon" aria-hidden="true"></ion-icon>
      </div>
      <h3 class="t" *ngIf="title">{{ title }}</h3>
      <p class="d" *ngIf="description">{{ description }}</p>
      <button class="cta" *ngIf="actionLabel" (click)="action.emit()">{{ actionLabel }}</button>
    </div>
  `,
  styleUrls: ['./nt-empty.component.scss'],
})
export class NtEmptyComponent {
  @Input() icon = '';
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();
}
