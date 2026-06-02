import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonList, IonItem, IonLabel, IonListHeader, IonRadioGroup, IonRadio } from '@ionic/angular/standalone';
import { WorkspaceService } from '../services/workspace.service';

interface StoreOpt { storeId: string; storeName: string; }

/**
 * A2 — company + store selection. (Company/store come from the operator's account;
 * a real list endpoint can replace these options later.) The chosen store is
 * persisted to WorkspaceService so Settings + the Category API use it.
 */
@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonList, IonItem, IonLabel, IonListHeader, IonRadioGroup, IonRadio],
  template: `
    <ion-content class="ion-padding">
      <h2>Select Workspace</h2>
      <ion-list>
        <ion-list-header><ion-label>Company · {{ companyName }}</ion-label></ion-list-header>
        <ion-radio-group [(ngModel)]="storeId">
          <ion-item *ngFor="let s of stores"><ion-label>{{ s.storeName }}<p>{{ s.storeId }}</p></ion-label>
            <ion-radio slot="end" [value]="s.storeId"></ion-radio></ion-item>
        </ion-radio-group>
      </ion-list>
      <ion-button expand="block" [disabled]="!storeId" (click)="enter()" style="margin-top:16px">Enter →</ion-button>
    </ion-content>
  `,
})
export class WorkspaceComponent {
  companyName = 'RetailCo International';
  companyId = 'RCI-001';
  stores: StoreOpt[] = [
    { storeId: 'STR-042', storeName: 'Main Street Store' },
    { storeId: 'STR-067', storeName: 'Mall Outlet' },
  ];
  storeId = 'STR-042';

  constructor(private ws: WorkspaceService, private router: Router) {}

  async enter(): Promise<void> {
    const store = this.stores.find((s) => s.storeId === this.storeId)!;
    await this.ws.set({ companyId: this.companyId, companyName: this.companyName, storeId: store.storeId, storeName: store.storeName });
    this.router.navigateByUrl('/tabs/themes');
  }
}
