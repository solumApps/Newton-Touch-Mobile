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
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent],
  templateUrl: './server-config.component.html',
  styleUrls: ['./server-config.component.scss'],
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
