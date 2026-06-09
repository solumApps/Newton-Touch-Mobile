import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
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
/**
 * Entry guard for the root path. Returns true only when the user is fully set up
 * (signed in AND a store selected) so the app can resume straight to the home tabs
 * after a relaunch instead of forcing the server/environment screen again.
 */
export const entryGuard: CanMatchFn = async () => {
  const session = inject(SessionService);
  const ws = inject(WorkspaceService);
  if (!(await session.isAuthed())) return false;
  const w = await ws.get();
  return !!w.storeId;
};
