import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonModal, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { businessOutline, globeOutline, keyOutline, logOutOutline, chevronForward, warningOutline } from 'ionicons/icons';
import { SessionService, Session } from '../services/session.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { PageHeaderComponent } from '../shared/page-header.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, IonContent, IonModal, IonIcon, PageHeaderComponent],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit, OnDestroy {
  session: Session | null = null;
  ws: Workspace | null = null;
  showSignOutAlert = false;
  private wsSub?: Subscription;

  constructor(
    private sessionSvc: SessionService,
    private wsSvc: WorkspaceService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ businessOutline, globeOutline, keyOutline, logOutOutline, chevronForward, warningOutline });
  }

  get initials(): string {
    const u = this.session?.username || '';
    return u ? u.trim().slice(0, 2).toUpperCase() : '–';
  }

  async ngOnInit(): Promise<void> {
    this.wsSub = this.wsSvc.changed.subscribe(ws => {
      this.ws = ws;
      this.cdr.detectChanges();
    });
    await this.refresh();
  }
  
  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  async ionViewWillEnter(): Promise<void> { await this.refresh(); }
  private async refresh(): Promise<void> {
    this.session = await this.sessionSvc.current();
    this.ws = await this.wsSvc.get();
    this.cdr.detectChanges();
  }

  changeWorkspace(): void { this.router.navigate(['/auth/workspace'], { queryParams: { returnTo: '/tabs/settings' } }); }
  changeEnv(): void { this.router.navigate(['/auth/environment'], { queryParams: { returnTo: '/tabs/settings' } }); }
  serverConfig(): void { this.router.navigate(['/server-config'], { queryParams: { returnTo: '/tabs/settings' } }); }

  signOut(): void {
    console.log('SignOut button clicked, setting showSignOutAlert to true');
    this.showSignOutAlert = true;
  }

  async confirmSignOut(): Promise<void> {
    console.log('SignOut confirmed');
    this.showSignOutAlert = false;
    await this.sessionSvc.signOut();
    this.router.navigateByUrl('/auth/environment');
  }

  modalDismissed(): void {
    console.log('Modal didDismiss event fired, setting showSignOutAlert to false');
    this.showSignOutAlert = false;
  }
}
