import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonChip, IonLabel } from '@ionic/angular/standalone';
import { WorkspaceService, SERVERS } from '../services/workspace.service';

@Component({
  selector: 'app-environment',
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonChip, IonLabel],
  template: `
    <ion-content class="ion-padding">
      <div style="height:60px"></div>
      <div style="font-family:'Barlow Condensed';font-weight:900;font-size:34px;color:var(--ion-color-primary)">NEWTON TOUCH</div>
      <p style="color:#64748B">Choose environment (shown once)</p>
      <ion-chip *ngFor="let name of envs" [color]="name===selected ? 'primary' : undefined" (click)="selected = name">
        <ion-label>{{ name }}</ion-label>
      </ion-chip>
      <p style="font-size:11px;color:#94A3B8">{{ baseUrl }}</p>
      <ion-button expand="block" [disabled]="!selected" (click)="continue()" style="margin-top:20px">Continue →</ion-button>
    </ion-content>
  `,
})
export class EnvironmentComponent {
  envs = Object.keys(SERVERS);
  selected = 'Stage 00';

  constructor(private ws: WorkspaceService, private router: Router) {}

  get baseUrl(): string { return SERVERS[this.selected] || ''; }

  async continue(): Promise<void> {
    await this.ws.setEnvironment(this.selected);
    this.router.navigateByUrl('/auth/login');
  }
}
