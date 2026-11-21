/**
 * Eksport danych demonstracyjnych do backendu (kk_rag/app/kompas/seed).
 * Uruchomienie: npm run export:seed -- <katalog-docelowy>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CONVERSATION_INTENTS, INTENTS } from '../src/app/mock-backend/data/assistant-intents';
import { FRAGMENTS, sourcesWithCounts } from '../src/app/mock-backend/data/knowledge';
import { EMPLOYEES, ORG_UNITS, USERS } from '../src/app/mock-backend/data/org';
import { POSITIONS } from '../src/app/mock-backend/data/positions';
import { RECRUITMENTS } from '../src/app/mock-backend/data/recruitment';
import { SCENARIOS } from '../src/app/mock-backend/data/scenarios';
import { MockDb } from '../src/app/mock-backend/db';

const target = resolve(process.argv[2] ?? '../kk_rag/app/kompas/seed');
mkdirSync(target, { recursive: true });

const write = (name: string, data: unknown) =>
  writeFileSync(join(target, name), `${JSON.stringify(data, null, 1)}\n`, 'utf-8');

const db = new MockDb(null);
write('model.json', db.model);
write('reference.json', {
  users: USERS,
  employees: EMPLOYEES,
  orgUnits: ORG_UNITS,
  positions: POSITIONS,
  recruitments: RECRUITMENTS,
  scenarios: SCENARIOS,
});
write('knowledge.json', { sources: sourcesWithCounts(), fragments: FRAGMENTS });
write('intents.json', { formal: INTENTS, conversation: CONVERSATION_INTENTS });

for (const scenario of SCENARIOS) {
  db.reset(scenario.id, 'u-piotr');
  write(`state-${scenario.id}.json`, db.state);
}

console.log(`Zapisano dane demonstracyjne w ${target}`);
