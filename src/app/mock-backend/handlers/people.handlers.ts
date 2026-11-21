import type { EmployeeDetail } from '@core/api/api.types';
import { formatDatePl } from '@core/domain/date';
import type { AppUser, Employee, EmployeeListItem } from '@core/domain/people.model';
import { EMPLOYEES, USERS } from '../data/org';
import { canSeeCase } from '../access';
import type { MockDb } from '../db';
import { computeDeadlines, personRef } from '../engine/case-factory';
import { summarizeCase } from '../engine/case-summary';
import { forbidden } from '../http';
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

export function registerPeopleRoutes(router: MockRouter): void {
  router
    .get('/employees', ({ db, user }) =>
      EMPLOYEES.filter((employee) => canSeeEmployee(db, user, employee))
        .map((employee) => listItem(db, employee))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pl')),
    )
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
    .get('/users', ({ query }) => {
      const role = query.get('role');
      return USERS.filter((candidate) => !role || candidate.roles.includes(role as AppUser['roles'][number])).map(personRef);
    });
}
