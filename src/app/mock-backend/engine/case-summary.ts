import type { AttentionReason, CaseSummary, StepId } from '@core/domain/assessment.model';
import { diffInDays, type IsoDate } from '@core/domain/date';
import { caseResult, currentStepId, stepDefinition, stepsFor } from '@core/domain/workflow';
import type { StoredCase } from './case-factory';

interface NextAction {
  readonly label: string;
  readonly due?: IsoDate;
}

function nextAction(c: StoredCase, stepId: StepId): NextAction {
  if (c.status === 'zakonczona') {
    return { label: 'Ocena zakończona' };
  }
  const d = c.deadlines;
  if (c.path === 'first') {
    switch (stepId) {
      case 'rozmowa-wstepna':
        return { label: 'Rozmowa wstępna i termin sprawozdania', due: d.preliminaryDueDate };
      case 'sluzba-przygotowawcza':
        return { label: 'Wynik egzaminu ze służby przygotowawczej', due: d.windowStart };
      case 'obserwacje':
      case 'sprawozdanie':
        return { label: 'Złożenie sprawozdania', due: c.preliminary.reportWindow?.to };
      case 'rozmowa-oceniajaca':
        return { label: 'Rozmowa oceniająca — niezwłocznie po sprawozdaniu', due: d.dueDate };
      default:
        return { label: c.conclusion.sheetGeneratedAt ? 'Zapoznanie z pierwszą oceną' : 'Pierwsza ocena', due: d.dueDate };
    }
  }
  switch (stepId) {
    case 'stanowisko':
    case 'kryteria':
    case 'rozmowa-wstepna':
      return { label: 'Rozmowa i zapoznanie z kryteriami (część I)', due: d.preliminaryDueDate };
    case 'obserwacje':
      return { label: 'Zbieranie obserwacji', due: d.dueDate };
    case 'rozmowa-oceniajaca':
      return { label: 'Rozmowa oceniająca', due: d.dueDate };
    case 'ocena':
      return { label: 'Oceny cząstkowe', due: d.dueDate };
    default:
      return c.conclusion.sheetGeneratedAt && !c.conclusion.employeeAcknowledgedAt
        ? { label: 'Zapoznanie ocenianego z oceną', due: c.conclusion.draftedAt ?? d.dueDate }
        : { label: 'Sporządzenie oceny na piśmie', due: d.dueDate };
  }
}

export function attentionReasons(c: StoredCase, action: NextAction, today: IsoDate): AttentionReason[] {
  if (c.status === 'zakonczona') {
    return [];
  }
  const reasons: AttentionReason[] = [];
  if (action.due) {
    const days = diffInDays(action.due, today);
    if (days < 0) reasons.push('po-terminie');
    else if (days === 0) reasons.push('termin-dzis');
    else if (days <= 14) reasons.push('termin-bliski');
  }
  if (c.conclusion.sheetGeneratedAt && !c.conclusion.employeeAcknowledgedAt) {
    reasons.push('brak-zapoznania');
  }
  if (c.deadlines.extensions.some((extension) => !extension.employeeNotifiedAt)) {
    reasons.push('zawiadomienie');
  }
  return reasons;
}

export function summarizeCase(c: StoredCase, today: IsoDate): CaseSummary {
  const steps = stepsFor(c.path);
  const stepId = currentStepId(c);
  const index = steps.findIndex((step) => step.id === stepId);
  const action = nextAction(c, stepId);
  const result = caseResult(c);
  const periodic = result.path === 'periodic' ? result.periodic : null;
  const first = result.path === 'first' ? result.first : null;
  const outcome = periodic?.outcome ?? first?.outcome ?? undefined;
  const mean = periodic?.mean ?? first?.mean ?? undefined;

  return {
    id: c.id,
    path: c.path,
    status: c.status,
    ...(c.positionReview.confirmedVariant ? { formVariant: c.positionReview.confirmedVariant } : {}),
    employee: {
      id: c.employee.id,
      fullName: c.employee.fullName,
      positionTitle: c.position.title,
      positionCode: c.position.code,
      orgUnitCode: c.position.code.split(' ').slice(0, -1).join(' '),
      orgUnitName: c.position.division,
      departmentName: c.position.department,
    },
    evaluator: c.evaluator,
    currentStepId: stepId,
    currentStepLabel: stepDefinition(c.path, stepId)?.label ?? stepId,
    stepIndex: c.status === 'zakonczona' ? steps.length : index + 1,
    stepCount: steps.length,
    dueDate: c.deadlines.dueDate,
    baseDueDate: c.deadlines.baseDueDate,
    extensions: c.deadlines.extensions.map(({ days, from, to, legalBasis }) => ({ days, from, to, legalBasis })),
    nextActionLabel: action.label,
    ...(action.due ? { nextActionDue: action.due } : {}),
    attention: attentionReasons(c, action, today),
    observationsCount: c.observations.length,
    ...(outcome && (c.status === 'zakonczona' || c.conclusion.sheetGeneratedAt) ? { outcome } : {}),
    ...(mean !== undefined && mean !== null && c.status === 'zakonczona' ? { mean } : {}),
    ...(periodic?.level && c.status === 'zakonczona' ? { levelLabel: periodic.level.label } : {}),
    ...(c.conclusion.employeeAcknowledgedAt && c.status === 'zakonczona' ? { completedAt: c.conclusion.employeeAcknowledgedAt } : {}),
    updatedAt: c.updatedAt,
  };
}
