import type { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@env/environment';

const STORAGE_KEY = 'kompas.workspace';
const HEADER = 'X-Kompas-Workspace';

let workspaceId: string | undefined;

/** Każda przeglądarka pracuje na własnej kopii danych demo — jurorzy nie nadpisują sobie spraw. */
function currentWorkspace(): string {
  if (workspaceId) return workspaceId;
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  const stored = storage?.getItem(STORAGE_KEY);
  workspaceId = stored && /^[A-Za-z0-9_-]{6,64}$/.test(stored) ? stored : `ws-${crypto.randomUUID().replaceAll('-', '')}`;
  storage?.setItem(STORAGE_KEY, workspaceId);
  return workspaceId;
}

export const workspaceInterceptor: HttpInterceptorFn = (request, next) => {
  if (environment.useMockBackend || !request.url.startsWith(environment.apiBaseUrl)) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { [HEADER]: currentWorkspace() } }));
};
