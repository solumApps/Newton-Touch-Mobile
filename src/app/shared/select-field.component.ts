import { AfterViewChecked, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface SelectOption { value: string; label: string; sub?: string; }

/** Collapsed dropdown: tap → reveal option list with ✓ on the selected one.
 *  Two-way bind via [(value)]. Reused for company/store/theme/mode. */
@Component({
  selector: 'app-select-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './select-field.component.html',
  styleUrls: ['./select-field.component.scss'],
})
export class SelectFieldComponent implements AfterViewChecked {
  @Input() label = '';
  @Input() placeholder = 'Select…';
  @Input() emptyText = 'No options available';
  @Input() options: SelectOption[] = [];
  @Input() value = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  private _open = false;
  @Input() set open(value: boolean) {
    this._open = value;
    if (!value) {
      this.filterText = '';
    }
  }
  get open(): boolean {
    return this._open;
  }
  @Output() openChange = new EventEmitter<boolean>();

  @ViewChild('filterInput') filterInput?: ElementRef<HTMLInputElement>;
  filterText = '';

  get selectedLabel(): string {
    return this.options.find((o) => o.value === this.value)?.label ?? '';
  }

  get filteredOptions(): SelectOption[] {
    const query = this.filterText.trim().toLowerCase();
    if (!query) {
      return this.options;
    }

    return this.options.filter((o) => {
      const haystack = `${o.label} ${o.sub ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  toggle(): void {
    if (!this.disabled) {
      this.setOpen(!this.open);
    }
  }

  close(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    this.open = open;
    this.openChange.emit(open);
  }

  /** Close when the user taps anywhere outside this field. */
  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (this.open && !this.elementRef.nativeElement.contains(event.target as Node | null)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  ngAfterViewChecked(): void {
    if (this.open && this.filterInput) {
      this.filterInput.nativeElement.focus();
    }
  }

  pick(v: string, event?: Event): void {
    event?.stopPropagation();
    this.value = v;
    this.valueChange.emit(v);
    this.close();
  }

  constructor(private elementRef: ElementRef<HTMLElement>) {}
}
