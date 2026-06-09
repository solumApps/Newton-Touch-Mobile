import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';
import { WorkspaceService } from './workspace.service';

/** Protects the main app: redirects to the auth flow when there's no session. */
export const authGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return (await session.isAuthed()) ? true : router.parseUrl('/auth/environment');
};

/** App launch route: resume the main app when a valid session is already stored. */
export const startupGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const router = inject(Router);
  return router.parseUrl((await session.isAuthed()) ? '/tabs/themes' : '/auth/environment');
};

/**
 * Entry guard for the root path. Resumes straight to the home tabs when the user
 * is fully set up (signed in AND a store selected) after a relaunch; otherwise
 * sends them into the auth flow. Returns a UrlTree (redirectTo can't be combined
 * with guards), so attach it via canActivate on a component-less root route.
 */
export const entryGuard: CanActivateFn = async () => {
  const session = inject(SessionService);
  const ws = inject(WorkspaceService);
  const router = inject(Router);
  if (await session.isAuthed()) {
    const w = await ws.get();
    if (w.storeId) return router.parseUrl('/tabs/themes');
  }
  return router.parseUrl('/auth/environment');
};
