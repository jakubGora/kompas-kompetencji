import type { IndicatorAssessment } from './assessment.model';
import type { BehaviorLevel } from './competency.model';
import { suggestCriterionScore } from './scoring';

function indicators(levels: readonly (BehaviorLevel | 'nb' | null)[]): IndicatorAssessment[] {
  return levels.map((level, index) => ({
    indicatorId: `i${index + 1}`,
    level: level === 'nb' ? null : level,
    noBasis: level === 'nb',
    observationIds: [],
  }));
}

describe('suggestCriterionScore (reguła narzędzia)', () => {
  it('liczy średnią punktów wskaźników i mapuje ją progami z § 11', () => {
    // Wykorzystywanie wiedzy: 7 · 7 · 5 → 6,33 → 7 pkt
    const result = suggestCriterionScore('periodic', indicators([4, 4, 3]));
    expect(result.average).toBeCloseTo(6.333, 3);
    expect(result.points).toBe(7);
  });

  it('pomija wskaźniki „brak podstaw” zamiast liczyć je jako najniższe', () => {
    // Współpraca: 5 · 5 · 7 · 5 · 5 · brak podstaw → 5,4 → 5 pkt
    const result = suggestCriterionScore('periodic', indicators([3, 3, 4, 3, 3, 'nb']));
    expect(result.noBasisCount).toBe(1);
    expect(result.assessedCount).toBe(5);
    expect(result.average).toBeCloseTo(5.4, 5);
    expect(result.points).toBe(5);
  });

  it('nie sugeruje oceny, gdy brak obserwowanych wskaźników (nie obniża automatycznie)', () => {
    const result = suggestCriterionScore('periodic', indicators(['nb', 'nb', 'nb']));
    expect(result.insufficientEvidence).toBe(true);
    expect(result.points).toBeNull();
    expect(result.average).toBeNull();
  });

  it('liczy wskaźniki jeszcze nieocenione jako oczekujące', () => {
    const result = suggestCriterionScore('periodic', indicators([5, null, null]));
    expect(result.pendingCount).toBe(2);
    expect(result.points).toBe(9);
  });

  it('dla sytuacji kryzysowych 5 · 3 · 5 → 4,33 → 5 pkt', () => {
    expect(suggestCriterionScore('periodic', indicators([3, 2, 3])).points).toBe(5);
  });

  it('w pierwszej ocenie mapuje poziomy na skalę 3/5/7', () => {
    expect(suggestCriterionScore('first', indicators([1, 2])).points).toBe(3);
    expect(suggestCriterionScore('first', indicators([3, 3])).points).toBe(5);
    expect(suggestCriterionScore('first', indicators([4, 5])).points).toBe(7);
  });

  it('w pierwszej ocenie granica należy do niższego przedziału, jak w § 11 (średnia 6 → 5 pkt)', () => {
    expect(suggestCriterionScore('first', indicators([3, 4])).points).toBe(5);
    expect(suggestCriterionScore('first', indicators([4, 4, 3])).points).toBe(7);
  });
});
