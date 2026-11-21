import type { Candidate, CommitteeRating, Recruitment, RecruitmentStage } from '@core/domain/recruitment.model';
import { RECRUITMENT_STAGES } from '@core/domain/recruitment.model';
import { RECRUITMENTS } from '../data/recruitment';
import type { MockDb } from '../db';
import { notFound } from '../http';
import type { MockRouter } from '../router';

const RATINGS: readonly CommitteeRating[] = ['spelnia', 'do-poglebienia', 'powyzej', 'nie-spelnia'];
const MAX_NOTE_LENGTH = 2000;

function withCounts(db: MockDb, recruitment: (typeof RECRUITMENTS)[number]): Recruitment {
  const candidates = db.state.candidates.filter((candidate) => candidate.recruitmentId === recruitment.id);
  const stageCounts = Object.fromEntries(
    RECRUITMENT_STAGES.map((stage) => [stage.id, candidates.filter((candidate) => candidate.stage === stage.id).length]),
  ) as Record<RecruitmentStage, number>;
  return { ...recruitment, candidateCount: candidates.length, stageCounts };
}

function findRecruitment(db: MockDb, id: string): Recruitment {
  const recruitment = RECRUITMENTS.find((candidate) => candidate.id === id);
  if (!recruitment) throw notFound('nabór');
  return withCounts(db, recruitment);
}

interface CandidatePatch {
  readonly stage?: RecruitmentStage;
  readonly committeeNote?: string;
  readonly ratings?: readonly { readonly competencyId: string; readonly rating: CommitteeRating | null }[];
}

export function registerRecruitmentRoutes(router: MockRouter): void {
  router
    .get('/recruitments', ({ db }) => RECRUITMENTS.map((recruitment) => withCounts(db, recruitment)))
    .get('/recruitments/:id', ({ db, params }) => {
      const recruitment = findRecruitment(db, params['id'] ?? '');
      return {
        recruitment,
        candidates: db.state.candidates
          .filter((candidate) => candidate.recruitmentId === recruitment.id)
          .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt)),
      };
    })
    .get('/candidates/:id', ({ db, params }) => {
      const candidate = db.state.candidates.find((item) => item.id === params['id']);
      if (!candidate) throw notFound('kandydat');
      return { candidate, recruitment: findRecruitment(db, candidate.recruitmentId) };
    })
    .patch('/candidates/:id', ({ db, params, body }) => {
      const candidate = db.state.candidates.find((item) => item.id === params['id']);
      if (!candidate) throw notFound('kandydat');
      const input = (body ?? {}) as CandidatePatch;
      const ratings = new Map((input.ratings ?? []).map((item) => [item.competencyId, item.rating]));
      const updated: Candidate = {
        ...candidate,
        ...(input.stage && RECRUITMENT_STAGES.some((stage) => stage.id === input.stage) ? { stage: input.stage } : {}),
        ...(typeof input.committeeNote === 'string' ? { committeeNote: input.committeeNote.slice(0, MAX_NOTE_LENGTH) } : {}),
        evidence: candidate.evidence.map((item) => {
          if (!ratings.has(item.competencyId)) return item;
          const rating = ratings.get(item.competencyId);
          if (rating && RATINGS.includes(rating)) return { ...item, rating };
          const { rating: _removed, ...rest } = item;
          return rest;
        }),
      };
      db.update((state) => ({
        ...state,
        candidates: state.candidates.map((item) => (item.id === updated.id ? updated : item)),
      }));
      return updated;
    });
}
