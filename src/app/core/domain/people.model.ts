import type { AssessmentOutcome, AssessmentPath } from './assessment.model';
import type { IsoDate } from './date';
import type { OverallLevelId } from './scales';

export type UserRole = 'manager' | 'hr';

/** Osoba korzystająca z aplikacji (przełożony, kierujący komórką, kadry). */
export interface AppUser {
  readonly id: string;
  readonly fullName: string;
  readonly jobTitle: string;
  readonly orgUnitId: string;
  readonly roles: readonly UserRole[];
  readonly email: string;
  /** Adres zdjęcia profilowego; bez niego pokazujemy inicjały. */
  readonly avatarUrl?: string;
}

export interface PersonRef {
  readonly id: string;
  readonly fullName: string;
  readonly jobTitle: string;
}

export type OrgUnitKind = 'urzad' | 'departament' | 'biuro' | 'wydzial';

export interface OrgUnit {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly kind: OrgUnitKind;
  readonly parentId?: string;
}

/** Pracownik służby cywilnej (umowa o pracę) albo urzędnik służby cywilnej (mianowanie). */
export type CivilServiceStatus = 'pracownik-sc' | 'urzednik-sc';

export interface Absence {
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly reason: string;
}

export interface PreviousAssessment {
  readonly draftedAt: IsoDate;
  readonly acknowledgedAt: IsoDate;
  readonly outcome: AssessmentOutcome;
  readonly level: OverallLevelId;
}

export interface CivilServantGrade {
  readonly appointedYear: number;
  readonly grade: string;
  readonly gradeGrantedAt: IsoDate;
}

export interface Employee {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly positionId: string;
  readonly orgUnitId: string;
  readonly supervisorId: string;
  readonly status: CivilServiceStatus;
  readonly employment: {
    readonly since: IsoDate;
    readonly basis: 'czas-nieokreslony' | 'pierwsza-umowa';
    /** Koniec pierwszej umowy na czas określony (12 miesięcy). */
    readonly firstContractEnd?: IsoDate;
  };
  readonly absences: readonly Absence[];
  readonly previousAssessment?: PreviousAssessment;
  readonly civilServant?: CivilServantGrade;
}

/** Widok pracownika w listach i nagłówkach (dane zdenormalizowane przez API). */
export interface EmployeeListItem {
  readonly id: string;
  readonly fullName: string;
  readonly positionTitle: string;
  readonly positionCode: string;
  readonly orgUnitCode: string;
  readonly orgUnitName: string;
  readonly supervisor: PersonRef;
  readonly status: CivilServiceStatus;
  readonly employedSince: IsoDate;
  /** Ścieżka kolejnej oceny: pierwsza umowa → pierwsza ocena, w pozostałych przypadkach ocena okresowa. */
  readonly suggestedPath: AssessmentPath;
  readonly previousAssessment?: PreviousAssessment;
  readonly activeCaseId?: string;
  readonly nextAction?: { readonly label: string; readonly dueDate?: IsoDate };
}
