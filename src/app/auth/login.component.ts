import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonInput, IonItem } from '@ionic/angular/standalone';
import { SessionService } from '../services/session.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput, IonItem],
  template: `
    <ion-content class="ion-padding">
      <div style="height:50px"></div>
      <div style="text-align:center;font-family:'Barlow Condensed';font-weight:900;font-size:30px;color:var(--ion-color-primary)">NEWTON TOUCH</div>
      <p style="text-align:center;color:#64748B;font-size:12px">Stage 00 — stage00.solum.com · Change</p>
      <!-- No Forgot password, no Microsoft SSO (unsupported) -->
      <ion-item><ion-input label="Username" labelPlacement="stacked" [(ngModel)]="username" placeholder="Enter username"></ion-input></ion-item>
      <ion-item><ion-input label="Password" labelPlacement="stacked" type="password" [(ngModel)]="password" placeholder="Enter password"></ion-input></ion-item>
      <ion-button expand="block" [disabled]="!username || !password" (click)="signIn()" style="margin-top:20px">Sign In</ion-button>
      <p *ngIf="error" style="color:var(--ion-color-danger);text-align:center;font-size:12px">{{ error }}</p>
    </ion-content>
  `,
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';

  constructor(private session: SessionService, private router: Router) {}

  async signIn(): Promise<void> {
    if (!this.username || !this.password) { this.error = 'Enter username and password'; return; }
    this.error = '';
    try {
      await this.session.signIn(this.username, this.password); // real SOLUM token API
      this.router.navigateByUrl('/auth/workspace');
    } catch (e: any) {
      this.error = e?.message || 'Login failed';
    }
  }
}
