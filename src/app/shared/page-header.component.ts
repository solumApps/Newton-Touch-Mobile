import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { BrandComponent } from './brand.component';

/** Purple tab-page toolbar: SOLUM/Newton Touch brand left, company(bold)/store right. */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, BrandComponent],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
})
export class PageHeaderComponent {
  @Input() company = '';
  @Input() store = '';
}
