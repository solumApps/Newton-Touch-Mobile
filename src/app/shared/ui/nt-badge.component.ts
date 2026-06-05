import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NtBadgeVariant =
  | 'neutral' | 'predefined' | 'draft' | 'complete' | 'deployed'
  | 'live' | 'offline' | 'info' | 'warn' | 'danger' | 'success';

/**
 * Semantic status chip. Replaces the ad-hoc `.chip` / `.chip.act` / `.chip.ok`
 * variants scattered across pages. Variants map to the semantic color palette.
 */
@Component({
  selector: 'nt-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="nt-badge" [class]="'v-' + variant" [class.dot]="dot">
      <span class="d" *ngIf="dot" aria-hidden="true"></span>
      <ng-content></ng-content>
    </span>
  `,
  styleUrls: ['./nt-badge.component.scss'],
})
export class NtBadgeComponent {
  @Input() variant: NtBadgeVariant = 'neutral';
  /** Render a small status dot before the label (e.g. live deployments). */
  @Input() dot = false;
}
