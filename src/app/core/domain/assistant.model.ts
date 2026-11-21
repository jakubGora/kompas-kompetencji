import type { AssessmentPath, StepId } from './assessment.model';
import type { CriterionId } from './criteria';
import type { IsoDate, IsoDateTime } from './date';

export type AssistantMode = 'formalny' | 'rozmowa';

export type SourceKind = 'przepis' | 'poradnik' | 'model' | 'wzor' | 'regula-narzedzia';

export interface KnowledgeSource {
  readonly id: string;
  readonly title: string;
  readonly shortTitle: string;
  readonly kind: SourceKind;
  readonly reference: string;
  readonly description: string;
  readonly fragmentCount: number;
}

export interface SourceFragment {
  readonly id: string;
  readonly sourceId: string;
  /** Jednostka redakcyjna albo miejsce, np. „§ 11 ust. 1 pkt 4”, „s. 8”. */
  readonly locator: string;
  readonly heading: string;
  readonly text: string;
  readonly paths: readonly AssessmentPath[];
}

export interface Citation {
  readonly fragmentId: string;
  readonly sourceId: string;
  readonly label: string;
  readonly kind: SourceKind;
  readonly quote: string;
}

export interface AssistantContext {
  readonly caseId?: string;
  readonly path?: AssessmentPath;
  readonly stepId?: StepId;
}

export interface AssistantQuestion {
  readonly question: string;
  readonly mode: AssistantMode;
  readonly context?: AssistantContext;
}

export type AnswerStatus = 'odpowiedz' | 'brak-zrodla' | 'poza-zakresem';

export interface AssistantAnswer {
  readonly id: string;
  readonly question: string;
  readonly mode: AssistantMode;
  readonly status: AnswerStatus;
  readonly answer: string;
  readonly bullets: readonly string[];
  readonly citations: readonly Citation[];
  /** Odpowiedź opiera się na regule narzędzia, nie na przepisie. */
  readonly toolRule: boolean;
  readonly followUps: readonly string[];
  readonly answeredAt: IsoDateTime;
  readonly model: string;
}

export interface SuggestedQuestion {
  readonly text: string;
  readonly mode: AssistantMode;
}

/** Ocena jakości notatki z obserwacji (fakty vs. opinie). */
export interface ObservationCoaching {
  readonly quality: 'konkretna' | 'do-uzupelnienia' | 'ocena-zamiast-faktu';
  readonly message: string;
  readonly missing: readonly ('data' | 'zachowanie' | 'rezultat')[];
  readonly flaggedPhrases: readonly string[];
  readonly questions: readonly string[];
}

export interface IndicatorMatch {
  readonly criterionId: CriterionId;
  readonly indicatorId: string;
  readonly confidence: 'wysoka' | 'srednia' | 'niska';
  readonly matchedPhrases: readonly string[];
}

export interface ObservationAnalysis {
  readonly coaching: ObservationCoaching;
  readonly matches: readonly IndicatorMatch[];
  /** Propozycja krótkiego tytułu z opisu — oceniający może ją zmienić. */
  readonly suggestedTitle: string;
  /** Zadanie z OSP, którego najpewniej dotyczy opis. */
  readonly suggestedTaskId?: string;
  readonly analyzedAt: IsoDateTime;
}

export interface ConversationPlanItem {
  readonly criterionId: CriterionId;
  readonly facts: readonly { readonly observationId: string; readonly date: IsoDate; readonly text: string }[];
  readonly gaps: readonly string[];
  readonly questions: readonly string[];
}

export interface ConversationPlan {
  readonly generatedAt: IsoDateTime;
  readonly opening: string;
  readonly agenda: readonly { readonly topic: string; readonly legalRef: string }[];
  readonly items: readonly ConversationPlanItem[];
  readonly developmentQuestions: readonly string[];
  readonly closing: string;
  readonly cautions: readonly string[];
}

export interface DraftText {
  readonly text: string;
  readonly basedOn: readonly string[];
  readonly generatedAt: IsoDateTime;
}
