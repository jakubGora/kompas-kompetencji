import type { CaseSummary, IndicatorAssessment, Observation } from '@core/domain/assessment.model';
import type { IsoDate } from '@core/domain/date';
import type { AppUser, EmployeeListItem, OrgUnit, PersonRef, UserRole } from '@core/domain/people.model';
import type { Position } from '@core/domain/position.model';
import type { Candidate, CommitteeRating, Recruitment, RecruitmentStage } from '@core/domain/recruitment.model';
import type { ScorePoints } from '@core/domain/scales';

/** Treść błędu zwracana przez API (mock i docelowy backend). */
export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly issues?: readonly string[];
}

export interface SessionInfo {
  readonly user: AppUser;
  readonly orgUnit: OrgUnit;
  readonly office: OrgUnit;
  /** Data „dziś” według serwera — wszystkie terminy liczymy względem niej. */
  readonly today: IsoDate;
}

export interface DemoAccount extends PersonRef {
  readonly roles: readonly UserRole[];
  readonly hint: string;
}

export interface DemoScenarioInfo {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly landing: string;
}

/** Endpoint dostępny tylko w trybie mock (`/api/demo`). */
export interface DemoInfo {
  readonly scenarioId: string;
  readonly today: IsoDate;
  readonly scenarios: readonly DemoScenarioInfo[];
  readonly accounts: readonly DemoAccount[];
}

export interface EmployeeDetail {
  readonly employee: EmployeeListItem;
  readonly position: Position;
  readonly cases: readonly CaseSummary[];
}

export interface ReminderSendResult {
  readonly sent: number;
}

export type CaseScope = 'mine' | 'all';

export type ObservationInput = Omit<Observation, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>;

export interface ObservationDraftInput {
  readonly date?: string;
  readonly title?: string;
  readonly description: string;
}

export interface RatingInput {
  readonly indicators: readonly IndicatorAssessment[];
  readonly decision: { readonly points: ScorePoints; readonly rationale: string } | null;
}

export interface RecruitmentDetail {
  readonly recruitment: Recruitment;
  readonly candidates: readonly Candidate[];
}

export interface CandidateDetail {
  readonly candidate: Candidate;
  readonly recruitment: Recruitment;
}

export interface CandidatePatch {
  readonly stage?: RecruitmentStage;
  readonly committeeNote?: string;
  readonly ratings?: readonly { readonly competencyId: string; readonly rating: CommitteeRating | null }[];
}
