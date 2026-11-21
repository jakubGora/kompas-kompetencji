import type { AppUser } from '@core/domain/people.model';
import type { MockDb } from './db';

export interface RouteContext {
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly body: unknown;
  readonly db: MockDb;
  readonly user: AppUser;
}

export type RouteHandler = (ctx: RouteContext) => unknown;

interface RouteOptions {
  /** Odpowiedź „AI” — dłuższe symulowane opóźnienie. */
  readonly ai?: boolean;
}

interface Route {
  readonly method: string;
  readonly pattern: RegExp;
  readonly keys: readonly string[];
  readonly handler: RouteHandler;
  readonly ai: boolean;
}

export interface RouteMatch {
  readonly handler: RouteHandler;
  readonly params: Record<string, string>;
  readonly ai: boolean;
}

export class MockRouter {
  private readonly routes: Route[] = [];

  get(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.add('GET', path, handler, options);
  }

  post(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.add('POST', path, handler, options);
  }

  put(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.add('PUT', path, handler, options);
  }

  patch(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.add('PATCH', path, handler, options);
  }

  delete(path: string, handler: RouteHandler, options?: RouteOptions): this {
    return this.add('DELETE', path, handler, options);
  }

  match(method: string, path: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const result = route.pattern.exec(path);
      if (result) {
        const params: Record<string, string> = {};
        route.keys.forEach((key, index) => (params[key] = decodeURIComponent(result[index + 1] ?? '')));
        return { handler: route.handler, params, ai: route.ai };
      }
    }
    return null;
  }

  private add(method: string, path: string, handler: RouteHandler, options?: RouteOptions): this {
    const keys: string[] = [];
    const source = path.replace(/:([a-zA-Z]+)/g, (_, key: string) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({ method, pattern: new RegExp(`^${source}/?$`), keys, handler, ai: options?.ai ?? false });
    return this;
  }
}
