import type {
  AssessmentCase,
  AssessmentPath,
  CaseDeadlines,
  HistoryEvent,
  HistoryKind,
  StepId,
} from '@core/domain/assessment.model';
import { formatDatePl, type IsoDateTime } from '@core/domain/date';
import {
  firstAssessmentWindows,
  periodicDueDate,
  preliminaryMeetingDueDate,
} from '@core/domain/deadlines';
import type { AppUser, Employee, PersonRef } from '@core/domain/people.model';
import type { Position } from '@core/domain/position.model';
import { newId } from './text';

/** Sprawa w „bazie” mocka — pole `access` wylicza się per żądanie. */
export type StoredCase = Omit<AssessmentCase, 'access'>;

export function personRef(user: AppUser): PersonRef {
  return { id: user.id, fullName: user.fullName, jobTitle: user.jobTitle };
}

export function historyEvent(
  at: IsoDateTime,
  actor: PersonRef,
  kind: HistoryKind,
  summary: string,
  stepId?: StepId,
): HistoryEvent {
  return { id: newId('h'), at, actor, kind, summary, ...(stepId ? { stepId } : {}) };
}

export function computeDeadlines(employee: Employee, path: AssessmentPath): CaseDeadlines {
  if (path === 'first') {
    const contractEnd = employee.employment.firstContractEnd;
    if (!contractEnd) {
      throw new Error(`Pracownik ${employee.fullName} nie ma pierwszej umowy na czas określony.`);
    }
    const windows = firstAssessmentWindows(employee.employment.since, contractEnd);
    return {
      dueDate: windows.assessmentDeadline,
      baseDueDate: windows.assessmentDeadline,
      basis: 'Najpóźniej miesiąc przed końcem umowy (art. 38 ust. 1 ustawy)',
      extensions: [],
      preliminaryDueDate: windows.preliminaryDueDate,
      windowStart: windows.earliestReportDate,
    };
  }

  const previous = employee.previousAssessment;
  const start = previous?.draftedAt ?? employee.employment.since;
  const due = periodicDueDate(start, employee.absences);
  return {
    dueDate: due.dueDate,
    baseDueDate: due.baseDueDate,
    basis: previous
      ? `24 miesiące od sporządzenia poprzedniej oceny (${formatDatePl(start)})`
      : `24 miesiące od zatrudnienia na czas nieokreślony (${formatDatePl(start)})`,
    extensions: due.extensions.map((absence) => ({
      days: absence.days,
      reason: `${absence.reason} (${absence.from} – ${absence.to})`,
      from: absence.from,
      to: absence.to,
      legalBasis: 'art. 81 ust. 7 ustawy o służbie cywilnej',
    })),
    preliminaryDueDate: preliminaryMeetingDueDate(start, previous?.outcome),
  };
}

export interface NewCaseParams {
  readonly id?: string;
  readonly path: AssessmentPath;
  readonly employee: Employee;
  readonly position: Position;
  readonly evaluator: PersonRef;
  readonly headOfUnit?: PersonRef;
  readonly orgUnitName: string;
  readonly createdAt: IsoDateTime;
  readonly createdBy: PersonRef;
}

export function createCase(params: NewCaseParams): StoredCase {
  return {
    id: params.id ?? newId('case'),
    path: params.path,
    status: 'w-toku',
    employee: params.employee,
    position: params.position,
    evaluator: params.evaluator,
    ...(params.headOfUnit ? { headOfUnit: params.headOfUnit } : {}),
    orgUnitName: params.orgUnitName,
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    steps: {},
    deadlines: computeDeadlines(params.employee, params.path),
    positionReview: {},
    criteria: { additional: [], rejectedSuggestions: [] },
    preliminary: { topics: {}, expectations: [], goals: [], notes: '' },
    preparatoryService: { note: '' },
    report: { summary: { tasks: '', problems: '', skills: '', improvements: '' } },
    observations: [],
    review: { topics: {}, notes: '', employeePerspective: '', developmentNeeds: '' },
    ratings: [],
    conclusion: { justification: '', developmentPlan: '', promotionJustification: '' },
    documents: [],
    history: [
      historyEvent(
        params.createdAt,
        params.createdBy,
        'utworzenie',
        params.path === 'first' ? 'Uruchomiono pierwszą ocenę.' : 'Uruchomiono ocenę okresową.',
      ),
    ],
  };
}
