import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

/** Chroni shell aplikacji — bez tokenu tylko ekran logowania. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/logowanie']);
};

/** Zalogowany użytkownik nie powinien wracać na /logowanie. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  if (!auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/']);
};
