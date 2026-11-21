import { Pipe, type PipeTransform } from '@angular/core';
import { formatDateLongPl, formatDatePl, pluralPl } from '@core/domain/date';
import { formatScore } from '@core/domain/result';

export type DateFormat = 'short' | 'long' | 'datetime' | 'time';

/**
 * Daty z API to czas „ścienny” (bez przeliczania stref) — formatujemy je wprost z tekstu ISO,
 * żeby 21.11.2026 zawsze pozostało 21.11.2026.
 */
export function formatDateValue(value: string | null | undefined, format: DateFormat = 'short'): string {
  if (!value) return '—';
  const date = value.slice(0, 10);
  switch (format) {
    case 'long':
      return formatDateLongPl(date);
    case 'time':
      return value.slice(11, 16);
    case 'datetime':
      return value.length > 10 ? `${formatDatePl(date)}, ${value.slice(11, 16)}` : formatDatePl(date);
    default:
      return formatDatePl(date);
  }
}

@Pipe({ name: 'kpDate' })
export class KpDatePipe implements PipeTransform {
  transform(value: string | null | undefined, format: DateFormat = 'short'): string {
    return formatDateValue(value, format);
  }
}

/** `{{ 3 | kpPlural: ['ocena', 'oceny', 'ocen'] }}` → „3 oceny”. */
@Pipe({ name: 'kpPlural' })
export class KpPluralPipe implements PipeTransform {
  transform(count: number, forms: readonly [string, string, string], withCount = true): string {
    const word = pluralPl(count, forms);
    return withCount ? `${count} ${word}` : word;
  }
}

@Pipe({ name: 'kpScore' })
export class KpScorePipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 2): string {
    return value === null || value === undefined ? '—' : formatScore(value, digits);
  }
}
