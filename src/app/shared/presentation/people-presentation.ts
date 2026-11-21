import type { CivilServiceStatus } from '@core/domain/people.model';

export const CIVIL_STATUS_LABEL: Readonly<Record<CivilServiceStatus, string>> = {
  'urzednik-sc': 'urzędnik służby cywilnej',
  'pracownik-sc': 'pracownik służby cywilnej',
};
