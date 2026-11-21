import type { AssessmentCase, AssessmentCasePatch } from '@core/domain/assessment.model';

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** Łączy kolejne zmiany sekcji w jeden PATCH (późniejsze pola nadpisują wcześniejsze). */
export function mergePatch(base: AssessmentCasePatch, next: AssessmentCasePatch): AssessmentCasePatch {
  const merged: Mutable<AssessmentCasePatch> = { ...base };
  for (const key of Object.keys(next) as (keyof AssessmentCasePatch)[]) {
    merged[key] = { ...(base[key] ?? {}), ...(next[key] ?? {}) } as never;
  }
  return merged;
}

export function isEmptyPatch(patch: AssessmentCasePatch): boolean {
  return Object.keys(patch).length === 0;
}

/** Zmiana optymistyczna — ekran reaguje od razu, zapis idzie w tle. */
export function applyPatch(c: AssessmentCase, patch: AssessmentCasePatch): AssessmentCase {
  return {
    ...c,
    ...(patch.positionReview ? { positionReview: { ...c.positionReview, ...patch.positionReview } } : {}),
    ...(patch.criteria ? { criteria: { ...c.criteria, ...patch.criteria } } : {}),
    ...(patch.preliminary ? { preliminary: { ...c.preliminary, ...patch.preliminary } } : {}),
    ...(patch.preparatoryService ? { preparatoryService: { ...c.preparatoryService, ...patch.preparatoryService } } : {}),
    ...(patch.report ? { report: { ...c.report, ...patch.report } } : {}),
    ...(patch.review ? { review: { ...c.review, ...patch.review } } : {}),
    ...(patch.conclusion ? { conclusion: { ...c.conclusion, ...patch.conclusion } } : {}),
  };
}
