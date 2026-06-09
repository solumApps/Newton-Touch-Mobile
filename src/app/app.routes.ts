import { Routes } from '@angular/router';
import { authGuard, entryGuard } from './services/auth.guard';

export const routes: Routes = [
  // Resume to home when already signed in with a store selected; else the auth flow.
  // entryGuard returns a UrlTree (redirect), so this route renders nothing itself.
  { path: '', pathMatch: 'full', canActivate: [entryGuard], children: [] },

  // Theme wizard (Create New Theme / Edit)
  { path: 'theme-preview/:id', loadComponent: () => import('./themes/theme-preview.component').then((m) => m.ThemePreviewComponent) },
  { path: 'theme-wizard', loadComponent: () => import('./themes/theme-wizard.component').then((m) => m.ThemeWizardComponent) },
  { path: 'theme-wizard/:id', loadComponent: () => import('./themes/theme-wizard.component').then((m) => m.ThemeWizardComponent) },

  // Content create flow (CC-1 theme → CC-2 mode → per-mode data → deploy)
  { path: 'content-create', loadComponent: () => import('./content/content-create.component').then((m) => m.ContentCreateComponent) },
  { path: 'content-builder/:id', loadComponent: () => import('./content/content-builder.component').then((m) => m.ContentBuilderComponent) },
  { path: 'deploy/:id', loadComponent: () => import('./content/deploy.component').then((m) => m.DeployComponent) },
  { path: 'server-config', loadComponent: () => import('./settings/server-config.component').then((m) => m.ServerConfigComponent) },

  // Auth flow (A0–A2)
  { path: 'auth/environment', loadComponent: () => import('./auth/environment.component').then((m) => m.EnvironmentComponent) },
  { path: 'auth/login', loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent) },
  { path: 'auth/workspace', loadComponent: () => import('./auth/workspace.component').then((m) => m.WorkspaceComponent) },

  // Main app — 4 tabs
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./tabs/tabs.component').then((m) => m.TabsComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'themes' },
      { path: 'themes', loadComponent: () => import('./pages/themes.page').then((m) => m.ThemesPage) },
      { path: 'content', loadComponent: () => import('./pages/content.page').then((m) => m.ContentPage) },
      { path: 'devices', loadComponent: () => import('./pages/devices.page').then((m) => m.DevicesPage) },
      { path: 'settings', loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage) },
    ],
  },

  { path: '**', redirectTo: 'auth/environment' },
];
