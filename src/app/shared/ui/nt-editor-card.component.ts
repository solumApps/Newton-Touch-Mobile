import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Editor-deck level 3 — a plain styled container rendered directly under the
 * value-pill row. It carries no editor logic of its own: each wizard step
 * projects its tile groups / sliders / color pickers in via <ng-content>.
 */
@Component({
  selector: 'nt-editor-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nt-editor-card">
      <div class="sec" *ngIf="sectionLabel">{{ sectionLabel }}</div>
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./nt-editor-card.component.scss'],
})
export class NtEditorCardComponent {
  /** Small caps label shown at the top of the card, e.g. "ARRANGEMENT". */
  @Input() sectionLabel = '';
}
