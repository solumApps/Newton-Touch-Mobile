import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonModal } from '@ionic/angular/standalone';
import { SessionService, Session } from '../services/session.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, IonContent, IonModal, PageHeaderComponent],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  session: Session | null = null;
  ws: Workspace | null = null;
  showSignOutAlert = false;

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
  changeEnv(): void { this.router.navigateByUrl('/auth/environment'); }
  serverConfig(): void { this.router.navigateByUrl('/server-config'); }

  signOut(): void {
    this.showSignOutAlert = true;
  }

  async confirmSignOut(): Promise<void> {
    this.showSignOutAlert = false;
    await this.sessionSvc.signOut();
    this.router.navigateByUrl('/auth/environment');
  }
}
