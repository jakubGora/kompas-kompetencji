import type { CriterionRating } from '@core/domain/assessment.model';
import type { CriterionId } from '@core/domain/criteria';
import type { ScorePoints } from '@core/domain/scales';
import { historyEvent, type StoredCase } from '../engine/case-factory';

export interface DemoScenario {
  readonly id: 'demo' | 'weto' | 'granica';
  readonly label: string;
  readonly description: string;
  /** Adres, na który przechodzi aplikacja po wczytaniu scenariusza. */
  readonly landing: string;
}

export const SCENARIOS: readonly DemoScenario[] = [
  {
    id: 'demo',
    label: 'Scenariusz A — pełna ścieżka',
    description: 'Anna Nowak, etap ocen: 7 z 8 decyzji. Po decyzji 7 pkt średnia wynosi 6,25 — „powyżej oczekiwań”.',
    landing: '/oceny/case-anna/ocena',
  },
  {
    id: 'weto',
    label: 'Scenariusz B — reguła weta',
    description: 'Sytuacje kryzysowe 1 pkt, decyzje 5 pkt: średnia 5,50, a mimo to ocena negatywna (§ 11 ust. 1 pkt 4).',
    landing: '/oceny/case-anna/podsumowanie',
  },
  {
    id: 'granica',
    label: 'Granica 6,00',
    description: 'Podejmowanie decyzji 5 pkt: średnia dokładnie 6,00 to „na poziomie oczekiwań”, nie „powyżej”.',
    landing: '/oceny/case-anna/podsumowanie',
  },
];

const ANNA_CASE_ID = 'case-anna';
const SCENARIO_TIME = '2026-11-21T09:30:00.000Z';

function withDecisions(
  c: StoredCase,
  points: Partial<Record<CriterionId, ScorePoints>>,
  rationale: Partial<Record<CriterionId, string>>,
): StoredCase {
  const ratings: CriterionRating[] = c.ratings.map((rating) => {
    const target = points[rating.criterionId];
    const current = rating.decision;
    if (target === undefined) {
      return rating;
    }
    return {
      ...rating,
      decision: {
        points: target,
        rationale: rationale[rating.criterionId] ?? '',
        decidedAt: SCENARIO_TIME,
        decidedById: c.evaluator.id,
        suggestedPoints: current?.suggestedPoints ?? null,
        suggestedAverage: current?.suggestedAverage ?? null,
      },
    };
  });
  // Decyzja dla kryterium bez wcześniejszej decyzji wymaga sugestii z wskaźników — uzupełnia ją handler.
  return {
    ...c,
    ratings,
    steps: { ...c.steps, ocena: { completedAt: SCENARIO_TIME, completedById: c.evaluator.id } },
    history: [
      ...c.history,
      historyEvent(SCENARIO_TIME, c.evaluator, 'decyzja', 'Wczytano scenariusz demonstracyjny — oceny cząstkowe ustawione.', 'ocena'),
    ],
  };
}

export function applyScenario(cases: StoredCase[], scenarioId: DemoScenario['id'], suggestionFor: (c: StoredCase, criterionId: CriterionId) => { points: ScorePoints | null; average: number | null }): StoredCase[] {
  if (scenarioId === 'demo') {
    return cases;
  }
  return cases.map((c) => {
    if (c.id !== ANNA_CASE_ID) {
      return c;
    }
    const prepared: StoredCase = {
      ...c,
      ratings: c.ratings.map((rating) => {
        if (rating.decision) return rating;
        const suggestion = suggestionFor(c, rating.criterionId);
        return {
          ...rating,
          decision: {
            points: 7,
            rationale: '',
            decidedAt: SCENARIO_TIME,
            decidedById: c.evaluator.id,
            suggestedPoints: suggestion.points,
            suggestedAverage: suggestion.average,
          },
        };
      }),
    };
    return scenarioId === 'weto'
      ? withDecisions(
          prepared,
          { c11: 1, c14: 5 },
          {
            c11: 'Scenariusz demonstracyjny B: przyjęto, że w czasie incydentu informacja nie trafiła do właściwych osób w wymaganym czasie (opis zachowania na poziomie 1).',
          },
        )
      : withDecisions(prepared, { c14: 5 }, {});
  });
}
