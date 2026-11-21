import type { BehaviorLevel } from './competency.model';
import type { CriterionId } from './criteria';
import type { IsoDate, IsoDateTime } from './date';
import type { Employee, PersonRef } from './people.model';
import type { Position, PositionAnalysis } from './position.model';
import type { ScorePoints } from './scales';

export type AssessmentPath = 'periodic' | 'first';
/** Arkusz B — stanowiska z bezpośrednim kierowaniem pracownikami; C — pozostałe (§ 3). */
export type FormVariant = 'B' | 'C';
export type AssessmentOutcome = 'pozytywna' | 'negatywna';
export type CaseStatus = 'w-toku' | 'zakonczona';

export type StepId =
  | 'stanowisko'
  | 'kryteria'
  | 'rozmowa-wstepna'
  | 'sluzba-przygotowawcza'
  | 'obserwacje'
  | 'sprawozdanie'
  | 'rozmowa-oceniajaca'
  | 'ocena'
  | 'podsumowanie';

export interface StepRecord {
  readonly completedAt?: IsoDateTime;
  readonly completedById?: string;
}

export type TopicStatus = 'omowiono' | 'nie-dotyczy';

export interface PositionReview {
  readonly analysis?: PositionAnalysis;
  readonly confirmedVariant?: FormVariant;
  /** Wymagane, gdy człowiek wybiera inny arkusz niż rekomendowany. */
  readonly overrideReason?: string;
  readonly confirmedAt?: IsoDateTime;
}

export interface CriteriaSelection {
  readonly additional: readonly CriterionId[];
  /** Kryteria dodatkowe zaproponowane przez asystenta, które człowiek odrzucił. */
  readonly rejectedSuggestions: readonly CriterionId[];
  readonly approvedAt?: IsoDateTime;
}

export interface Expectation {
  readonly criterionId: CriterionId;
  readonly text: string;
}

export interface Goal {
  readonly id: string;
  readonly text: string;
  readonly measure: string;
}

export interface DateRange {
  readonly from?: IsoDate;
  readonly to?: IsoDate;
}

export interface PreliminaryMeeting {
  readonly meetingDate?: IsoDate;
  readonly topics: Readonly<Record<string, TopicStatus>>;
  readonly expectations: readonly Expectation[];
  readonly goals: readonly Goal[];
  readonly notes: string;
  /** Ocena okresowa: termin sporządzenia oceny podany w części I arkusza. */
  readonly assessmentDueDate?: IsoDate;
  /** Pierwsza ocena: termin złożenia sprawozdania (od–do). */
  readonly reportWindow?: DateRange;
  /** Pierwsza ocena: termin dokonania oceny (od–do). */
  readonly assessmentWindow?: DateRange;
  /** Data zapoznania z kryteriami (ocena okresowa: początek okresu „OD”). */
  readonly employeeAcknowledgedAt?: IsoDate;
}

export type ExamOutcome = 'zaliczony' | 'niezaliczony' | 'nie-dotyczy';
export type ExamExemption = 'absolwent-ksap' | 'zastepstwo' | 'wyzsze-stanowisko';

export interface PreparatoryService {
  readonly outcome?: ExamOutcome;
  readonly examDate?: IsoDate;
  readonly exemption?: ExamExemption;
  readonly note: string;
}

export interface EmployeeReport {
  readonly status?: 'zlozone' | 'niezlozone';
  readonly submittedAt?: IsoDate;
  readonly coverage?: DateRange;
  readonly summary: {
    readonly tasks: string;
    readonly problems: string;
    readonly skills: string;
    readonly improvements: string;
  };
}

