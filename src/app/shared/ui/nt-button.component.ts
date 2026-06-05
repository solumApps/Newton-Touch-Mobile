import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NtButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type NtButtonSize = 'sm' | 'md' | 'lg';

/**
 * Branded button used across the app. Variants:
 *  - primary  → yellow CTA (replaces .btn-y)
 *  - secondary → purple fill (replaces .btn-g)
 *  - outline   → outlined purple (replaces .btn-o)
 *  - ghost     → transparent, text-only
 *  - danger    → red destructive action
 *
 * Existing `.btn-y / .btn-g / .btn-o` global classes remain untouched, so
 * adoption is opt-in per file.
 */
@Component({
  selector: 'nt-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" class="nt-btn" [class]="'v-' + variant + ' s-' + size" [class.block]="block"
            [disabled]="disabled" (click)="onClick.emit($event)" [attr.aria-label]="ariaLabel || null">
      <ng-content></ng-content>
    </button>
  `,
  styleUrls: ['./nt-button.component.scss'],
})
export class NtButtonComponent {
  @Input() variant: NtButtonVariant = 'primary';
  @Input() size: NtButtonSize = 'md';
  @Input() disabled = false;
  /** Stretch to full container width. */
  @Input() block = false;
  @Input() ariaLabel?: string;
  @Output() onClick = new EventEmitter<MouseEvent>();
}
