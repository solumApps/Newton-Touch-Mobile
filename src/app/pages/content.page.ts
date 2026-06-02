import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonButton, IonCard } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { ContentService, ContentDraft } from '../services/content.service';

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonButton, IonCard],
  template: `
    <ion-header><ion-toolbar><ion-title>Content</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <ion-searchbar placeholder="Search content" (ionInput)="q = $any($event.target).value || ''"></ion-searchbar>
      <!-- Flow (TODO UI): CC-1 theme → CC-2 mode → Category/Prototype/+ESL → Deploy. ⋯ = Duplicate / Export structure. -->
      <ion-card *ngFor="let c of filtered()" button (click)="open(c)">
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px">
          <div [style.background]="c.themeTokens.background || '#2F006D'" style="width:42px;height:42px;border-radius:8px;flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:700;color:#0F172A">{{ c.name }}</div>
            <div style="font-size:11px;color:#64748B">Theme: {{ c.themeName }}</div>
            <div style="display:flex;gap:5px;margin-top:6px">
              <span class="chip" [class.act]="true">{{ modeLabel(c.appMode) }}</span>
              <span class="chip" [style.background]="c.deployedTo ? '#ECFDF5' : '#F1F5F9'" [style.color]="c.deployedTo ? '#065F46' : '#475569'">{{ c.deployedTo ? 'DEPLOYED' : (c.status | uppercase) }}</span>
            </div>
            <div *ngIf="c.deployedTo" style="font-size:9px;color:#94A3B8;margin-top:4px">→ {{ c.deployedTo }}</div>
          </div>
        </div>
      </ion-card>
      <div *ngIf="!drafts.length" style="text-align:center;color:#94A3B8;font-size:13px;padding:24px">No content yet — tap below to create.</div>

      <ion-button class="cta" expand="block" (click)="create()">+ Create New Content</ion-button>
    </ion-content>
  `,
})
export class ContentPage implements OnInit {
  q = '';
  drafts: ContentDraft[] = [];

  constructor(private content: ContentService, private router: Router) {}

  async ngOnInit(): Promise<void> { this.drafts = await this.content.list(); }

  ionViewWillEnter(): void { this.content.list().then((d) => (this.drafts = d)); }

  filtered(): ContentDraft[] {
    const q = this.q.toLowerCase();
    return q ? this.drafts.filter((d) => d.name.toLowerCase().includes(q)) : this.drafts;
  }

  modeLabel(m: ContentDraft['appMode']): string {
    return m === 'category' ? 'CATEGORY' : m === 'prototype' ? 'PROTOTYPE' : 'PROTOTYPE+ESL';
  }

  create(): void { this.router.navigateByUrl('/content-create'); }
  open(c: ContentDraft): void { this.router.navigateByUrl('/content-builder/' + c.id); }
}
