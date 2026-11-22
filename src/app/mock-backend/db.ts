import type { CompetencyModel } from '@core/domain/competency.model';
import type { CriterionId } from '@core/domain/criteria';
import type { IsoDate, IsoDateTime } from '@core/domain/date';
import type { AppNotification, ReminderLogEntry, ReminderRule } from '@core/domain/notification.model';
import type { AppUser, Employee, OrgUnit } from '@core/domain/people.model';
import type { Position } from '@core/domain/position.model';
import type { Candidate } from '@core/domain/recruitment.model';
import modelJson from './data/model-competencies.json';
import { SEED_NOTIFICATIONS, SEED_REMINDER_LOG, SEED_REMINDER_RULES } from './data/notifications';
import { EMPLOYEES, ORG_UNITS, USERS } from './data/org';
import { POSITIONS } from './data/positions';
import { SEED_CANDIDATES } from './data/recruitment';
import { seedCases } from './data/seed-cases';
import type { StoredCase } from './engine/case-factory';
import { collapseWhitespace } from './engine/text';
import { notFound } from './http';

const STORAGE_KEY = 'kompas.mock-db';
const STATE_VERSION = 9;

/** „Dziś” w danych demonstracyjnych — termin oceny Anny Nowak. */
export const DEMO_TODAY: IsoDate = '2026-11-21';
const DEFAULT_USER_ID = 'u-piotr';

export interface MockState {
  readonly version: number;
  readonly scenarioId: 'demo';
  readonly today: IsoDate;
  readonly sessionUserId: string;
  readonly cases: StoredCase[];
  readonly notifications: AppNotification[];
  readonly reminderRules: ReminderRule[];
  readonly reminderLog: ReminderLogEntry[];
  readonly candidates: Candidate[];
  /** Pracownicy dodani w tej przestrzeni (seed + te). */
  readonly employees: Employee[];
}

function normalizeModel(raw: CompetencyModel): CompetencyModel {
  return {
    ...raw,
    competencies: raw.competencies.map((competency) => ({
      ...competency,
      name: collapseWhitespace(competency.name),
      indicators: competency.indicators.map((indicator) => ({
        ...indicator,
        text: collapseWhitespace(indicator.text),
        behaviors: indicator.behaviors.map((behavior) => ({
          ...behavior,
          label: collapseWhitespace(behavior.label),
          description: collapseWhitespace(behavior.description),
        })),
      })),
    })),
  };
}

/** Przechowalnia stanu mocka: dane w pamięci, utrwalane w localStorage. */
export class MockDb {
  readonly model: CompetencyModel = normalizeModel(modelJson as unknown as CompetencyModel);
  private current: MockState;

  constructor(private readonly storage: Storage | null) {
    this.current = this.load();
  }

  get state(): MockState {
    return this.current;
  }

  update(change: (state: MockState) => MockState): void {
    this.current = change(this.current);
    this.persist();
  }

  reset(sessionUserId = this.current.sessionUserId): void {
    this.current = this.seed(sessionUserId);
    this.persist();
  }

  /** Bieżąca chwila: data demonstracyjna + rzeczywista godzina (czas „ścienny”). */
  now(): IsoDateTime {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${this.current.today}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000Z`;
  }

  user(id: string): AppUser {
    const found = USERS.find((candidate) => candidate.id === id);
    if (!found) throw notFound('użytkownik');
    return found;
  }

  sessionUser(): AppUser {
    return this.user(this.current.sessionUserId);
  }

  employees(): readonly Employee[] {
    const byId = new Map(EMPLOYEES.map((employee) => [employee.id, employee]));
    for (const employee of this.current.employees) byId.set(employee.id, employee);
    return [...byId.values()];
  }

  employee(id: string): Employee {
    const found = this.employees().find((candidate) => candidate.id === id);
    if (!found) throw notFound('pracownik');
    return found;
  }

  saveEmployee(employee: Employee): Employee {
    this.update((state) => ({
      ...state,
      employees: state.employees.some((item) => item.id === employee.id)
        ? state.employees.map((item) => (item.id === employee.id ? employee : item))
        : [...state.employees, employee],
    }));
    return employee;
  }

  position(id: string): Position {
    const found = POSITIONS.find((candidate) => candidate.id === id);
    if (!found) throw notFound('stanowisko');
    return found;
  }

  positionsInUnit(orgUnitId: string): readonly Position[] {
    return POSITIONS.filter((candidate) => candidate.orgUnitId === orgUnitId);
  }

  orgUnit(id: string): OrgUnit {
    const found = ORG_UNITS.find((unit) => unit.id === id);
    if (!found) throw notFound('komórka organizacyjna');
    return found;
  }

  findCase(id: string): StoredCase {
    const found = this.current.cases.find((candidate) => candidate.id === id);
    if (!found) throw notFound('ocena');
    return found;
  }

  saveCase(next: StoredCase): StoredCase {
    const stamped: StoredCase = { ...next, updatedAt: this.now() };
    this.update((state) => ({
      ...state,
      cases: state.cases.some((c) => c.id === stamped.id)
        ? state.cases.map((c) => (c.id === stamped.id ? stamped : c))
        : [stamped, ...state.cases],
    }));
    return stamped;
  }

  indicatorCount(criterionId: CriterionId): number {
    return this.model.competencies.find((competency) => competency.id === criterionId)?.indicators.length ?? 0;
  }

  private load(): MockState {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockState;
        if (parsed.version === STATE_VERSION) {
          return parsed;
        }
      }
    } catch {
      // Uszkodzony stan — zaczynamy od danych startowych.
    }
    const seeded = this.seed(DEFAULT_USER_ID);
    this.current = seeded;
    this.persist();
    return seeded;
  }

  private seed(sessionUserId: string): MockState {
    return {
      version: STATE_VERSION,
      scenarioId: 'demo',
      today: DEMO_TODAY,
      sessionUserId,
      cases: seedCases(),
      notifications: [...SEED_NOTIFICATIONS],
      reminderRules: [...SEED_REMINDER_RULES],
      reminderLog: [...SEED_REMINDER_LOG],
      candidates: [...SEED_CANDIDATES],
      employees: [],
    };
  }

  private persist(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      // Brak miejsca lub tryb prywatny — stan zostaje w pamięci.
    }
  }
}
