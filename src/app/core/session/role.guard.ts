import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { UserRole } from '@core/domain/people.model';
import { SessionStore } from './session.store';

export function roleGuard(role: UserRole): CanActivateFn {
  return () => {
    const session = inject(SessionStore);
    return session.user()?.roles.includes(role) ? true : inject(Router).createUrlTree(['/brak-dostepu']);
  };
}
