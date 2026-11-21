import type { AssessmentOutcome, ExamOutcome } from './assessment.model';
import { overallLevelFor, type OverallLevel, type ScorePoints } from './scales';

export interface PartialScore {
  readonly criterionId: string;
  readonly points: ScorePoints | null;
}

export interface PeriodicResult {
  readonly complete: boolean;
  readonly missing: readonly string[];
  readonly count: number;
  readonly sum: number;
  readonly mean: number | null;
  readonly level: OverallLevel | null;
  readonly outcome: AssessmentOutcome | null;
  /** Kryteria z oceną 1 pkt — każda z nich oznacza ocenę negatywną (§ 11 ust. 1 pkt 4). */
  readonly vetoCriteria: readonly string[];
  /** Średnia leży dokładnie na granicy przedziału (np. 6,00 → „na poziomie”). */
  readonly onBoundary: boolean;
  readonly explanation: readonly string[];
}

/** § 11 ust. 1 rozporządzenia z 2016 r. — wynik oceny okresowej. */
export function computePeriodicResult(scores: readonly PartialScore[]): PeriodicResult {
  const missing = scores.filter((score) => score.points === null).map((s) => s.criterionId);
  const rated = scores.filter((score): score is PartialScore & { points: ScorePoints } => score.points !== null);
  const sum = rated.reduce((acc, score) => acc + score.points, 0);
  const count = rated.length;
  const complete = count > 0 && missing.length === 0;
  const vetoCriteria = rated.filter((score) => score.points === 1).map((s) => s.criterionId);

  if (!complete) {
    return {
      complete,
      missing,
      count,
      sum,
      mean: count > 0 ? sum / count : null,
      level: null,
      outcome: null,
      vetoCriteria,
      onBoundary: false,
      explanation: [],
    };
  }

  const level = overallLevelFor(sum, count);
  const mean = sum / count;
  const onBoundary = [2, 4, 6, 8].some((edge) => sum === edge * count);
  const outcome: AssessmentOutcome =
    level.positiveEligible && vetoCriteria.length === 0 ? 'pozytywna' : 'negatywna';

  const explanation: string[] = [
    `Średnia arytmetyczna ${count} ocen cząstkowych: ${sum} / ${count} = ${formatScore(mean)}.`,
    `Przedział ${level.range} oznacza poziom „${level.label.toLowerCase()}” (§ 11 ust. 1 pkt 2).`,
  ];
  if (onBoundary) {
    explanation.push(
      `Wartość ${formatScore(mean)} jest górną granicą przedziału „${level.label.toLowerCase()}” — kolejny przedział zaczyna się powyżej tej wartości.`,
    );
  }
  if (vetoCriteria.length > 0) {
    explanation.push(
      'Co najmniej jedna ocena cząstkowa wynosi 1 pkt, dlatego ocena jest negatywna niezależnie od średniej (§ 11 ust. 1 pkt 4).',
    );
  } else if (!level.positiveEligible) {
    explanation.push('Poziom niższy niż „na poziomie oczekiwań” oznacza ocenę negatywną (§ 11 ust. 1 pkt 4).');
  } else {
    explanation.push(
      'Poziom co najmniej „na poziomie oczekiwań” i brak oceny 1 pkt oznaczają ocenę pozytywną (§ 11 ust. 1 pkt 3).',
    );
  }

  return { complete, missing, count, sum, mean, level, outcome, vetoCriteria, onBoundary, explanation };
}

export interface FirstConditionCheck {
  readonly id: 'egzamin' | 'sprawozdanie' | 'oceny-3' | 'srednia';
  readonly label: string;
  readonly met: boolean | null;
  readonly detail: string;
  readonly legalRef: string;
}

export interface FirstResultInput {
  readonly scores: readonly PartialScore[];
  readonly exam: ExamOutcome | null | undefined;
  readonly reportOnTime: boolean | null;
}

export interface FirstResult {
  readonly complete: boolean;
  readonly missing: readonly string[];
  readonly count: number;
  readonly sum: number;
  readonly mean: number | null;
  readonly belowCount: number;
  readonly conditions: readonly FirstConditionCheck[];
  readonly outcome: AssessmentOutcome | null;
}

/** § 9–10 rozporządzenia z 2015 r. — wynik pierwszej oceny. */
export function computeFirstResult(input: FirstResultInput): FirstResult {
  const missing = input.scores.filter((s) => s.points === null).map((s) => s.criterionId);
  const rated = input.scores.filter((s): s is PartialScore & { points: ScorePoints } => s.points !== null);
  const sum = rated.reduce((acc, s) => acc + s.points, 0);
  const count = rated.length;
  const scoresComplete = count > 0 && missing.length === 0;
  const belowCount = rated.filter((s) => s.points === 3).length;
  const mean = count > 0 ? sum / count : null;

  const examMet = input.exam ? input.exam !== 'niezaliczony' : null;
  const conditions: FirstConditionCheck[] = [
    {
      id: 'egzamin',
      label: 'Egzamin kończący służbę przygotowawczą zaliczony albo nie dotyczy',
      met: examMet,
      detail:
        input.exam === 'zaliczony'
          ? 'Egzamin zaliczony.'
          : input.exam === 'nie-dotyczy'
            ? 'Obowiązek nie dotyczy pracownika (§ 10 ust. 3).'
            : input.exam === 'niezaliczony'
              ? 'Egzamin niezaliczony — ocena musi być negatywna.'
              : 'Brak informacji o egzaminie.',
      legalRef: '§ 10 ust. 1 pkt 1',
    },
    {
      id: 'sprawozdanie',
      label: 'Sprawozdanie złożone w wyznaczonym terminie',
      met: input.reportOnTime,
      detail:
        input.reportOnTime === null
          ? 'Brak informacji o sprawozdaniu.'
          : input.reportOnTime
            ? 'Sprawozdanie złożono w terminie.'
            : 'Sprawozdanie niezłożone albo złożone po terminie.',
      legalRef: '§ 10 ust. 1 pkt 2',
    },
    {
      id: 'oceny-3',
      label: 'Nie więcej niż jedna ocena cząstkowa w wysokości 3 pkt',
      met: scoresComplete ? belowCount <= 1 : null,
      detail: scoresComplete
        ? `Liczba ocen 3 pkt: ${belowCount}.`
        : 'Uzupełnij oceny wszystkich elementów.',
      legalRef: '§ 10 ust. 1 pkt 3',
    },
    {
      id: 'srednia',
      label: 'Ocena łączna (średnia ocen cząstkowych) nie niższa niż 5 pkt',
      met: scoresComplete ? sum >= 5 * count : null,
      detail: scoresComplete && mean !== null ? `Średnia: ${formatScore(mean)}.` : 'Uzupełnij oceny wszystkich elementów.',
      legalRef: '§ 10 ust. 1 pkt 4',
    },
  ];

  const anyFailed = conditions.some((condition) => condition.met === false);
  const allKnown = conditions.every((condition) => condition.met !== null);
  const outcome: AssessmentOutcome | null = anyFailed ? 'negatywna' : allKnown ? 'pozytywna' : null;

  return {
    complete: scoresComplete && allKnown,
    missing,
    count,
    sum,
    mean,
    belowCount,
    conditions,
    outcome,
  };
}

/** Format liczby z przecinkiem dziesiętnym, np. 6.25 → „6,25”. */
export function formatScore(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits).replace('.', ',');
}
