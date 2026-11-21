import type { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@env/environment';
import type { MockBackend } from '@mock-backend/mock-backend';
import { from, switchMap } from 'rxjs';

let backend: Promise<MockBackend> | undefined;

/**
 * Przekierowuje żądania `/api` do backendu demonstracyjnego w przeglądarce.
 * Kod mocka ładuje się leniwie i nie trafia do aplikacji, gdy `useMockBackend` jest wyłączone.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (request, next) => {
  if (!environment.useMockBackend || !request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }
  backend ??= import('@mock-backend/mock-backend').then((module) => module.createMockBackend());
  return from(backend).pipe(switchMap((instance) => instance.handle(request)));
};
