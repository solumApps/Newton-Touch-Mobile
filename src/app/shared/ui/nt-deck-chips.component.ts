import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';

export interface NtDeckChip {
  icon: string;
  label: string;
}

/**
 * Editor-deck level 1 — horizontal scrollable row of category chips
 * (icon + short label), exactly one active at a time. Used at the top of
 * the theme-wizard / content-builder "deck" to switch which category of
 * controls is shown below (Layout, Cards, Colors, Text, Header, ...).
 */
@Component({
  selector: 'nt-deck-chips',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="nt-deck-chips" role="tablist">
      <button type="button" class="nt-deck-chip" *ngFor="let chip of chips; let i = index; trackBy: trackByIndex"
              role="tab" [attr.aria-selected]="i === activeIndex"
              [class.active]="i === activeIndex" (click)="select(i)">
        <ion-icon [name]="chip.icon" aria-hidden="true"></ion-icon>
        <span>{{ chip.label }}</span>
      </button>
    </div>
  `,
  styleUrls: ['./nt-deck-chips.component.scss'],
})
export class NtDeckChipsComponent {
  @Input() chips: NtDeckChip[] = [];
  @Input() activeIndex = 0;
  @Output() activeIndexChange = new EventEmitter<number>();

  trackByIndex = (i: number): number => i;

  select(i: number): void {
    if (i === this.activeIndex) return;
    this.activeIndex = i;
    this.activeIndexChange.emit(i);
  }
}
