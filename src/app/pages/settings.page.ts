import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonItem, IonLabel, IonButton } from '@ionic/angular/standalone';
import { SessionService, Session } from '../services/session.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonItem, IonLabel, IonButton],
  template: `
    <ion-header><ion-toolbar><ion-title>Settings</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <div style="display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#2F006D,#001973);border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,205,0,.25);color:#FFCD00;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px">{{ initials }}</div>
        <div><div style="color:#fff;font-weight:700">{{ session?.username || 'Not signed in' }}</div><div style="color:rgba(255,255,255,.6);font-size:11px">{{ ws?.companyName }}</div></div>
      </div>
      <ion-list>

        <ion-list-header><ion-label>Workspace</ion-label></ion-list-header>
        <ion-item button detail (click)="changeWorkspace()"><ion-label>Company<p>{{ ws?.companyName }} ({{ ws?.companyId }})</p></ion-label></ion-item>
        <ion-item button detail (click)="changeWorkspace()"><ion-label>Store<p>{{ ws?.storeName }} ({{ ws?.storeId }})</p></ion-label></ion-item>

        <ion-list-header><ion-label>Environment</ion-label></ion-list-header>
        <ion-item><ion-label>Server<p>{{ ws?.environment }} · {{ ws?.serverUrl || 'not set' }}</p></ion-label></ion-item>
        <ion-item button detail [routerLink]="['/server-config']"><ion-label>Server / API Credentials<p>{{ ws?.token ? 'Configured' : 'Set token for Category Mode' }}</p></ion-label></ion-item>
      </ion-list>
      <ion-button expand="block" color="danger" fill="outline" style="margin-top:16px" (click)="signOut()">Sign Out</ion-button>
      <p style="text-align:center;color:#94A3B8;font-size:11px">Newton Touch · v1.0.0</p>
    </ion-content>
  `,
})
export class SettingsPage implements OnInit {
  session: Session | null = null;
  ws: Workspace | null = null;

  constructor(private sessionSvc: SessionService, private wsSvc: WorkspaceService, private router: Router) {}

  get initials(): string {
    const u = this.session?.username || '';
    return u ? u.trim().slice(0, 2).toUpperCase() : '–';
  }

  async ngOnInit(): Promise<void> { await this.refresh(); }
  async ionViewWillEnter(): Promise<void> { await this.refresh(); }
  private async refresh(): Promise<void> {
    this.session = await this.sessionSvc.current();
    this.ws = await this.wsSvc.get();
  }

  changeWorkspace(): void { this.router.navigateByUrl('/auth/workspace'); }

  async signOut(): Promise<void> {
    await this.sessionSvc.signOut();
    this.router.navigateByUrl('/auth/environment');
  }
}
