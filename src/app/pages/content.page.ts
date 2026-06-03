import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonFooter, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { ContentService, ContentDraft } from '../services/content.service';
import { WorkspaceService } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, PageHeaderComponent],
  templateUrl: './content.page.html',
  styleUrls: ['./content.page.scss'],
})
export class ContentPage implements OnInit {
  q = '';
  drafts: ContentDraft[] = [];
  company = '';
  store = '';

  constructor(private content: ContentService, private ws: WorkspaceService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.drafts = await this.content.list();
    const w = await this.ws.get();
    this.company = w.companyName || '';
    this.store = w.storeName || '';
  }

  ionViewWillEnter(): void { this.content.list().then((d) => (this.drafts = d)); }

  filtered(): ContentDraft[] {
    const q = this.q.toLowerCase();
    return q ? this.drafts.filter((d) => d.name.toLowerCase().includes(q)) : this.drafts;
  }

  modeLabel(m: ContentDraft['appMode']): string {
    return m === 'category' ? 'Category' : m === 'prototype' ? 'Prototype' : 'Prototype + ESL';
  }

  async del(c: ContentDraft): Promise<void> {
    if (!confirm(`Delete content "${c.name}"? This cannot be undone.`)) return;
    await this.content.remove(c.id);
    this.drafts = await this.content.list();
  }

  create(): void { this.router.navigateByUrl('/content-create'); }
  open(c: ContentDraft): void { this.router.navigateByUrl('/content-builder/' + c.id); }
}
