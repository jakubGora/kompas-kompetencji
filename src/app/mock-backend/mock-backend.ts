import { HttpErrorResponse, HttpResponse, type HttpEvent, type HttpRequest } from '@angular/common/http';
import { environment } from '@env/environment';
import { mergeMap, of, throwError, timer, type Observable } from 'rxjs';
import { MockDb } from './db';
import { registerCaseRoutes } from './handlers/case.handlers';
import { registerKnowledgeRoutes } from './handlers/knowledge.handlers';
import { registerNotificationRoutes } from './handlers/notification.handlers';
import { registerPeopleRoutes } from './handlers/people.handlers';
import { registerRecruitmentRoutes } from './handlers/recruitment.handlers';
import { registerSessionRoutes } from './handlers/session.handlers';
import { MockHttpError } from './http';
import { MockRouter, type RouteMatch } from './router';

const STATUS_TEXT: Readonly<Record<number, string>> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Content',
  500: 'Internal Server Error',
};

function randomBetween([min, max]: readonly [number, number]): number {
  return Math.round(min + Math.random() * (max - min));
}

/**
 * Backend demonstracyjny działający w przeglądarce. Implementuje ten sam kontrakt REST,
 * którego oczekuje aplikacja od docelowego API (`environment.useMockBackend = false`).
 */
export class MockBackend {
  private readonly router = new MockRouter();

  constructor(
    private readonly db: MockDb,
    private readonly latency: readonly [number, number],
    private readonly aiLatency: readonly [number, number],
  ) {
    registerSessionRoutes(this.router);
    registerKnowledgeRoutes(this.router);
    registerCaseRoutes(this.router);
    registerPeopleRoutes(this.router);
    registerNotificationRoutes(this.router);
    registerRecruitmentRoutes(this.router);
  }

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    const url = new URL(request.urlWithParams, 'http://kompas.mock');
    const path = url.pathname.slice(environment.apiBaseUrl.length) || '/';
    const match = this.router.match(request.method, path);
    const wait = randomBetween(match?.ai ? this.aiLatency : this.latency);
    return timer(wait).pipe(mergeMap(() => this.respond(request, path, url.searchParams, match)));
  }

  private respond(
    request: HttpRequest<unknown>,
    path: string,
    query: URLSearchParams,
    match: RouteMatch | null,
  ): Observable<HttpEvent<unknown>> {
    if (!match) {
      return this.error(request, new MockHttpError(404, { code: 'not-found', message: `Brak endpointu ${request.method} ${path}.` }));
    }
    try {
      const body = match.handler({
        params: match.params,
        query,
        body: request.body === null ? null : structuredClone(request.body),
        db: this.db,
        user: this.db.sessionUser(),
      });
      return of(new HttpResponse({ status: 200, statusText: 'OK', url: request.url, body: body === undefined ? null : structuredClone(body) }));
    } catch (error) {
      if (error instanceof MockHttpError) {
        return this.error(request, error);
      }
      console.error('[mock-backend]', error);
      return this.error(
        request,
        new MockHttpError(500, { code: 'internal', message: 'Wewnętrzny błąd serwera demonstracyjnego.' }),
      );
    }
  }

  private error(request: HttpRequest<unknown>, error: MockHttpError): Observable<never> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: error.status,
          statusText: STATUS_TEXT[error.status] ?? 'Error',
          url: request.url,
          error: error.body,
        }),
    );
  }
}

export function createMockBackend(): MockBackend {
  const storage = typeof localStorage === 'undefined' ? null : localStorage;
  return new MockBackend(new MockDb(storage), environment.mockLatencyMs, environment.mockAiLatencyMs);
}
