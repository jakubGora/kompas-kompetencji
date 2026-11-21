import type { Candidate, CommitteeRating } from '@core/domain/recruitment.model';
import type { Tone } from '@shared/ui/badge/badge.component';

export const COMMITTEE_RATINGS: readonly { readonly id: CommitteeRating; readonly label: string; readonly tone: Tone }[] = [
  { id: 'nie-spelnia', label: 'Nie spełnia', tone: 'danger' },
  { id: 'do-poglebienia', label: 'Do pogłębienia', tone: 'warning' },
  { id: 'spelnia', label: 'Spełnia', tone: 'success' },
  { id: 'powyzej', label: 'Powyżej oczekiwań', tone: 'primary' },
];

export const RATING_INFO: Readonly<Record<CommitteeRating, { readonly label: string; readonly tone: Tone }>> = Object.fromEntries(
  COMMITTEE_RATINGS.map((rating) => [rating.id, { label: rating.label, tone: rating.tone }]),
) as Record<CommitteeRating, { readonly label: string; readonly tone: Tone }>;

export type FormalStatus = 'spelnione' | 'do-weryfikacji' | 'niespelnione';

export const FORMAL_STATUS: Readonly<Record<FormalStatus, { readonly label: string; readonly tone: Tone }>> = {
  spelnione: { label: 'Wymagania formalne spełnione', tone: 'success' },
  'do-weryfikacji': { label: 'Wymagania do weryfikacji', tone: 'warning' },
  niespelnione: { label: 'Wymagania niespełnione', tone: 'danger' },
};

export function formalStatus(candidate: Pick<Candidate, 'formalRequirements'>): FormalStatus {
  if (candidate.formalRequirements.some((requirement) => requirement.met === false)) return 'niespelnione';
  if (candidate.formalRequirements.some((requirement) => requirement.met === null)) return 'do-weryfikacji';
  return 'spelnione';
}

export function ratedCount(candidate: Pick<Candidate, 'evidence'>): number {
  return new Set(candidate.evidence.filter((item) => item.rating).map((item) => item.competencyId)).size;
}
