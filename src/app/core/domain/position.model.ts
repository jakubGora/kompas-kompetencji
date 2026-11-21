import type { FormVariant } from './assessment.model';
import type { CriterionId } from './criteria';
import type { IsoDateTime } from './date';

export type PositionTaskKind = 'dominujace' | 'pozostale';

export interface PositionTask {
  readonly id: string;
  readonly no: number;
  readonly kind: PositionTaskKind;
  readonly text: string;
}

export type SubordinatesRange = 'brak' | '1-4' | '5-9' | '10-19' | '20+';

/** Opis stanowiska pracy (OSP) w zakresie potrzebnym do oceny. */
export interface Position {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly orgUnitId: string;
  readonly office: string;
  readonly department: string;
  readonly division: string;
  readonly documentName: string;
  /** Czy dokument pochodzi z materiałów organizatora (a nie z danych demonstracyjnych). */
  readonly fromOrganizer: boolean;
  readonly purpose: string;
  readonly supervisedBy: { readonly direct: string; readonly indirect?: string };
  readonly subordinates: { readonly range: SubordinatesRange; readonly quote: string };
  readonly tasks: readonly PositionTask[];
  readonly authorizations: readonly string[];
  readonly independence: string;
  readonly softCompetencies: readonly string[];
}

/** Dokument OSP z ewidencji komórki, który można przypisać do oceny. */
export interface PositionOption {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly documentName: string;
  readonly fromOrganizer: boolean;
}

export interface EvidenceQuote {
  readonly text: string;
  /** Miejsce w dokumencie, np. „Zadanie 1 (dominujące)”. */
  readonly location: string;
  readonly taskId?: string;
}

export type Confidence = 'wysoka' | 'srednia' | 'niska';

export interface AdditionalCriterionSuggestion {
  readonly criterionId: CriterionId;
  readonly confidence: Confidence;
  readonly rationale: string;
  readonly evidence: readonly EvidenceQuote[];
}

/** Wynik analizy OSP przez asystenta. Zawsze wymaga zatwierdzenia przez człowieka. */
export interface PositionAnalysis {
  readonly analyzedAt: IsoDateTime;
  readonly model: string;
  readonly recommendedVariant: FormVariant;
  readonly variantRationale: string;
  readonly variantEvidence: readonly EvidenceQuote[];
  readonly legalBasis: string;
  readonly suggestions: readonly AdditionalCriterionSuggestion[];
  readonly warnings: readonly string[];
}
