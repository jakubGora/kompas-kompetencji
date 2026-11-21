import {
  addDays,
  addMonths,
  daysInclusive,
  describeDueIn,
  diffInDays,
  formatDateLongPl,
  formatDatePl,
  isIsoDate,
  pluralPl,
} from './date';

describe('date', () => {
  it('dodaje miesiące zgodnie z art. 112 KC (ostatni dzień miesiąca)', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2013-12-04', 24)).toBe('2015-12-04');
    expect(addMonths('2027-03-01', -1)).toBe('2027-02-01');
  });

  it('liczy dni i przedziały domknięte', () => {
    expect(addDays('2026-10-10', 42)).toBe('2026-11-21');
    expect(diffInDays('2026-11-27', '2026-11-21')).toBe(6);
    expect(daysInclusive('2014-09-09', '2014-10-19')).toBe(41);
  });

  it('formatuje daty po polsku', () => {
    expect(formatDatePl('2026-11-21')).toBe('21.11.2026');
    expect(formatDatePl('2026-11-21T19:58:00.000Z')).toBe('21.11.2026');
    expect(formatDateLongPl('2026-11-21')).toBe('21 listopada 2026');
    expect(formatDatePl(undefined)).toBe('—');
  });

  it('waliduje daty ISO', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('21.11.2026')).toBe(false);
  });

  it('odmienia liczebniki', () => {
    const forms = ['obserwacja', 'obserwacje', 'obserwacji'] as const;
    expect(pluralPl(1, forms)).toBe('obserwacja');
    expect(pluralPl(3, forms)).toBe('obserwacje');
    expect(pluralPl(5, forms)).toBe('obserwacji');
    expect(pluralPl(12, forms)).toBe('obserwacji');
    expect(pluralPl(22, forms)).toBe('obserwacje');
  });

  it('opisuje odległość terminu', () => {
    expect(describeDueIn('2026-11-21', '2026-11-21')).toBe('dziś');
    expect(describeDueIn('2026-11-22', '2026-11-21')).toBe('jutro');
    expect(describeDueIn('2026-11-27', '2026-11-21')).toBe('za 6 dni');
    expect(describeDueIn('2026-11-20', '2026-11-21')).toBe('1 dzień po terminie');
  });
});
