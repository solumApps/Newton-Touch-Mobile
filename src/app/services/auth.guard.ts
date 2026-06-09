import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

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
