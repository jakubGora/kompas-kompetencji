import type { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@env/environment';

const HEADER = 'X-Kompas-Workspace';
const WORKSPACE_ID = 'default';

/** Jedna przestrzeń na bazie. Id w localStorage ginęło razem z danymi przeglądarki. */
export const workspaceInterceptor: HttpInterceptorFn = (request, next) => {
  if (environment.useMockBackend || !request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { [HEADER]: WORKSPACE_ID } }));
};
