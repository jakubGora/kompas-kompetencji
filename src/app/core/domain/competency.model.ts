/** Struktura modelu kompetencji dostarczonego przez organizatora (`model-competencies.json`). */

export type BehaviorLevel = 1 | 2 | 3 | 4 | 5;

export interface Behavior {
  readonly level_index: BehaviorLevel;
  readonly label: string;
  readonly description: string;
}

export interface SourceRange {
  readonly sheet: string;
  readonly range: string;
}

export interface Indicator {
  readonly id: string;
  readonly text: string;
  readonly source: SourceRange;
  readonly behaviors: readonly Behavior[];
}

export interface Competency {
  readonly id: string;
  readonly name: string;
  readonly source_sheet: string;
  readonly indicators: readonly Indicator[];
}

export interface CompetencyModel {
  readonly schema_version: string;
  readonly source_file: string;
  readonly source_sha256: string;
  readonly source_guidance: readonly string[];
  readonly scoring: {
    readonly aggregation_rule: string | null;
    readonly first_assessment_mapping: string | null;
    readonly note: string;
  };
  readonly competencies: readonly Competency[];
}
