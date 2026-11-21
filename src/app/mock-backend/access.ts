import type { AssessmentCase, CaseAccess } from '@core/domain/assessment.model';
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

/**
 * Widok sprawy dla konkretnej osoby. Kadry widzą przebieg i terminy,
 * ale nie treść obserwacji, zaznaczeń zachowań ani notatek z rozmów.
 */
export function presentCase(c: StoredCase, user: AppUser): AssessmentCase {
  const access = caseAccess(c, user);
  if (!access) {
    throw forbidden('Ta ocena jest dostępna tylko dla oceniającego, kierującego komórką i kadr.');
  }
  if (!access.redacted) {
    return { ...c, access };
  }
  return {
    ...c,
    access,
    observations: [],
    preliminary: { ...c.preliminary, notes: '' },
    review: { ...c.review, notes: '', employeePerspective: '', developmentNeeds: '' },
    ratings: c.ratings.map((rating) => ({
      ...rating,
      indicators: [],
      decision: rating.decision ? { ...rating.decision, rationale: '' } : null,
    })),
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
