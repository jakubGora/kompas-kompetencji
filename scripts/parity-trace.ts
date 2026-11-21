/**
 * Odtwarza scenariusz żądań na backendzie demonstracyjnym i zapisuje odpowiedzi — wzorzec do testu zgodności
 * backendu Python (kk_rag/tests/test_parity.py).
 * Uruchomienie: npm run parity:trace -- <flow.json> <expected.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { MockDb } from '../src/app/mock-backend/db';
import { registerCaseRoutes } from '../src/app/mock-backend/handlers/case.handlers';
import { registerKnowledgeRoutes } from '../src/app/mock-backend/handlers/knowledge.handlers';
import { registerNotificationRoutes } from '../src/app/mock-backend/handlers/notification.handlers';
import { registerPeopleRoutes } from '../src/app/mock-backend/handlers/people.handlers';
import { registerRecruitmentRoutes } from '../src/app/mock-backend/handlers/recruitment.handlers';
import { registerSessionRoutes } from '../src/app/mock-backend/handlers/session.handlers';
import { MockHttpError } from '../src/app/mock-backend/http';
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

const steps = JSON.parse(readFileSync(flowPath, 'utf-8')) as Step[];
const results = steps.map((step) => {
  const url = new URL(fill(step.p), 'http://kompas.mock');
  const body = step.b === undefined ? null : JSON.parse(fill(JSON.stringify(step.b)));
  const match = router.match(step.m, url.pathname);
  if (!match) return { status: 404, body: { code: 'not-found', message: `Brak endpointu ${step.m} ${url.pathname}.` } };
  try {
    const result = match.handler({ params: match.params, query: url.searchParams, body, db, user: db.sessionUser() });
    const json = result === undefined ? null : structuredClone(result);
    for (const [name, path] of Object.entries(step.save ?? {})) vars[name] = pick(json, path);
    return { status: 200, body: json };
  } catch (error) {
    if (error instanceof MockHttpError) return { status: error.status, body: error.body };
    throw error;
  }
});

writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`, 'utf-8');
console.log(`Zapisano ${results.length} odpowiedzi w ${outPath}`);
