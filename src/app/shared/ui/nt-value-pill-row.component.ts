import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NtValuePill {
  label: string;
  value: string;
  /** CSS color for an optional small swatch square shown before the value text. */
  swatch?: string;
}

/**
 * Editor-deck level 2 — horizontal scrollable row of pills for the active
 * category chip. Each pill shows its current value on its face: a small
 * muted label on top and the current value below (with an optional color
 * swatch for color settings). Exactly one pill active at a time.
 */
@Component({
  selector: 'nt-value-pill-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nt-pill-row" role="tablist">
      <button type="button" class="nt-pill" *ngFor="let pill of pills; let i = index; trackBy: trackByIndex"
              role="tab" [attr.aria-selected]="i === activeIndex"
              [class.active]="i === activeIndex" (click)="select(i)" [title]="pill.label + ': ' + pill.value">
        <span class="lbl">{{ pill.label }}</span>
        <span class="val">
          <span class="sw" *ngIf="pill.swatch" [style.background]="pill.swatch" aria-hidden="true"></span>
          <span class="val-txt">{{ pill.value }}</span>
        </span>
      </button>
    </div>
  `,
  styleUrls: ['./nt-value-pill-row.component.scss'],
})
export class NtValuePillRowComponent {
  @Input() pills: NtValuePill[] = [];
  @Input() activeIndex = 0;
  @Output() activeIndexChange = new EventEmitter<number>();

  trackByIndex = (i: number): number => i;

  select(i: number): void {
    if (i === this.activeIndex) return;
    this.activeIndex = i;
    this.activeIndexChange.emit(i);
  }
}
