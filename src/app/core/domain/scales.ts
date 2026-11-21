import type { AssessmentPath } from './assessment.model';

/** Oceny cząstkowe w ocenie okresowej (§ 11 ust. 1 pkt 1 rozporządzenia z 2016 r.). */
export type PeriodicPoints = 1 | 3 | 5 | 7 | 9;
/** Oceny elementów w pierwszej ocenie (§ 9 ust. 1 rozporządzenia z 2015 r.). */
export type FirstPoints = 3 | 5 | 7;
export type ScorePoints = PeriodicPoints;

export interface ScaleOption {
  readonly points: ScorePoints;
  readonly label: string;
}

export const PERIODIC_SCALE: readonly ScaleOption[] = [
  { points: 1, label: 'Znacznie poniżej oczekiwań' },
  { points: 3, label: 'Poniżej oczekiwań' },
  { points: 5, label: 'Na poziomie oczekiwań' },
  { points: 7, label: 'Powyżej oczekiwań' },
  { points: 9, label: 'Znacznie powyżej oczekiwań' },
];

export const FIRST_SCALE: readonly ScaleOption[] = [
  { points: 3, label: 'Poniżej oczekiwań' },
  { points: 5, label: 'Na poziomie oczekiwań' },
  { points: 7, label: 'Powyżej oczekiwań' },
];

export function scaleFor(path: AssessmentPath): readonly ScaleOption[] {
  return path === 'first' ? FIRST_SCALE : PERIODIC_SCALE;
}

export function pointsLabel(points: number | null | undefined): string {
  return PERIODIC_SCALE.find((option) => option.points === points)?.label ?? '—';
}

export function isValidPoints(path: AssessmentPath, points: number): points is ScorePoints {
  return scaleFor(path).some((option) => option.points === points);
}

/** Ogólny poziom spełniania kryteriów (§ 11 ust. 1 pkt 2 rozporządzenia z 2016 r.). */
export type OverallLevelId =
  | 'znacznie-ponizej'
  | 'ponizej'
  | 'na-poziomie'
  | 'powyzej'
  | 'znacznie-powyzej';

export interface OverallLevel {
  readonly id: OverallLevelId;
  readonly label: string;
  /** Opis przedziału średniej, jak w rozporządzeniu. */
  readonly range: string;
  readonly positiveEligible: boolean;
}

export const OVERALL_LEVELS: readonly OverallLevel[] = [
  { id: 'znacznie-ponizej', label: 'Znacznie poniżej oczekiwań', range: '1–2', positiveEligible: false },
  { id: 'ponizej', label: 'Poniżej oczekiwań', range: 'powyżej 2–4', positiveEligible: false },
  { id: 'na-poziomie', label: 'Na poziomie oczekiwań', range: 'powyżej 4–6', positiveEligible: true },
  { id: 'powyzej', label: 'Powyżej oczekiwań', range: 'powyżej 6–8', positiveEligible: true },
  { id: 'znacznie-powyzej', label: 'Znacznie powyżej oczekiwań', range: 'powyżej 8–9', positiveEligible: true },
];

export function overallLevel(id: OverallLevelId): OverallLevel {
  const level = OVERALL_LEVELS.find((candidate) => candidate.id === id);
  if (!level) {
    throw new RangeError(`Nieznany poziom: ${id}`);
  }
  return level;
}

/**
 * Poziom na podstawie sumy i liczby ocen. Porównujemy sumy zamiast średnich,
 * żeby granice (np. dokładnie 6,00) nie zależały od zaokrągleń zmiennoprzecinkowych.
 */
export function overallLevelFor(sum: number, count: number): OverallLevel {
  if (count <= 0) {
    throw new RangeError('Brak ocen do wyznaczenia poziomu.');
  }
  if (sum <= 2 * count) return overallLevel('znacznie-ponizej');
  if (sum <= 4 * count) return overallLevel('ponizej');
  if (sum <= 6 * count) return overallLevel('na-poziomie');
  if (sum <= 8 * count) return overallLevel('powyzej');
  return overallLevel('znacznie-powyzej');
}
