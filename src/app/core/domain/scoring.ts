import type { AssessmentPath, IndicatorAssessment } from './assessment.model';
import type { BehaviorLevel } from './competency.model';
import { overallLevelFor, type ScorePoints } from './scales';

/**
 * REGUŁA NARZĘDZIA (nie przepis). Model kompetencji nie określa sposobu agregacji wskaźników
 * (`scoring.aggregation_rule: null`) ani mapowania na skalę pierwszej oceny. Dlatego reguła jest
 * jawna, wersjonowana i konfigurowalna, a jej wynik to wyłącznie sugestia — decyduje przełożony.
 */
export interface ScoringRules {
  readonly version: string;
  readonly status: string;
  readonly periodicLevelPoints: Readonly<Record<BehaviorLevel, ScorePoints>>;
  readonly firstLevelPoints: Readonly<Record<BehaviorLevel, ScorePoints>>;
}

export const DEFAULT_SCORING_RULES: ScoringRules = {
  version: 'kompas-2026.1',
  status: 'Reguła narzędzia do uzgodnienia z mentorem — nie wynika z przepisów',
  periodicLevelPoints: { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9 },
  firstLevelPoints: { 1: 3, 2: 3, 3: 5, 4: 7, 5: 7 },
};

export interface IndicatorContribution {
  readonly indicatorId: string;
  readonly level: BehaviorLevel;
  readonly points: ScorePoints;
}

export interface CriterionSuggestion {
  readonly total: number;
  readonly assessedCount: number;
  readonly noBasisCount: number;
  readonly pendingCount: number;
  readonly contributions: readonly IndicatorContribution[];
  /** Średnia punktów wskaźników ocenionych — bez wskaźników „brak podstaw”. */
  readonly average: number | null;
  readonly points: ScorePoints | null;
  /** Brak ocenionych wskaźników: narzędzie nie sugeruje oceny i niczego nie obniża. */
  readonly insufficientEvidence: boolean;
}

export function levelToPoints(
  path: AssessmentPath,
  level: BehaviorLevel,
  rules: ScoringRules = DEFAULT_SCORING_RULES,
): ScorePoints {
  return path === 'first' ? rules.firstLevelPoints[level] : rules.periodicLevelPoints[level];
}

/** Średnia → punkt skali. Ocena okresowa: progi z § 11 ust. 1 pkt 2; pierwsza ocena: 3/5/7. */
export function averageToPoints(path: AssessmentPath, sum: number, count: number): ScorePoints {
  if (path === 'first') {
    if (sum <= 4 * count) return 3;
    if (sum <= 6 * count) return 5;
    return 7;
  }
  const pointsByLevel: Record<string, ScorePoints> = {
    'znacznie-ponizej': 1,
    ponizej: 3,
    'na-poziomie': 5,
    powyzej: 7,
    'znacznie-powyzej': 9,
  };
  return pointsByLevel[overallLevelFor(sum, count).id] ?? 5;
}

export function suggestCriterionScore(
  path: AssessmentPath,
  indicators: readonly IndicatorAssessment[],
  totalIndicators: number = indicators.length,
  rules: ScoringRules = DEFAULT_SCORING_RULES,
): CriterionSuggestion {
  const contributions: IndicatorContribution[] = [];
  let noBasisCount = 0;

  for (const indicator of indicators) {
    if (indicator.noBasis) {
      noBasisCount++;
    } else if (indicator.level !== null) {
      contributions.push({
        indicatorId: indicator.indicatorId,
        level: indicator.level,
        points: levelToPoints(path, indicator.level, rules),
      });
    }
  }

  const assessedCount = contributions.length;
  const pendingCount = Math.max(totalIndicators - assessedCount - noBasisCount, 0);

  if (assessedCount === 0) {
    return {
      total: totalIndicators,
      assessedCount,
      noBasisCount,
      pendingCount,
      contributions,
      average: null,
      points: null,
      insufficientEvidence: true,
    };
  }

  const sum = contributions.reduce((acc, item) => acc + item.points, 0);
  return {
    total: totalIndicators,
    assessedCount,
    noBasisCount,
    pendingCount,
    contributions,
    average: sum / assessedCount,
    points: averageToPoints(path, sum, assessedCount),
    insufficientEvidence: false,
  };
}
