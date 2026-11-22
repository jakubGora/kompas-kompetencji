import type { EmployeeDetail } from '@core/api/api.types';
import { formatDatePl } from '@core/domain/date';
import type { AppUser, CivilServiceStatus, Employee, EmployeeListItem } from '@core/domain/people.model';
import { USERS } from '../data/org';
import { POSITIONS } from '../data/positions';
import { canSeeCase } from '../access';
import type { MockDb } from '../db';
import { computeDeadlines, personRef } from '../engine/case-factory';
import { summarizeCase } from '../engine/case-summary';
import { newId } from '../engine/text';
import { badRequest, forbidden } from '../http';
import type { MockRouter } from '../router';

function canSeeEmployee(db: MockDb, user: AppUser, employee: Employee): boolean {
  return (
    user.roles.includes('hr') ||
    employee.supervisorId === user.id ||
    db.state.cases.some((c) => c.employee.id === employee.id && c.headOfUnit?.id === user.id)
  );
}

function listItem(db: MockDb, employee: Employee): EmployeeListItem {
  const position = db.position(employee.positionId);
  const unit = db.orgUnit(employee.orgUnitId);
  const active = db.state.cases.find((c) => c.employee.id === employee.id && c.status === 'w-toku');
  const summary = active ? summarizeCase(active, db.state.today) : null;
  const path = employee.employment.basis === 'pierwsza-umowa' ? 'first' : 'periodic';
  const nextStart = active ? null : computeDeadlines(employee, path).preliminaryDueDate;
  const previous = employee.previousAssessment;
  return {
    id: employee.id,
    fullName: employee.fullName,
    positionTitle: position.title,
    positionCode: position.code,
    orgUnitCode: unit.code,
    orgUnitName: unit.name,
    supervisor: personRef(db.user(employee.supervisorId)),
    status: employee.status,
    employedSince: employee.employment.since,
    suggestedPath: path,
    ...(previous ? { previousAssessment: previous } : {}),
    ...(active ? { activeCaseId: active.id } : {}),
    ...(summary
      ? { nextAction: { label: summary.nextActionLabel, ...(summary.nextActionDue ? { dueDate: summary.nextActionDue } : {}) } }
      : nextStart
        ? { nextAction: { label: `Uruchom nowy cykl — część I do ${formatDatePl(nextStart)}`, dueDate: nextStart } }
        : {}),
  };
}

interface CreateEmployeeBody {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly positionId?: string;
  readonly status?: CivilServiceStatus;
  readonly employmentBasis?: 'pierwsza-umowa' | 'czas-nieokreslony';
  readonly employedSince?: string;
  readonly supervisorId?: string;
}

export function registerPeopleRoutes(router: MockRouter): void {
  router
    .get('/employees', ({ db, user }) =>
      db
        .employees()
        .filter((employee) => canSeeEmployee(db, user, employee))
        .map((employee) => listItem(db, employee))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pl')),
    )
    .post('/employees', ({ db, user, body }) => {
      const data = (body ?? {}) as CreateEmployeeBody;
      const firstName = data.firstName?.trim() ?? '';
      const lastName = data.lastName?.trim() ?? '';
      if (!firstName || !lastName) throw badRequest('Podaj imię i nazwisko.');
      if (!data.positionId) throw badRequest('Wybierz stanowisko.');
      const position = db.position(data.positionId);
      const isHr = user.roles.includes('hr');
      const supervisorId = isHr ? data.supervisorId : user.id;
      if (!supervisorId) throw badRequest('Wybierz przełożonego.');
      db.user(supervisorId);
      if (!isHr && supervisorId !== user.id) {
        throw forbidden('Przełożony może dodać tylko osoby do swojego zespołu.');
      }
      const status: CivilServiceStatus = data.status === 'urzednik-sc' ? 'urzednik-sc' : 'pracownik-sc';
      const basis = data.employmentBasis === 'pierwsza-umowa' ? 'pierwsza-umowa' : 'czas-nieokreslony';
      const employedSince = data.employedSince?.trim() || db.state.today;
      const employee: Employee = {
        id: newId('e'),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        positionId: position.id,
        orgUnitId: position.orgUnitId,
        supervisorId,
        status,
        employment: {
          since: employedSince,
          basis,
          ...(basis === 'pierwsza-umowa'
            ? {
                firstContractEnd: (() => {
                  const [y, m, d] = employedSince.split('-').map(Number);
                  return `${(y ?? 2026) + 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                })(),
              }
            : {}),
        },
        absences: [],
      };
      db.saveEmployee(employee);
      return listItem(db, employee);
    })
    .patch('/employees/:employeeId', ({ db, user, params, body }) => {
      const data = (body ?? {}) as CreateEmployeeBody;
      const current = db.employee(params['employeeId'] ?? '');
      const isHr = user.roles.includes('hr');
      if (!isHr && current.supervisorId !== user.id) {
        throw forbidden('Umowę zmieniają kadry albo bezpośredni przełożony.');
      }
      if (data.employmentBasis !== 'pierwsza-umowa' && data.employmentBasis !== 'czas-nieokreslony') {
        throw badRequest('Wybierz rodzaj umowy.');
      }
      const employedSince = data.employedSince?.trim() ?? '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(employedSince)) throw badRequest('Podaj datę zatrudnienia.');
      const basis = data.employmentBasis;
      const [year, month, day] = employedSince.split('-');
      const updated: Employee = {
        ...current,
        employment: {
          since: employedSince,
          basis,
          ...(basis === 'pierwsza-umowa' ? { firstContractEnd: `${Number(year) + 1}-${month}-${day}` } : {}),
        },
      };
      db.saveEmployee(updated);
      return listItem(db, updated);
    })
    .get('/employees/:employeeId', ({ db, user, params }): EmployeeDetail => {
      const employee = db.employee(params['employeeId'] ?? '');
      if (!canSeeEmployee(db, user, employee)) {
        throw forbidden('Dane pracownika są dostępne dla przełożonego i kadr.');
      }
      return {
        employee: listItem(db, employee),
        position: db.position(employee.positionId),
        cases: db.state.cases
          .filter((c) => c.employee.id === employee.id && canSeeCase(c, user))
          .map((c) => summarizeCase(c, db.state.today))
          .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
      };
    })
    .get('/positions', ({ db, user }) => {
      const isHr = user.roles.includes('hr');
      const list = isHr ? POSITIONS : db.positionsInUnit(user.orgUnitId);
      return list.map((position) => ({
        id: position.id,
        code: position.code,
        title: position.title,
        orgUnitId: position.orgUnitId,
        orgUnitName: db.orgUnit(position.orgUnitId).name,
      }));
    })
    .get('/users', ({ query }) => {
      const role = query.get('role');
      return USERS.filter((candidate) => !role || candidate.roles.includes(role as AppUser['roles'][number])).map(personRef);
    });
}
