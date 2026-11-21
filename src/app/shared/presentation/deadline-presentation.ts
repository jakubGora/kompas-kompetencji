import type { CaseDeadlines } from '@core/domain/assessment.model';
import { pluralPl, type IsoDate } from '@core/domain/date';

/** Okres z dokładnością do miesiąca („04–05.2025”) — bez dat dziennych i przyczyny nieobecności. */
export function monthRangePl(from: IsoDate, to: IsoDate): string {
  const [fromYear, fromMonth] = from.split('-');
  const [toYear, toMonth] = to.split('-');
  if (fromYear !== toYear) return `${fromMonth}.${fromYear}–${toMonth}.${toYear}`;
  return fromMonth === toMonth ? `${fromMonth}.${fromYear}` : `${fromMonth}–${toMonth}.${fromYear}`;
}

/** „6 tygodni” dla pełnych tygodni, w pozostałych przypadkach „17 dni”. */
export function durationPl(days: number): string {
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} ${pluralPl(weeks, ['tydzień', 'tygodnie', 'tygodni'])}`;
  }
  return `${days} ${pluralPl(days, ['dzień', 'dni', 'dni'])}`;
}

export interface DeadlineShift {
  readonly days: number;
  readonly baseDueDate: IsoDate;
  readonly dueDate: IsoDate;
  /** Po jednej pozycji na nieobecność: „04–05.2025, 6 tygodni”. */
  readonly absences: readonly string[];
  readonly legalBasis: string;
}

/** Przesunięcie terminu oceny o usprawiedliwione nieobecności (art. 81 ust. 7 ustawy o służbie cywilnej). */
export function deadlineShift(deadlines: CaseDeadlines): DeadlineShift | null {
  const [first] = deadlines.extensions;
  if (!first) return null;
  return {
    days: deadlines.extensions.reduce((sum, extension) => sum + extension.days, 0),
    baseDueDate: deadlines.baseDueDate,
    dueDate: deadlines.dueDate,
    absences: deadlines.extensions.map((extension) => `${monthRangePl(extension.from, extension.to)}, ${durationPl(extension.days)}`),
    legalBasis: first.legalBasis,
  };
}
