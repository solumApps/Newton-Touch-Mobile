import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { SessionService } from '../services/session.service';
import { WorkspaceService } from '../services/workspace.service';
import { BrandComponent } from '../shared/brand.component';

/** A1 — Login. Real SOLUM token API via SessionService. Email/username + password. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, BrandComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  showPw = false;
  loading = false;
  touched = false;
  error = '';
  envName = '';
  envUrl = '';

  constructor(private session: SessionService, private ws: WorkspaceService, private router: Router) {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  async ngOnInit(): Promise<void> {
    const w = await this.ws.get();
    this.envName = w.environment;
    this.envUrl = w.serverUrl || 'not set';
  }

  /** Accept a username, or — if it looks like an email — require a valid email. */
  validUser(): boolean {
    const v = this.username.trim();
    if (!v) return false;
    if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return true;
  }
  canSubmit(): boolean { return this.validUser() && !!this.password; }

  changeEnv(): void { this.router.navigateByUrl('/auth/environment'); }

  async signIn(): Promise<void> {
    this.touched = true;
    if (!this.canSubmit()) { this.error = ''; return; }
    this.error = '';
    this.loading = true;
    try {
      await this.session.signIn(this.username.trim(), this.password);
      this.router.navigateByUrl('/auth/workspace');
    } catch (e: any) {
      this.error = e?.message || 'Login failed. Check your credentials and server.';
    } finally {
      this.loading = false;
    }
  }
}
