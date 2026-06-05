import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';

export type NtIconSize = 'sm' | 'md' | 'lg' | 'xl';
export type NtIconTone = 'inherit' | 'muted' | 'brand' | 'accent' | 'success' | 'danger' | 'warn';

/**
 * Lightweight wrapper around ion-icon with consistent sizing + tone + ARIA.
 * Used as a drop-in replacement for emoji icons (🏢, 🖥️, 🌐, …) which lack
 * accessibility metadata.
 */
@Component({
  selector: 'nt-icon',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <span class="nt-icon" [class]="'s-' + size + ' t-' + tone" [attr.aria-label]="ariaLabel || null"
          [attr.aria-hidden]="ariaLabel ? null : 'true'" [attr.role]="ariaLabel ? 'img' : null">
      <ion-icon [name]="name"></ion-icon>
    </span>
  `,
  styleUrls: ['./nt-icon.component.scss'],
})
export class NtIconComponent {
  @Input() name = '';
  @Input() size: NtIconSize = 'md';
  @Input() tone: NtIconTone = 'inherit';
  /** Provide for decorative + meaningful icons. Empty → aria-hidden. */
  @Input() ariaLabel?: string;
}
