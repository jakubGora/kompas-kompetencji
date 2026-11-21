import type { AssessmentOutcome } from './assessment.model';
import { addDays, addMonths, daysInclusive, isAfter, type IsoDate } from './date';
import type { Absence } from './people.model';

/**
 * Terminy wynikające z ustawy o służbie cywilnej, rozporządzeń i poradników KPRM.
 * Daty liczymy zgodnie z art. 111–112 KC (poradnik KPRM, rozdz. 4).
 */

export const PERIODIC_INTERVAL_MONTHS = 24;
export const PRELIMINARY_MEETING_DAYS = 30;
export const PRELIMINARY_AFTER_NEGATIVE_DAYS = 7;
export const REASSESSMENT_AFTER_NEGATIVE_MONTHS = 6;
export const OBJECTION_DAYS = 7;
export const FIRST_PRELIMINARY_DAYS = 21;
export const FIRST_REPORT_AFTER_MONTHS = 8;
export const FIRST_REPORT_MIN_COVERAGE_MONTHS = 7;

export interface QualifyingAbsence extends Absence {
  readonly days: number;
}

/**
 * Art. 81 ust. 7 ustawy: usprawiedliwiona nieobecność trwająca dłużej niż miesiąc przedłuża termin
 * o czas tej nieobecności. Przykład z poradnika: 9.09–19.10.2014 → przedłużenie o 41 dni.
 */
export function qualifyingAbsences(absences: readonly Absence[]): QualifyingAbsence[] {
  return absences
    .filter((absence) => isAfter(absence.to, addMonths(absence.from, 1)))
    .map((absence) => ({ ...absence, days: daysInclusive(absence.from, absence.to) }));
}

export interface PeriodicDueDate {
  readonly baseDueDate: IsoDate;
  readonly dueDate: IsoDate;
  readonly extensionDays: number;
  readonly extensions: readonly QualifyingAbsence[];
}

/** 24 miesiące od sporządzenia poprzedniej oceny albo od zatrudnienia na czas nieokreślony. */
export function periodicDueDate(startDate: IsoDate, absences: readonly Absence[] = []): PeriodicDueDate {
  const baseDueDate = addMonths(startDate, PERIODIC_INTERVAL_MONTHS);
  const extensions = qualifyingAbsences(absences).filter(
    (absence) => !isAfter(absence.from, baseDueDate) && isAfter(absence.to, startDate),
  );
  const extensionDays = extensions.reduce((acc, absence) => acc + absence.days, 0);
  return { baseDueDate, dueDate: addDays(baseDueDate, extensionDays), extensionDays, extensions };
}

/** § 7: zapoznanie z kryteriami w ciągu 30 dni (7 dni po ocenie negatywnej, art. 81 ust. 9). */
export function preliminaryMeetingDueDate(
  startDate: IsoDate,
  previousOutcome?: AssessmentOutcome,
): IsoDate {
  return addDays(
    startDate,
    previousOutcome === 'negatywna' ? PRELIMINARY_AFTER_NEGATIVE_DAYS : PRELIMINARY_MEETING_DAYS,
  );
}

/** Kolejna ocena: 24 miesiące od sporządzenia, a po negatywnej — 6 miesięcy od zapoznania. */
export function nextAssessmentDueDate(
  outcome: AssessmentOutcome,
  draftedAt: IsoDate,
  acknowledgedAt: IsoDate,
): IsoDate {
  return outcome === 'negatywna'
    ? addMonths(acknowledgedAt, REASSESSMENT_AFTER_NEGATIVE_MONTHS)
    : addMonths(draftedAt, PERIODIC_INTERVAL_MONTHS);
}

/** Art. 83 ust. 1 ustawy: sprzeciw do dyrektora generalnego w ciągu 7 dni od zapoznania. */
export function objectionDeadline(acknowledgedAt: IsoDate): IsoDate {
  return addDays(acknowledgedAt, OBJECTION_DAYS);
}

export interface FirstAssessmentWindows {
  readonly preliminaryDueDate: IsoDate;
  /** Sprawozdanie i ocena mogą nastąpić najwcześniej po 8 miesiącach (§ 4 ust. 1). */
  readonly earliestReportDate: IsoDate;
  /** Ocena najpóźniej miesiąc przed końcem umowy (art. 38 ust. 1 ustawy). */
  readonly assessmentDeadline: IsoDate;
}

export function firstAssessmentWindows(employedSince: IsoDate, contractEnd: IsoDate): FirstAssessmentWindows {
  return {
    preliminaryDueDate: addDays(employedSince, FIRST_PRELIMINARY_DAYS),
    earliestReportDate: addMonths(employedSince, FIRST_REPORT_AFTER_MONTHS),
    assessmentDeadline: addMonths(contractEnd, -1),
  };
}
