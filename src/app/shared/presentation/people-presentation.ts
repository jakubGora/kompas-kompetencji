import type { AssessmentPath } from '@core/domain/assessment.model';
import type { CivilServiceStatus, EmploymentBasis } from '@core/domain/people.model';

export const CIVIL_STATUS_LABEL: Readonly<Record<CivilServiceStatus, string>> = {
  'urzednik-sc': 'urzędnik służby cywilnej',
  'pracownik-sc': 'pracownik służby cywilnej',
};

export const EMPLOYMENT_BASIS_LABEL: Readonly<Record<EmploymentBasis, string>> = {
  'pierwsza-umowa': 'Pierwsza umowa na czas określony',
  'czas-nieokreslony': 'Umowa na czas nieokreślony',
};

export const EMPLOYMENT_BASIS_PATH: Readonly<Record<EmploymentBasis, string>> = {
  'pierwsza-umowa': 'pierwsza ocena przed upływem 12 miesięcy',
  'czas-nieokreslony': 'ocena okresowa co 24 miesiące',
};

export function employmentBasisFor(path: AssessmentPath): EmploymentBasis {
  return path === 'first' ? 'pierwsza-umowa' : 'czas-nieokreslony';
}
