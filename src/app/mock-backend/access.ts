import type { AssessmentCase, CaseAccess, CaseConclusion, PositionReview } from '@core/domain/assessment.model';
import { historySummaryForHr } from '@core/domain/hr-view';
import type { AppUser } from '@core/domain/people.model';
import type { StoredCase } from './engine/case-factory';
import { forbidden } from './http';

export function caseAccess(c: StoredCase, user: AppUser): CaseAccess | null {
  if (c.evaluator.id === user.id) {
    return { role: 'oceniajacy', canEdit: c.status === 'w-toku', redacted: false };
  }
  if (c.headOfUnit?.id === user.id) {
    return { role: 'kierujacy', canEdit: false, redacted: false };
  }
  if (user.roles.includes('hr')) {
    return { role: 'kadry', canEdit: false, redacted: true };
  }
  return null;
}

export function canSeeCase(c: StoredCase, user: AppUser): boolean {
  return caseAccess(c, user) !== null;
}

function withoutOverrideReason(review: PositionReview): PositionReview {
  const { overrideReason: _reason, ...rest } = review;
  return rest;
}

/** Narracja końcowego arkusza zostaje pusta, dopóki oceniany się z nim nie zapozna. */
function withoutSheetNarrative(conclusion: CaseConclusion): CaseConclusion {
  const { justificationAiDraft: _draft, promotionRequest: _request, ...rest } = conclusion;
  return { ...rest, justification: '', developmentPlan: '', promotionJustification: '' };
}

/**
 * Widok sprawy dla konkretnej osoby.
 * Kadry prowadzą proces. Obserwacje i notatki zostają u oceniającego.
 * Oczekiwania i cele widać po podpisie części I, uzasadnienie i wnioski — po zapoznaniu z oceną.
 */
export function presentCase(c: StoredCase, user: AppUser): AssessmentCase {
  const access = caseAccess(c, user);
  if (!access) {
    throw forbidden('Ta ocena jest dostępna tylko dla oceniającego, kierującego komórką i kadr.');
  }
  if (!access.redacted) {
    return { ...c, access };
  }
  const partOneInFile = Boolean(c.preliminary.employeeAcknowledgedAt);
  const sheetInFile = Boolean(c.conclusion.employeeAcknowledgedAt);
  return {
    ...c,
    access,
    observations: [],
    preliminary: {
      ...c.preliminary,
      notes: '',
      expectations: partOneInFile ? c.preliminary.expectations : [],
      goals: partOneInFile ? c.preliminary.goals : [],
    },
    review: { ...c.review, notes: '', employeePerspective: '', developmentNeeds: '' },
    positionReview: withoutOverrideReason(c.positionReview),
    ratings: c.ratings.map((rating) => ({
      ...rating,
      indicators: [],
      decision: rating.decision ? { ...rating.decision, rationale: '' } : null,
    })),
    conclusion: sheetInFile ? c.conclusion : withoutSheetNarrative(c.conclusion),
    history: c.history.map((event) => ({ ...event, summary: historySummaryForHr(event) })),
  };
}

export function requireEditor(c: StoredCase, user: AppUser): void {
  const access = caseAccess(c, user);
  if (!access) {
    throw forbidden();
  }
  if (!access.canEdit) {
    throw forbidden(
      c.status === 'zakonczona'
        ? 'Ocena jest zakończona — dane są tylko do odczytu.'
        : 'Zmiany w ocenie wprowadza oceniający. Masz dostęp tylko do odczytu.',
    );
  }
}

export function requireHr(user: AppUser): void {
  if (!user.roles.includes('hr')) {
    throw forbidden('Ta funkcja jest dostępna dla kadr.');
  }
}
