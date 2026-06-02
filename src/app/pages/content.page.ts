import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonChip, IonLabel } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { ContentService, ContentDraft } from '../services/content.service';

@Component({
  selector: 'app-content',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonChip, IonLabel],
  template: `
    <ion-header><ion-toolbar><ion-title>Content</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <ion-searchbar placeholder="Search content" (ionInput)="q = $any($event.target).value || ''"></ion-searchbar>
      <!-- Flow (TODO UI): CC-1 theme → CC-2 mode → Category/Prototype/+ESL → Deploy. ⋯ = Duplicate / Export structure. -->
      <ion-card *ngFor="let c of filtered()" button (click)="open(c)">
        <ion-card-header>
          <ion-card-title>{{ c.name }}</ion-card-title>
          <ion-card-subtitle>Theme: {{ c.themeName }}</ion-card-subtitle>
        </ion-card-header>
        <div class="ion-padding-horizontal ion-padding-bottom">
          <ion-chip color="primary"><ion-label>{{ modeLabel(c.appMode) }}</ion-label></ion-chip>
          <ion-chip [color]="c.status === 'complete' ? 'success' : 'medium'"><ion-label>{{ c.status | uppercase }}</ion-label></ion-chip>
          <ion-chip *ngIf="c.deployedTo" color="success"><ion-label>DEPLOYED</ion-label></ion-chip>
        </div>
      </ion-card>
      <ion-card *ngIf="!drafts.length"><ion-card-header><ion-card-subtitle>No content yet — tap below to create.</ion-card-subtitle></ion-card-header></ion-card>

      <ion-button expand="block" (click)="create()">+ Create New Content</ion-button>
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
