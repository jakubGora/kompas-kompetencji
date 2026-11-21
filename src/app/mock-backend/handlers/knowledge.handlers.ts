import type { AssessmentPath } from '@core/domain/assessment.model';
import type { AssistantMode, AssistantQuestion } from '@core/domain/assistant.model';
import { FRAGMENTS, sourcesWithCounts } from '../data/knowledge';
import { answerQuestion, suggestedQuestions } from '../engine/assistant-engine';
import { normalize } from '../engine/text';
import { badRequest, notFound } from '../http';
import type { MockRouter } from '../router';

const MAX_QUESTION_LENGTH = 500;

function parsePath(value: string | null): AssessmentPath | undefined {
  return value === 'periodic' || value === 'first' ? value : undefined;
}

function parseMode(value: string | null | undefined): AssistantMode {
  return value === 'rozmowa' ? 'rozmowa' : 'formalny';
}

export function registerKnowledgeRoutes(router: MockRouter): void {
  router
    .get('/reference/competency-model', ({ db }) => db.model)
    .get('/knowledge/sources', () => sourcesWithCounts())
    .get('/knowledge/fragments', ({ query }) => {
      const sourceId = query.get('sourceId');
      const phrase = normalize(query.get('q') ?? '');
      return FRAGMENTS.filter((fragment) => !sourceId || fragment.sourceId === sourceId).filter(
        (fragment) => !phrase || normalize(`${fragment.heading} ${fragment.text} ${fragment.locator}`).includes(phrase),
      );
    })
    .get('/knowledge/fragments/:id', ({ params }) => {
      const fragment = FRAGMENTS.find((candidate) => candidate.id === params['id']);
      if (!fragment) throw notFound('fragment źródła');
      return fragment;
    })
    .get('/assistant/suggestions', ({ query }) =>
      suggestedQuestions(parsePath(query.get('path')), parseMode(query.get('mode'))),
    )
    .post(
      '/assistant/ask',
      ({ db, body }) => {
        const input = (body ?? {}) as Partial<AssistantQuestion>;
        const question = input.question?.trim() ?? '';
        if (!question) throw badRequest('Wpisz pytanie.');
        if (question.length > MAX_QUESTION_LENGTH) {
          throw badRequest(`Pytanie może mieć najwyżej ${MAX_QUESTION_LENGTH} znaków.`);
        }
        return answerQuestion(
          { question, mode: parseMode(input.mode), ...(input.context ? { context: input.context } : {}) },
          db.now(),
        );
      },
      { ai: true },
    );
}
