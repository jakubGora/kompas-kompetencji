import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@core/session/auth.store';
import { environment } from '@env/environment';
import { catchError, throwError } from 'rxjs';

/** Dokłada Bearer z lokalnej sesji i przy 401 wraca na ekran logowania. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }
  const auth = inject(AuthStore);
  const router = inject(Router);
  const token = auth.token();
  const authed = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(authed).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const path = request.url.slice(environment.apiBaseUrl.length);
        if (!path.startsWith('/auth/login') && !path.startsWith('/auth/accounts')) {
          auth.clear();
          if (!router.url.startsWith('/logowanie')) {
            void router.navigateByUrl('/logowanie');
          }
        }
      }
      return throwError(() => error);
    }),
  );
};
