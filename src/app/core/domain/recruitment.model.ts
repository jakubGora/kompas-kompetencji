import type { CriterionId } from './criteria';
import type { IsoDate, IsoDateTime } from './date';

export type RecruitmentStage = 'nowe' | 'weryfikacja' | 'rozmowa' | 'decyzja';

export const RECRUITMENT_STAGES: readonly { readonly id: RecruitmentStage; readonly label: string }[] = [
  { id: 'nowe', label: 'Nowe zgłoszenia' },
  { id: 'weryfikacja', label: 'Weryfikacja formalna' },
  { id: 'rozmowa', label: 'Rozmowa i kompetencje' },
  { id: 'decyzja', label: 'Decyzja komisji' },
];

/** Ocena komisji przy kompetencji — bez automatycznego rankingu kandydatów. */
export type CommitteeRating = 'spelnia' | 'do-poglebienia' | 'powyzej' | 'nie-spelnia';

export interface Recruitment {
  readonly id: string;
  readonly reference: string;
  readonly title: string;
  readonly orgUnitName: string;
  readonly positionId: string;
  readonly status: 'otwarta' | 'zakonczona';
  readonly publishedAt: IsoDate;
  readonly closesAt: IsoDate;
  readonly competencyIds: readonly CriterionId[];
  readonly candidateCount: number;
  readonly stageCounts: Readonly<Record<RecruitmentStage, number>>;
}

export interface CandidateEvidence {
  readonly competencyId: CriterionId;
  readonly evidence: string;
  readonly source: 'CV' | 'list motywacyjny' | 'zadanie praktyczne' | 'rozmowa';
  readonly rating?: CommitteeRating;
  readonly followUpQuestion?: string;
}

export interface Candidate {
  readonly id: string;
  readonly recruitmentId: string;
  readonly fullName: string;
  readonly stage: RecruitmentStage;
  readonly appliedAt: IsoDate;
  readonly statusNote: string;
  readonly nextEvent?: { readonly label: string; readonly at: IsoDateTime };
  readonly formalRequirements: readonly { readonly label: string; readonly met: boolean | null }[];
  readonly evidence: readonly CandidateEvidence[];
  readonly materials: readonly string[];
  readonly committeeNote: string;
}
