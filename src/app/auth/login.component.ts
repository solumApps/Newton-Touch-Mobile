import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonInput, IonItem } from '@ionic/angular/standalone';
import { SessionService } from '../services/session.service';
import { WorkspaceService } from '../services/workspace.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonInput, IonItem],
  template: `
    <ion-content class="ion-padding">
      <div style="height:50px"></div>
      <img src="assets/solum-logo.svg" alt="SOLUM" style="display:block;height:34px;margin:0 auto" />
      <div style="text-align:center;font-weight:700;color:#0F172A;margin-top:8px">Newton Touch</div>
      <p style="text-align:center;color:#64748B;font-size:12px">{{ envLine }}</p>
      <!-- No Forgot password, no Microsoft SSO (unsupported) -->
      <ion-item><ion-input label="USERNAME" labelPlacement="stacked" [(ngModel)]="username" placeholder="Enter username"></ion-input></ion-item>
      <ion-item>
        <ion-input label="PASSWORD" labelPlacement="stacked" [type]="showPw ? 'text' : 'password'" [(ngModel)]="password" placeholder="Enter password"></ion-input>
        <span slot="end" style="cursor:pointer;color:#94A3B8" (click)="showPw=!showPw">{{ showPw ? '🙈' : '👁' }}</span>
      </ion-item>
      <ion-button class="cta" expand="block" [disabled]="!username || !password" (click)="signIn()" style="margin-top:20px">Sign In</ion-button>
      <p *ngIf="error" style="color:var(--ion-color-danger);text-align:center;font-size:12px">{{ error }}</p>
    </ion-content>
  `,
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  showPw = false;
  error = '';
  envLine = '';

  constructor(private session: SessionService, private ws: WorkspaceService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    const w = await this.ws.get();
    this.envLine = `${w.environment} — ${w.serverUrl || 'not set'}`;
  }

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
