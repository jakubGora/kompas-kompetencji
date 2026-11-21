import { computeFirstResult, computePeriodicResult, formatScore, type PartialScore } from './result';
import type { ScorePoints } from './scales';

const CRITERIA = ['c03', 'c01', 'c04', 'c06', 'c02', 'c07', 'c11', 'c14'] as const;

function scores(points: readonly (ScorePoints | null)[]): PartialScore[] {
  return points.map((value, index) => ({ criterionId: CRITERIA[index] ?? `x${index}`, points: value }));
}

describe('computePeriodicResult (§ 11 rozporządzenia z 2016 r.)', () => {
  it('scenariusz A: 50 / 8 = 6,25 → powyżej oczekiwań, pozytywna', () => {
    const result = computePeriodicResult(scores([7, 7, 7, 5, 5, 7, 5, 7]));
    expect(result.mean).toBe(6.25);
    expect(result.level?.id).toBe('powyzej');
    expect(result.outcome).toBe('pozytywna');
    expect(formatScore(result.mean ?? 0)).toBe('6,25');
  });

  it('scenariusz B: ocena 1 pkt daje negatywną mimo średniej 5,50 (reguła weta)', () => {
    const result = computePeriodicResult(scores([7, 7, 7, 5, 5, 7, 1, 5]));
    expect(result.mean).toBe(5.5);
    expect(result.level?.id).toBe('na-poziomie');
    expect(result.vetoCriteria).toEqual(['c11']);
    expect(result.outcome).toBe('negatywna');
  });

  it('granica: dokładnie 6,00 to „na poziomie oczekiwań”, nie „powyżej”', () => {
    const result = computePeriodicResult(scores([7, 7, 7, 5, 5, 7, 5, 5]));
    expect(result.mean).toBe(6);
    expect(result.level?.id).toBe('na-poziomie');
    expect(result.onBoundary).toBe(true);
    expect(result.outcome).toBe('pozytywna');
  });

  it('poziom poniżej oczekiwań jest negatywny bez oceny 1 pkt', () => {
    const result = computePeriodicResult(scores([3, 3, 5, 3, 3]));
    expect(result.level?.id).toBe('ponizej');
    expect(result.outcome).toBe('negatywna');
  });

  it('nie wylicza wyniku przy brakujących ocenach', () => {
    const result = computePeriodicResult(scores([7, null, 5]));
    expect(result.complete).toBe(false);
    expect(result.outcome).toBeNull();
    expect(result.missing).toEqual(['c01']);
  });
});

describe('computeFirstResult (§ 10 rozporządzenia z 2015 r.)', () => {
  const base = { exam: 'zaliczony' as const, reportOnTime: true };

  it('pozytywna przy spełnieniu wszystkich warunków', () => {
    const result = computeFirstResult({ ...base, scores: scores([5, 7, 5, 3, 5]) });
    expect(result.mean).toBe(5);
    expect(result.outcome).toBe('pozytywna');
  });

  it('negatywna przy dwóch ocenach 3 pkt', () => {
    const result = computeFirstResult({ ...base, scores: scores([3, 7, 7, 3, 7]) });
    expect(result.belowCount).toBe(2);
    expect(result.outcome).toBe('negatywna');
  });

  it('negatywna przy niezaliczonym egzaminie albo sprawozdaniu po terminie', () => {
    expect(computeFirstResult({ ...base, exam: 'niezaliczony', scores: scores([7, 7, 7, 7, 7]) }).outcome).toBe('negatywna');
    expect(computeFirstResult({ ...base, reportOnTime: false, scores: scores([7, 7, 7, 7, 7]) }).outcome).toBe('negatywna');
  });

  it('zwolnienie z egzaminu spełnia warunek', () => {
    expect(computeFirstResult({ ...base, exam: 'nie-dotyczy', scores: scores([5, 5, 5, 5, 5]) }).outcome).toBe('pozytywna');
  });
});
