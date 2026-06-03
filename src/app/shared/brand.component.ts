import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** SOLUM wordmark + "Newton Touch" subtitle (proper case). Reused on auth + headers. */
@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brand.component.html',
  styleUrls: ['./brand.component.scss'],
})
export class BrandComponent {
  /** 'light' = white logo (on purple/dark); 'dark' = colored logo (on white). */
  @Input() variant: 'light' | 'dark' = 'light';
  /** Show the "Newton Touch" subtitle. */
  @Input() sub = true;
}
