import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Section heading with title, optional subtitle, and a right-side action slot
 * (for "+ Add", "Filter", "View all", etc.). Consistent vertical rhythm.
 */
@Component({
  selector: 'nt-section-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nt-sh">
      <div class="nt-sh-text">
        <h2 class="nt-sh-title">{{ title }}</h2>
        <p class="nt-sh-sub" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="nt-sh-action"><ng-content></ng-content></div>
    </div>
  `,
  styleUrls: ['./nt-section-header.component.scss'],
})
export class NtSectionHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
