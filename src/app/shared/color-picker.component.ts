import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Reusable color field used on every color row in the theme wizard (B6/B8/B10/B12).
 * Brand preset swatches + a native color wheel (input[type=color]) + hex text input.
 * `value` may be a hex (#RRGGBB) or a CSS gradient string (presets only).
 */
@Component({
  selector: 'app-color-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
})
export class ColorPickerComponent {
  @Input() label = 'Color';
  @Input() hint = '';
  @Input() value = '#2F006D';
  @Input() presets: string[] = ['#2F006D', '#001973', '#0F172A', '#FFCD00', '#10B981', '#FFFFFF', '#EF4444'];
  @Output() valueChange = new EventEmitter<string>();

  pick(c: string): void { this.value = c; this.valueChange.emit(c); }
  onHex(h: string): void { if (/^[0-9a-fA-F]{6}$/.test(h)) this.pick('#' + h); }
  strip(v: string): string { return v?.startsWith('#') ? v.slice(1) : ''; }
  toHex(v: string): string { return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#2F006D'; }
}
