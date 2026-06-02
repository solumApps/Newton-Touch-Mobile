import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { WorkspaceService, SERVERS } from '../services/workspace.service';

@Component({
  selector: 'app-environment',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  styles: [`
    .wrap{padding:24px 20px}
    .brand{text-align:center;margin:36px 0 6px}
    .brand img{height:30px}
    .brand .sub{font-size:12px;color:var(--nt-muted);letter-spacing:1px;text-transform:uppercase;margin-top:6px}
    h3{font-size:14px;font-weight:800;color:var(--nt-text);margin:22px 0 4px}
    p.hint{font-size:11px;color:var(--nt-muted);margin:0 0 12px}
    .env{display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer}
    .dot{width:18px;height:18px;border-radius:50%;border:2px solid var(--nt-border);flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .env.sel .dot{border-color:var(--nt-purple)}
    .env.sel .dot::after{content:'';width:9px;height:9px;border-radius:50%;background:var(--nt-purple)}
    .env .name{font-size:13px;font-weight:700;color:var(--nt-text)}
    .env .url{font-size:10px;color:var(--nt-muted)}
    .custom{display:flex;align-items:center;gap:8px;border:1.5px dashed var(--nt-border);border-radius:8px;padding:10px 12px;margin-top:4px}
    .custom input{border:0;outline:0;flex:1;font-size:12px;font-family:inherit}
  `],
  template: `
    <ion-content>
      <div class="wrap">
        <div class="brand"><img src="assets/solum-logo.svg" alt="SOLUM" /><div class="sub">Newton Touch</div></div>
        <h3>Choose environment</h3>
        <p class="hint">Shown once. Change later in Settings.</p>

        <div class="crd env" [class.sel]="selected===name" *ngFor="let name of envs" (click)="pick(name)">
          <div class="dot"></div>
          <div><div class="name">{{ name }}</div><div class="url">{{ servers[name] }}</div></div>
        </div>

        <div class="custom">
          <div class="dot" [class.sel]="custom" (click)="useCustom()" style="border-color:var(--nt-border)"></div>
          <input [(ngModel)]="customUrl" (focus)="useCustom()" placeholder="Custom server URL…" />
        </div>

        <button class="btn-y" style="margin-top:22px" [disabled]="!canContinue()" (click)="continue()">Continue →</button>
      </div>
    </ion-content>
  `,
})
export class EnvironmentComponent {
  servers = SERVERS;
  envs = Object.keys(SERVERS);
  selected = 'Stage 00';
  custom = false;
  customUrl = '';

  constructor(private ws: WorkspaceService, private router: Router) {}

  pick(name: string): void { this.selected = name; this.custom = false; }
  useCustom(): void { this.custom = true; this.selected = ''; }
  canContinue(): boolean { return this.custom ? !!this.customUrl.trim() : !!this.selected; }

  async continue(): Promise<void> {
    if (this.custom) {
      await this.ws.set({ environment: 'Custom', serverUrl: this.customUrl.trim() });
    } else {
      await this.ws.setEnvironment(this.selected);
    }
    this.router.navigateByUrl('/auth/login');
  }
}
