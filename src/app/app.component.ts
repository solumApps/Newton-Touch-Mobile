import { AfterViewInit, Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonApp, IonIcon, IonModal, IonRouterOutlet } from '@ionic/angular/standalone';
import { App as CapacitorApp, BackButtonListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { addIcons } from 'ionicons';
import { warningOutline } from 'ionicons/icons';
import { filter } from 'rxjs';
import { AppearanceService } from './services/appearance.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonIcon, IonModal, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet (ionRouteDidChange)="applyStatusBarColor()"></ion-router-outlet>

      <ion-modal [isOpen]="showExitAlert" (didDismiss)="modalDismissed()" class="nt-confirm-modal">
        <ng-template>
          <div class="nt-confirm">
            <div class="nt-confirm-ic warn"><ion-icon name="warning-outline" aria-hidden="true"></ion-icon></div>
            <h2>Exit App?</h2>
            <p>Are you sure you want to exit the app?</p>
            <div class="nt-confirm-actions">
              <button class="btn-cancel" (click)="showExitAlert = false">Cancel</button>
              <button class="btn-yes" (click)="exitApp()">Exit</button>
            </div>
          </div>
        </ng-template>
      </ion-modal>
    </ion-app>
  `,
})
export class AppComponent implements AfterViewInit {
  private readonly authStatusBarColor = '#F8FAFC';
  private readonly tabsStatusBarColor = '#2F006D';
  private readonly transitionUpdateDelays = [0, 100, 250, 600];
  private lastStatusBarColor = '';
  private lastStatusBarStyle: Style | null = null;
  private prepareStatusBarPromise: Promise<void> | null = null;
  private statusBarReady = false;
  showExitAlert = false;

  constructor(private router: Router, appearance: AppearanceService) {
    addIcons({ warningOutline });

    // Apply persisted appearance (System/Light/Dark) before first paint settles.
    void appearance.init();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.applyStatusBarColor());

    this.registerHardwareBackButton();
  }

  ngAfterViewInit(): void {
    this.applyStatusBarColor();
  }

  async applyStatusBarColor(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    await this.prepareStatusBar();
    this.transitionUpdateDelays.forEach((delay) => this.scheduleStatusBarUpdate(delay));
  }

  private async prepareStatusBar(): Promise<void> {
    if (this.statusBarReady) return;

    this.prepareStatusBarPromise ??= StatusBar.setOverlaysWebView({ overlay: false }).then(() => {
      this.statusBarReady = true;
    });

    await this.prepareStatusBarPromise;
  }

  private registerHardwareBackButton(): void {
    if (!Capacitor.isNativePlatform()) return;

    CapacitorApp.addListener('backButton', (event) => void this.handleHardwareBackButton(event));
  }

  private async handleHardwareBackButton(event: BackButtonListenerEvent): Promise<void> {
    if (this.isThemesPage()) {
      await this.confirmExitApp();
      return;
    }

    if (event.canGoBack) {
      window.history.back();
      return;
    }

    await this.confirmExitApp();
  }

  private confirmExitApp(): void {
    if (this.showExitAlert) return;

    this.showExitAlert = true;
  }

  modalDismissed(): void {
    this.showExitAlert = false;
  }

  exitApp(): void {
    CapacitorApp.exitApp();
  }

  private isThemesPage(): boolean {
    return this.router.url.split('?')[0] === '/tabs/themes';
  }

  private scheduleStatusBarUpdate(delay: number): void {
    window.setTimeout(() => {
      requestAnimationFrame(() => void this.updateStatusBarFromHeader());
    }, delay);
  }

  private async updateStatusBarFromHeader(): Promise<void> {
    const color = this.getRouteStatusBarColor() || this.getActiveHeaderColor() || this.tabsStatusBarColor;
    const style = this.isLightColor(color) ? Style.Light : Style.Dark;

    if (color === this.lastStatusBarColor && style === this.lastStatusBarStyle) return;

    await StatusBar.setBackgroundColor({ color });
    await StatusBar.setStyle({ style });

    this.lastStatusBarColor = color;
    this.lastStatusBarStyle = style;
  }

  private getRouteStatusBarColor(): string | null {
    const url = this.router.url.split('?')[0];

    if (url.startsWith('/auth/environment') || url.startsWith('/auth/login')) {
      return this.authStatusBarColor;
    }

    if (url.startsWith('/tabs')) {
      return this.tabsStatusBarColor;
    }

    return null;
  }

  private getActiveHeaderColor(): string | null {
    const toolbars = Array.from(document.querySelectorAll<HTMLElement>('ion-header ion-toolbar'))
      .filter((toolbar) => !toolbar.closest('.ion-page-hidden'));
    const toolbar = toolbars.at(-1);

    if (!toolbar) return null;

    const styles = getComputedStyle(toolbar);
    const toolbarBackground = styles.getPropertyValue('--background') || styles.backgroundColor;
    return this.toStatusBarColor(toolbarBackground);
  }

  private toStatusBarColor(value: string): string | null {
    const resolved = this.resolveCssVars(value.trim());

    const hex = resolved.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/)?.[0];
    if (hex) return this.expandHex(hex);

    const rgb = resolved.match(/rgba?\(([^)]+)\)/)?.[1];
    if (!rgb) return null;

    const [r, g, b] = rgb.split(',').map((part) => Number.parseFloat(part.trim()));
    if ([r, g, b].some((part) => Number.isNaN(part))) return null;

    return this.rgbToHex(r, g, b);
  }

  private resolveCssVars(value: string): string {
    return value.replace(/var\((--[^),\s]+)(?:,\s*([^)]+))?\)/g, (_match, name: string, fallback: string) => {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback || '';
    });
  }

  private expandHex(hex: string): string {
    if (hex.length === 7) return hex.toUpperCase();

    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }

  private isLightColor(hex: string): boolean {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 186;
  }
}
