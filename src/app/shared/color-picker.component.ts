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
  styles: [`
    .cp{margin:10px 0}
    .lbl{font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
    .row{display:flex;flex-wrap:wrap;align-items:center}
    .sw{width:30px;height:30px;border-radius:7px;border:1px solid #E2E8F0;margin:0 6px 6px 0;cursor:pointer;padding:0}
    .sw.sel{outline:2.5px solid #2F006D;outline-offset:1px}
    .custom{position:relative;display:flex;align-items:center;justify-content:center;font-size:14px;
      background:conic-gradient(from 90deg,#ef4444,#f59e0b,#fde047,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)}
    .custom input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
    .hex{display:flex;align-items:center;border:1.5px solid #E2E8F0;border-radius:7px;padding:4px 8px;width:140px;font-family:monospace;font-size:13px}
    .hex input{border:0;outline:0;width:100%;font-family:monospace;font-size:13px;text-transform:uppercase}
  `],
  template: `
    <div class="cp">
      <div class="lbl">{{ label }}<span *ngIf="hint" style="font-weight:400;text-transform:none;color:#94A3B8"> — {{ hint }}</span></div>
      <div class="row">
        <button *ngFor="let c of presets" class="sw" [class.sel]="c===value" [style.background]="c" (click)="pick(c)"></button>
        <label class="sw custom" title="Custom — color wheel + hex">🎨
          <input type="color" [value]="toHex(value)" (input)="pick($any($event.target).value)" />
        </label>
      </div>
      <div class="hex">#<input [ngModel]="strip(value)" (ngModelChange)="onHex($event)" maxlength="6" placeholder="2F006D" /></div>
    </div>
  `,
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
