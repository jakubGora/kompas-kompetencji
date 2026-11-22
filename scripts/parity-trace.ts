/**
 * Odtwarza scenariusz żądań na backendzie demonstracyjnym i zapisuje odpowiedzi — wzorzec do testu zgodności
 * backendu Python (kk_rag/tests/test_parity.py).
 * Uruchomienie: npm run parity:trace -- <flow.json> <expected.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { MockDb } from '../src/app/mock-backend/db';
import {
  isPublicAuthPath,
  registerAuthRoutes,
  resolveMockUser,
  userIdFromAuthorization,
} from '../src/app/mock-backend/handlers/auth.handlers';
import { registerCaseRoutes } from '../src/app/mock-backend/handlers/case.handlers';
import { registerKnowledgeRoutes } from '../src/app/mock-backend/handlers/knowledge.handlers';
import { registerNotificationRoutes } from '../src/app/mock-backend/handlers/notification.handlers';
import { registerPeopleRoutes } from '../src/app/mock-backend/handlers/people.handlers';
import { registerRecruitmentRoutes } from '../src/app/mock-backend/handlers/recruitment.handlers';
import { registerSessionRoutes } from '../src/app/mock-backend/handlers/session.handlers';
import { MockHttpError, unauthorized } from '../src/app/mock-backend/http';
import { MockRouter } from '../src/app/mock-backend/router';

interface Step {
  readonly m: string;
  readonly p: string;
  readonly b?: unknown;
  readonly save?: Readonly<Record<string, string>>;
}

const [flowPath, outPath] = process.argv.slice(2);
if (!flowPath || !outPath) throw new Error('Usage: parity-trace <flow.json> <expected.json>');

const router = new MockRouter();
registerAuthRoutes(router);
registerSessionRoutes(router);
registerKnowledgeRoutes(router);
registerCaseRoutes(router);
registerPeopleRoutes(router);
registerNotificationRoutes(router);
registerRecruitmentRoutes(router);

const db = new MockDb(null);
const vars: Record<string, unknown> = {};
const fill = (text: string) => text.replace(/\$\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''));
const pick = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (Array.isArray(current)) return current.at(Number(key));
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, value);

function run(method: string, pathWithQuery: string, body: unknown, authorization: string | null) {
  const url = new URL(pathWithQuery, 'http://kompas.mock');
  const match = router.match(method, url.pathname);
  if (!match) return { status: 404, body: { code: 'not-found', message: `Brak endpointu ${method} ${url.pathname}.` } };
  try {
    if (!isPublicAuthPath(method, url.pathname) && !userIdFromAuthorization(authorization)) {
      throw unauthorized();
    }
    const user = isPublicAuthPath(method, url.pathname)
      ? db.sessionUser()
      : resolveMockUser(db, authorization);
    const result = match.handler({ params: match.params, query: url.searchParams, body, db, user });
    const json = result === undefined ? null : structuredClone(result);
    return { status: 200, body: json };
  } catch (error) {
    if (error instanceof MockHttpError) return { status: error.status, body: error.body };
    throw error;
  }
}

const boot = run('POST', '/auth/login', { login: 'piotr', password: 'piotr' }, null);
if (boot.status !== 200) throw new Error('Nie udało się zalogować Piotra na start śladu.');
let token = String((boot.body as { token: string }).token);

const steps = JSON.parse(readFileSync(flowPath, 'utf-8')) as Step[];
const results = steps.map((step) => {
  const body = step.b === undefined ? null : JSON.parse(fill(JSON.stringify(step.b)));
  const result = run(step.m, fill(step.p), body, `Bearer ${token}`);
  if (step.p === '/auth/login' && result.status === 200 && result.body && typeof result.body === 'object') {
    token = String((result.body as { token: string }).token);
  }
  if (result.status === 200) {
    for (const [name, path] of Object.entries(step.save ?? {})) vars[name] = pick(result.body, path);
  }
  return result;
});

writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`, 'utf-8');
console.log(`Zapisano ${results.length} odpowiedzi w ${outPath}`);
