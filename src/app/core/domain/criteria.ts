import type { AssessmentPath, FormVariant } from './assessment.model';

/**
 * Katalog kryteriów oceny (załącznik nr 1 do rozporządzenia PRM z 4.04.2016 r., Dz.U. poz. 470).
 * Identyfikatory odpowiadają kompetencjom w modelu organizatora (c01–c14) — mapowanie 1:1.
 */
export interface CriterionInfo {
  readonly id: CriterionId;
  /** Nazwa do wyświetlania (model organizatora zapisuje nazwy wersalikami). */
  readonly name: string;
  readonly shortName: string;
  /** Numer kryterium w załączniku nr 1 do rozporządzenia z 2016 r. */
  readonly annexNo: number;
}

export type CriterionId =
  | 'c01'
  | 'c02'
  | 'c03'
  | 'c04'
  | 'c05'
  | 'c06'
  | 'c07'
  | 'c08'
  | 'c09'
  | 'c10'
  | 'c11'
  | 'c12'
  | 'c13'
  | 'c14';

export const CRITERIA: Readonly<Record<CriterionId, CriterionInfo>> = {
  c01: { id: 'c01', name: 'Rzetelność', shortName: 'Rzetelność', annexNo: 8 },
  c02: { id: 'c02', name: 'Komunikacja', shortName: 'Komunikacja', annexNo: 1 },
  c03: {
    id: 'c03',
    name: 'Wykorzystywanie wiedzy i doskonalenie zawodowe',
    shortName: 'Wykorzystywanie wiedzy',
    annexNo: 10,
  },
  c04: {
    id: 'c04',
    name: 'Organizacja pracy i orientacja na osiąganie celów',
    shortName: 'Organizacja pracy',
    annexNo: 4,
  },
  c05: { id: 'c05', name: 'Kreatywność', shortName: 'Kreatywność', annexNo: 2 },
  c06: { id: 'c06', name: 'Współpraca', shortName: 'Współpraca', annexNo: 11 },
  c07: { id: 'c07', name: 'Myślenie analityczne', shortName: 'Myślenie analityczne', annexNo: 9 },
  c08: { id: 'c08', name: 'Negocjowanie', shortName: 'Negocjowanie', annexNo: 3 },
  c09: { id: 'c09', name: 'Wystąpienia publiczne', shortName: 'Wystąpienia publiczne', annexNo: 12 },
  c10: {
    id: 'c10',
    name: 'Orientacja na klienta/interesanta',
    shortName: 'Orientacja na klienta',
    annexNo: 5,
  },
  c11: {
    id: 'c11',
    name: 'Radzenie sobie w sytuacjach kryzysowych',
    shortName: 'Sytuacje kryzysowe',
    annexNo: 7,
  },
  c12: {
    id: 'c12',
    name: 'Zarządzanie strategiczne',
    shortName: 'Zarządzanie strategiczne',
    annexNo: 14,
  },
  c13: { id: 'c13', name: 'Zarządzanie ludźmi', shortName: 'Zarządzanie ludźmi', annexNo: 13 },
  c14: {
    id: 'c14',
    name: 'Podejmowanie decyzji i odpowiedzialność',
    shortName: 'Podejmowanie decyzji',
    annexNo: 6,
  },
};

export const ALL_CRITERION_IDS = Object.keys(CRITERIA) as CriterionId[];

/** Kryteria obowiązkowe w kolejności z arkusza (§ 4 ust. 2–3 rozporządzenia z 2016 r.). */
export const MANDATORY_CRITERIA: Readonly<Record<FormVariant, readonly CriterionId[]>> = {
  B: ['c13', 'c14', 'c04', 'c06', 'c02'],
  C: ['c03', 'c01', 'c04', 'c06', 'c02'],
};

/** Elementy pierwszej oceny (§ 2 rozporządzenia PRM z 23.07.2015 r., Dz.U. poz. 1144). */
export const FIRST_ASSESSMENT_ELEMENTS: readonly CriterionId[] = ['c01', 'c03', 'c04', 'c02', 'c06'];

/** § 5 ust. 2 rozporządzenia z 2016 r.: nie więcej niż 3 kryteria dodatkowe. */
export const MAX_ADDITIONAL_CRITERIA = 3;

export function isCriterionId(value: string): value is CriterionId {
  return value in CRITERIA;
}

export function criterionName(id: string): string {
  return isCriterionId(id) ? CRITERIA[id].name : id;
}

export function criterionShortName(id: string): string {
  return isCriterionId(id) ? CRITERIA[id].shortName : id;
}

export function mandatoryCriteriaFor(
  path: AssessmentPath,
  variant: FormVariant | null | undefined,
): readonly CriterionId[] {
  if (path === 'first') {
    return FIRST_ASSESSMENT_ELEMENTS;
  }
  return variant ? MANDATORY_CRITERIA[variant] : [];
}

export function additionalCriteriaCandidates(variant: FormVariant): CriterionId[] {
  const mandatory = new Set<CriterionId>(MANDATORY_CRITERIA[variant]);
  return ALL_CRITERION_IDS.filter((id) => !mandatory.has(id)).sort(
    (a, b) => CRITERIA[a].annexNo - CRITERIA[b].annexNo,
  );
}

export interface CriteriaSelectionIssue {
  readonly code: 'too-many' | 'duplicate-mandatory' | 'unknown';
  readonly message: string;
}

export function validateAdditionalCriteria(
  variant: FormVariant,
  additional: readonly string[],
): CriteriaSelectionIssue[] {
  const issues: CriteriaSelectionIssue[] = [];
  const mandatory = new Set<string>(MANDATORY_CRITERIA[variant]);
  if (additional.length > MAX_ADDITIONAL_CRITERIA) {
    issues.push({
      code: 'too-many',
      message: `Możesz wybrać najwyżej ${MAX_ADDITIONAL_CRITERIA} kryteria dodatkowe (§ 5 ust. 2).`,
    });
  }
  if (additional.some((id) => mandatory.has(id))) {
    issues.push({
      code: 'duplicate-mandatory',
      message: 'Kryterium obowiązkowe nie może być jednocześnie dodatkowym.',
    });
  }
  if (additional.some((id) => !isCriterionId(id))) {
    issues.push({ code: 'unknown', message: 'Wybrano nieznane kryterium.' });
  }
  return issues;
}
