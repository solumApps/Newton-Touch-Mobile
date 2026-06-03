import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SelectOption { value: string; label: string; sub?: string; }

/** Collapsed dropdown: tap → reveal option list with ✓ on the selected one.
 *  Two-way bind via [(value)]. Reused for company/store/theme/mode. */
@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
})
export class SelectFieldComponent {
  @Input() label = '';
  @Input() placeholder = 'Select…';
  @Input() emptyText = 'No options available';
  @Input() options: SelectOption[] = [];
  @Input() value = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  open = false;

  get selectedLabel(): string {
    return this.options.find((o) => o.value === this.value)?.label ?? '';
  }
  toggle(): void { if (!this.disabled) this.open = !this.open; }
  pick(v: string): void { this.value = v; this.valueChange.emit(v); this.open = false; }
}
