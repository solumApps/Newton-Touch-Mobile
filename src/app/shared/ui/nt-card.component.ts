import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NtCardElevation = 'flat' | 'raised' | 'floating';

/**
 * Panel primitive — wraps content in a bordered, optionally elevated card.
 * Replaces ad-hoc `.crd / .pcard` styling across pages. Existing global
 * `.crd` class remains so unmodified callers keep working.
 */
@Component({
  selector: 'nt-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nt-card" [class]="'el-' + elevation" [class.interactive]="interactive">
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./nt-card.component.scss'],
})
export class NtCardComponent {
  @Input() elevation: NtCardElevation = 'flat';
  /** Adds hover lift + cursor pointer (use for tappable cards). */
  @Input() interactive = false;
}
