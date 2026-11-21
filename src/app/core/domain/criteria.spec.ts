import {
  additionalCriteriaCandidates,
  FIRST_ASSESSMENT_ELEMENTS,
  MANDATORY_CRITERIA,
  mandatoryCriteriaFor,
  validateAdditionalCriteria,
} from './criteria';

describe('criteria (§ 4–5 rozporządzenia z 2016 r.)', () => {
  it('arkusz C: wiedza, rzetelność, organizacja, współpraca, komunikacja', () => {
    expect(MANDATORY_CRITERIA.C).toEqual(['c03', 'c01', 'c04', 'c06', 'c02']);
  });

  it('arkusz B: zarządzanie ludźmi, decyzje, organizacja, współpraca, komunikacja', () => {
    expect(MANDATORY_CRITERIA.B).toEqual(['c13', 'c14', 'c04', 'c06', 'c02']);
  });

  it('pierwsza ocena ma stałe pięć elementów', () => {
    expect(mandatoryCriteriaFor('first', undefined)).toBe(FIRST_ASSESSMENT_ELEMENTS);
  });

  it('kandydaci na kryteria dodatkowe wykluczają obowiązkowe', () => {
    const candidates = additionalCriteriaCandidates('C');
    expect(candidates).toHaveLength(9);
    expect(candidates).not.toContain('c01');
  });

  it('blokuje więcej niż 3 kryteria dodatkowe', () => {
    expect(validateAdditionalCriteria('C', ['c07', 'c11', 'c14'])).toEqual([]);
    expect(validateAdditionalCriteria('C', ['c07', 'c11', 'c14', 'c05']).map((i) => i.code)).toEqual(['too-many']);
    expect(validateAdditionalCriteria('C', ['c01']).map((i) => i.code)).toEqual(['duplicate-mandatory']);
  });
});