export interface Observation {
  readonly id: string;
  readonly date: IsoDate;
  readonly title: string;
  /** Zadanie z OSP, którego dotyczy sytuacja — ogniwo łańcucha „zadanie → kryterium”. */
  readonly positionTaskId?: string;
  /** „Zadanie i zachowanie” — co się wydarzyło, konkretne zachowanie i jego rezultat. */
  readonly description: string;
  readonly criterionIds: readonly CriterionId[];
  readonly indicatorIds: readonly string[];
  readonly authorId: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface IndicatorAssessment {
  readonly indicatorId: string;
  /** Wybrany opis zachowania (1–5) albo brak wyboru. */
  readonly level: BehaviorLevel | null;
  /** „Nie miałem/am okazji zaobserwować” — wskaźnik nie wchodzi do sugestii. */
  readonly noBasis: boolean;
  readonly observationIds: readonly string[];
}

export interface RatingDecision {
  readonly points: ScorePoints;
  readonly rationale: string;
  readonly decidedAt: IsoDateTime;
  readonly decidedById: string;
  /** Sugestia narzędzia w chwili decyzji — do śladu audytowego. */
  readonly suggestedPoints: ScorePoints | null;
  readonly suggestedAverage: number | null;
}

export interface CriterionRating {
  readonly criterionId: CriterionId;
  readonly indicators: readonly IndicatorAssessment[];
  readonly decision: RatingDecision | null;
}

export interface ReviewMeeting {
  readonly meetingDate?: IsoDate;
  readonly topics: Readonly<Record<string, TopicStatus>>;
  readonly notes: string;
  readonly employeePerspective: string;
  readonly developmentNeeds: string;
  readonly headOfUnitPresent?: boolean;
  readonly planGeneratedAt?: IsoDateTime;
}

export type PromotionRequest = 'tak' | 'nie' | 'nie-dotyczy';
/** Wniosek kierującego komórką do dyrektora generalnego po pierwszej ocenie (art. 38 ust. 3 ustawy). */
export type HeadOfUnitRequest = 'umowa-na-czas-nieokreslony' | 'niezawieranie-umowy' | 'rozwiazanie-umowy';

export interface CaseConclusion {
  readonly justification: string;
  readonly justificationAiDraft?: boolean;
  /** Ocena okresowa: wnioski do IPRZ; pierwsza ocena: wnioski dotyczące rozwoju. */
  readonly developmentPlan: string;
  readonly promotionRequest?: PromotionRequest;
  readonly promotionJustification: string;
  /** Data sporządzenia oceny na piśmie — koniec okresu „DO”. */
  readonly draftedAt?: IsoDate;
  readonly sheetGeneratedAt?: IsoDateTime;
  readonly employeeAcknowledgedAt?: IsoDate;
  readonly objectionFiledAt?: IsoDate;
  readonly headOfUnitConfirmedAt?: IsoDate;
  readonly headOfUnitRequest?: HeadOfUnitRequest;
}

export type DocumentKind =
  | 'czesc-i'
  | 'arkusz-okresowy'
  | 'arkusz-pierwszej-oceny'
  | 'plan-rozmowy'
  | 'zawiadomienie-o-terminie';

export interface CaseDocument {
  readonly id: string;
  readonly kind: DocumentKind;
  readonly title: string;
  readonly status: 'szkic' | 'wygenerowany' | 'podpisany';
  readonly createdAt: IsoDateTime;
  readonly version: number;
}

export type HistoryKind =
  | 'utworzenie'
  | 'krok'
  | 'obserwacja'
  | 'decyzja'
  | 'odstepstwo'
  | 'dokument'
  | 'przypomnienie'
  | 'zapoznanie'
  | 'termin';

export interface HistoryEvent {
  readonly id: string;
  readonly at: IsoDateTime;
  readonly actor: PersonRef;
  readonly kind: HistoryKind;
  readonly summary: string;
  readonly stepId?: StepId;
}

export interface DeadlineExtension {
  readonly days: number;
  readonly reason: string;
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly legalBasis: string;
  readonly employeeNotifiedAt?: IsoDate;
}

export interface CaseDeadlines {
  /** Termin sporządzenia oceny (okresowa) albo koniec okna pierwszej oceny. */
  readonly dueDate: IsoDate;
  readonly baseDueDate: IsoDate;
  readonly basis: string;
  readonly extensions: readonly DeadlineExtension[];
  /** Termin zapoznania z kryteriami / rozmowy wstępnej. */
  readonly preliminaryDueDate: IsoDate;
  /** Pierwsza ocena: najwcześniejsza data dokonania oceny. */
  readonly windowStart?: IsoDate;
}

export interface CaseAccess {
  readonly role: 'oceniajacy' | 'kierujacy' | 'kadry';
  readonly canEdit: boolean;
  /** Widok kadr: bez notatek z obserwacji, zaznaczeń zachowań i notatek z rozmów. */
  readonly redacted: boolean;
}

export interface AssessmentCase {
  readonly id: string;
  readonly path: AssessmentPath;
  readonly status: CaseStatus;
  readonly access: CaseAccess;
  readonly employee: Employee;
  readonly position: Position;
  readonly evaluator: PersonRef;
  readonly headOfUnit?: PersonRef;
  readonly orgUnitName: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly steps: Readonly<Partial<Record<StepId, StepRecord>>>;
  readonly deadlines: CaseDeadlines;
  readonly positionReview: PositionReview;
  readonly criteria: CriteriaSelection;
  readonly preliminary: PreliminaryMeeting;
  readonly preparatoryService: PreparatoryService;
  readonly report: EmployeeReport;
  readonly observations: readonly Observation[];
  readonly review: ReviewMeeting;
  readonly ratings: readonly CriterionRating[];
  readonly conclusion: CaseConclusion;
  readonly documents: readonly CaseDocument[];
  readonly history: readonly HistoryEvent[];
}

/** Dane sprawy bez kontekstu uprawnień widza — wejście reguł domeny. */
export type AssessmentCaseData = Omit<AssessmentCase, 'access'>;

/** Pola, które przełożony edytuje w krokach (autozapis wysyła je jako PATCH). */
export interface AssessmentCasePatch {
  readonly positionReview?: Partial<PositionReview>;
  readonly criteria?: Partial<CriteriaSelection>;
  readonly preliminary?: Partial<PreliminaryMeeting>;
  readonly preparatoryService?: Partial<PreparatoryService>;
  readonly report?: Partial<EmployeeReport>;
  readonly review?: Partial<ReviewMeeting>;
  readonly conclusion?: Partial<CaseConclusion>;
}

export type AttentionReason =
  | 'termin-dzis'
  | 'termin-bliski'
  | 'po-terminie'
  | 'brak-zapoznania'
  | 'rozmowa-wstepna'
  | 'zawiadomienie';

/** Przedłużenie terminu w listach — bez przyczyny nieobecności (minimalizacja danych). */
export type DeadlineExtensionSummary = Pick<DeadlineExtension, 'days' | 'from' | 'to' | 'legalBasis'>;

/** Widok sprawy w listach (HR, „Moje oceny”). */
export interface CaseSummary {
  readonly id: string;
  readonly path: AssessmentPath;
  readonly status: CaseStatus;
  readonly formVariant?: FormVariant;
  readonly employee: {
    readonly id: string;
    readonly fullName: string;
    readonly positionTitle: string;
    readonly positionCode: string;
    readonly orgUnitCode: string;
    /** Wydział (komórka), w której jest stanowisko. */
    readonly orgUnitName: string;
    readonly departmentName: string;
  };
  readonly evaluator: PersonRef;
  readonly currentStepId: StepId;
  readonly currentStepLabel: string;
  readonly stepIndex: number;
  readonly stepCount: number;
  readonly dueDate: IsoDate;
  readonly baseDueDate: IsoDate;
  readonly extensions: readonly DeadlineExtensionSummary[];
  readonly nextActionLabel: string;
  readonly nextActionDue?: IsoDate;
  readonly attention: readonly AttentionReason[];
  readonly observationsCount: number;
  readonly outcome?: AssessmentOutcome;
  readonly mean?: number;
  readonly levelLabel?: string;
  readonly completedAt?: IsoDate;
  readonly updatedAt: IsoDateTime;
}

export interface StartCaseRequest {
  readonly employeeId: string;
  readonly path: AssessmentPath;
}
