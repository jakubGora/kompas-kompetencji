/**
 * Daty kalendarzowe bez strefy czasowej (`YYYY-MM-DD`).
 * Terminy liczymy według zasad prawa cywilnego (art. 111–112 KC), jak zaleca poradnik KPRM.
 */
export type IsoDate = string;
/** Znacznik czasu ISO 8601, np. `2026-11-21T19:58:00.000Z`. */
export type IsoDateTime = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const MS_PER_DAY = 86_400_000;

interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function parts(value: IsoDate | IsoDateTime): DateParts {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Nieprawidłowa data ISO: "${value}"`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function fromParts(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const { year, month, day } = parts(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** Część „data” ze znacznika czasu lub daty. */
export function toIsoDate(value: IsoDate | IsoDateTime): IsoDate {
  const { year, month, day } = parts(value);
  return fromParts(year, month, day);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toEpochDay(value: IsoDate): number {
  const { year, month, day } = parts(value);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function fromEpochDay(epochDay: number): IsoDate {
  const date = new Date(epochDay * MS_PER_DAY);
  return fromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDays(value: IsoDate, days: number): IsoDate {
  return fromEpochDay(toEpochDay(value) + days);
}

/**
 * Dodaje miesiące zgodnie z art. 112 KC: termin kończy się w dniu odpowiadającym datą dniowi
 * początkowemu, a gdyby takiego dnia nie było — w ostatnim dniu miesiąca.
 */
export function addMonths(value: IsoDate, months: number): IsoDate {
  const { year, month, day } = parts(value);
  const monthIndex = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = (monthIndex % 12) + 1;
  return fromParts(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** Liczba dni od `from` do `to` (ujemna, gdy `to` jest wcześniej). */
export function diffInDays(to: IsoDate, from: IsoDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

/** Liczba dni kalendarzowych w przedziale obustronnie domkniętym. */
export function daysInclusive(from: IsoDate, to: IsoDate): number {
  return diffInDays(to, from) + 1;
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return toEpochDay(a) - toEpochDay(b);
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return compareDates(a, b) < 0;
}

export function isAfter(a: IsoDate, b: IsoDate): boolean {
  return compareDates(a, b) > 0;
}

export function isWithin(value: IsoDate, from: IsoDate, to: IsoDate): boolean {
  return compareDates(value, from) >= 0 && compareDates(value, to) <= 0;
}

/** `21.11.2026` */
export function formatDatePl(value: IsoDate | IsoDateTime | null | undefined): string {
  if (!value) {
    return '—';
  }
  const { year, month, day } = parts(value);
  return `${pad(day)}.${pad(month)}.${year}`;
}

const MONTHS_GENITIVE = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
] as const;

/** `21 listopada 2026` */
export function formatDateLongPl(value: IsoDate | IsoDateTime | null | undefined): string {
  if (!value) {
    return '—';
  }
  const { year, month, day } = parts(value);
  return `${day} ${MONTHS_GENITIVE[month - 1]} ${year}`;
}

/** Opis odległości terminu względem „dziś”, np. „za 6 dni”, „dziś”, „3 dni po terminie”. */
export function describeDueIn(due: IsoDate, today: IsoDate): string {
  const days = diffInDays(due, today);
  if (days === 0) {
    return 'dziś';
  }
  if (days === 1) {
    return 'jutro';
  }
  if (days > 1) {
    return `za ${days} ${pluralPl(days, ['dzień', 'dni', 'dni'])}`;
  }
  const overdue = Math.abs(days);
  return `${overdue} ${pluralPl(overdue, ['dzień', 'dni', 'dni'])} po terminie`;
}

/** Polska odmiana liczebników: [1, 2–4, 5+], np. ['obserwacja', 'obserwacje', 'obserwacji']. */
export function pluralPl(count: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(count);
  if (abs === 1) {
    return forms[0];
  }
  const lastDigit = abs % 10;
  const lastTwo = abs % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return forms[1];
  }
  return forms[2];
}
