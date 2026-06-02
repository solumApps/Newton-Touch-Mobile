import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonNote, IonList, IonListHeader, IonLabel } from '@ionic/angular/standalone';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { CategoryApiService } from '../services/category-api.service';

/**
 * D3 Server Config — enter/store Category API credentials for this workspace.
 * When set, CategoryApiService hits the real REST API; otherwise it returns mock data.
 */
@Component({
  selector: 'app-server-config',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonItem, IonInput, IonNote, IonList, IonListHeader, IonLabel],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-button (click)="back()">‹</ion-button></ion-buttons>
      <ion-title>Server Configuration</ion-title>
      <ion-buttons slot="end"><ion-button strong="true" (click)="save()">Save</ion-button></ion-buttons>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding" *ngIf="ws as w">
      <ion-note color="medium">Credentials for Category Mode. Company ID &amp; Store ID come from your workspace.</ion-note>
      <ion-list>
        <ion-list-header><ion-label>Environment</ion-label></ion-list-header>
        <ion-item><ion-input label="Server URL" labelPlacement="stacked" [(ngModel)]="w.serverUrl" placeholder="https://stage00.solum.com"></ion-input></ion-item>
        <ion-item><ion-input label="API Username" labelPlacement="stacked" [(ngModel)]="w.username"></ion-input></ion-item>
        <ion-item><ion-input label="API Token" labelPlacement="stacked" type="password" [(ngModel)]="w.token"></ion-input></ion-item>
        <ion-list-header><ion-label>Workspace (auto)</ion-label></ion-list-header>
        <ion-item><ion-input label="Company ID" labelPlacement="stacked" [(ngModel)]="w.companyId"></ion-input></ion-item>
        <ion-item><ion-input label="Store ID" labelPlacement="stacked" [(ngModel)]="w.storeId"></ion-input></ion-item>
      </ion-list>
      <ion-button expand="block" fill="outline" (click)="test()">Test connection</ion-button>
      <ion-note *ngIf="testMsg" [color]="testOk ? 'success' : 'danger'">{{ testMsg }}</ion-note>
    </ion-content>
  `,
})
export class ServerConfigComponent implements OnInit {
  ws?: Workspace;
  testMsg = '';
  testOk = false;

  constructor(private workspace: WorkspaceService, private api: CategoryApiService, private router: Router) {}

  async ngOnInit(): Promise<void> { this.ws = { ...(await this.workspace.get()) }; }

  async save(): Promise<void> {
    if (this.ws) await this.workspace.set(this.ws);
    this.router.navigateByUrl('/tabs/settings');
  }

  async test(): Promise<void> {
    const creds = this.ws?.serverUrl && this.ws?.token
      ? { serverUrl: this.ws.serverUrl, username: this.ws.username, token: this.ws.token, companyId: this.ws.companyId, storeId: this.ws.storeId }
      : undefined;
    const products = await this.api.fetchProducts(creds);
    this.testOk = products.length > 0;
    this.testMsg = creds
      ? (this.testOk ? `Connected · ${products.length} products` : 'No products returned')
      : 'No server set — using mock data';
  }

  back(): void { this.router.navigateByUrl('/tabs/settings'); }
}
