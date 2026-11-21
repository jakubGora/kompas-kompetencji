import type { DemoAccount, DemoInfo, SessionInfo } from '@core/api/api.types';
import { pluralPl } from '@core/domain/date';
import type { AppUser, OrgUnit } from '@core/domain/people.model';
import { USERS } from '../data/org';
import { SCENARIOS } from '../data/scenarios';
import type { MockDb } from '../db';
import { badRequest } from '../http';
import type { MockRouter } from '../router';

function rootUnit(db: MockDb, unit: OrgUnit): OrgUnit {
  let current = unit;
  while (current.parentId) {
    current = db.orgUnit(current.parentId);
  }
  return current;
}

export function sessionInfo(db: MockDb, user: AppUser): SessionInfo {
  const orgUnit = db.orgUnit(user.orgUnitId);
  return { user, orgUnit, office: rootUnit(db, orgUnit), today: db.state.today };
}

function accountHint(db: MockDb, user: AppUser): string {
  if (user.roles.includes('hr')) {
    return 'Kadry · wszystkie procesy, terminy i przypomnienia';
  }
  const active = db.state.cases.filter((c) => c.status === 'w-toku');
  const asEvaluator = active.filter((c) => c.evaluator.id === user.id).length;
  const asHead = active.filter((c) => c.headOfUnit?.id === user.id).length;
  const parts: string[] = [];
  if (asEvaluator > 0) {
    parts.push(`Oceniający · ${asEvaluator} ${pluralPl(asEvaluator, ['ocena', 'oceny', 'ocen'])} w toku`);
  }
  if (asHead > 0) {
    parts.push(`Kierujący komórką · ${asHead} ${pluralPl(asHead, ['pierwsza ocena', 'pierwsze oceny', 'pierwszych ocen'])}`);
  }
  return parts.join(' · ') || 'Przełożony';
}

function demoInfo(db: MockDb): DemoInfo {
  const accounts: DemoAccount[] = USERS.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    jobTitle: user.jobTitle,
    roles: user.roles,
    hint: accountHint(db, user),
  }));
  return {
    scenarioId: db.state.scenarioId,
    today: db.state.today,
    scenarios: SCENARIOS,
    accounts,
  };
}

export function registerSessionRoutes(router: MockRouter): void {
  router
    .get('/session', ({ db, user }) => sessionInfo(db, user))
    .get('/demo', ({ db }) => demoInfo(db))
    .post('/demo/session', ({ db, body }) => {
      const { userId } = (body ?? {}) as { userId?: string };
      const user = db.user(userId ?? '');
      db.update((state) => ({ ...state, sessionUserId: user.id }));
      return sessionInfo(db, user);
    })
    .post('/demo/scenario', ({ db, body }) => {
      const { scenarioId } = (body ?? {}) as { scenarioId?: string };
      const scenario = SCENARIOS.find((candidate) => candidate.id === scenarioId);
      if (!scenario) {
        throw badRequest('Nieznany scenariusz demonstracyjny.');
      }
      db.reset(scenario.id, 'u-piotr');
      return { landing: scenario.landing };
    })
    .post('/demo/reset', ({ db }) => {
      db.reset('demo');
      return { landing: '/' };
    });
}
