import type { AssessmentOutcome, AssessmentPath, AttentionReason, CaseSummary } from '@core/domain/assessment.model';
import type { Tone } from '@shared/ui/badge/badge.component';
import type { IconName } from '@shared/ui/icon/icons';

export const PATH_LABEL: Readonly<Record<AssessmentPath, string>> = {
  periodic: 'Ocena okresowa',
  first: 'Pierwsza ocena',
};

export function caseKindLabel(summary: Pick<CaseSummary, 'path' | 'formVariant'>): string {
  return summary.path === 'periodic' && summary.formVariant
    ? `${PATH_LABEL.periodic} · arkusz ${summary.formVariant}`
    : PATH_LABEL[summary.path];
}

export interface AttentionPresentation {
  readonly label: string;
  readonly tone: Tone;
  readonly icon: IconName;
  /** Im mniejsza liczba, tym pilniejsza sprawa. */
  readonly rank: number;
}

export const ATTENTION: Readonly<Record<AttentionReason, AttentionPresentation>> = {
  'po-terminie': { label: 'Po terminie', tone: 'danger', icon: 'alert-circle', rank: 0 },
  'termin-dzis': { label: 'Termin dziś', tone: 'danger', icon: 'clock', rank: 1 },
  'brak-zapoznania': { label: 'Czeka na zapoznanie', tone: 'info', icon: 'pencil', rank: 2 },
  zawiadomienie: { label: 'Brak zawiadomienia o terminie', tone: 'warning', icon: 'mail', rank: 3 },
  'rozmowa-wstepna': { label: 'Rozmowa wstępna', tone: 'warning', icon: 'messages', rank: 4 },
  'termin-bliski': { label: 'Termin w ciągu 14 dni', tone: 'warning', icon: 'calendar', rank: 5 },
};

export const OUTCOME_TONE: Readonly<Record<AssessmentOutcome, Tone>> = {
  pozytywna: 'success',
  negatywna: 'danger',
};

export function urgencyRank(summary: CaseSummary): number {
  if (summary.status === 'zakonczona') return Number.MAX_SAFE_INTEGER;
  return Math.min(100, ...summary.attention.map((reason) => ATTENTION[reason].rank));
}

/** Najpierw sprawy z alertami (wg wagi), potem najbliższy termin kolejnej czynności. */
export function byUrgency(a: CaseSummary, b: CaseSummary): number {
  const rank = urgencyRank(a) - urgencyRank(b);
  if (rank !== 0) return rank;
  return (a.nextActionDue ?? a.dueDate).localeCompare(b.nextActionDue ?? b.dueDate);
}

export function stepProgress(summary: CaseSummary): number {
  if (summary.status === 'zakonczona') return 100;
  return Math.round(((summary.stepIndex - 1) / summary.stepCount) * 100);
}
