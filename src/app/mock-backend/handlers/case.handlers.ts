import type { CaseScope } from '@core/api/api.types';
import type {
  AssessmentCasePatch,
  CaseDocument,
  CaseSummary,
  CriterionRating,
  DocumentKind,
  HistoryEvent,
  IndicatorAssessment,
  Observation,
  StartCaseRequest,
  StepId,
} from '@core/domain/assessment.model';
import type { BehaviorLevel } from '@core/domain/competency.model';
import { additionalCriteriaCandidates, criterionName, type CriterionId } from '@core/domain/criteria';
import { formatDatePl, isAfter, isBefore, isIsoDate, type IsoDate } from '@core/domain/date';
import { objectionDeadline } from '@core/domain/deadlines';
import type { AppNotification } from '@core/domain/notification.model';
import type { AppUser } from '@core/domain/people.model';
import type { PositionOption } from '@core/domain/position.model';
import { formatScore } from '@core/domain/result';
import { isValidPoints } from '@core/domain/scales';
import { suggestCriterionScore } from '@core/domain/scoring';
import {
  blockingIssues,
  caseCriteria,
  caseOutcome,
  caseResult,
  isStepCompleted,
  isStepReachable,
  stepDefinition,
  stepsFor,
  validateStep,
} from '@core/domain/workflow';
import { USERS } from '../data/org';
import { canSeeCase, presentCase, requireEditor, requireHr } from '../access';
import type { MockDb } from '../db';
import { buildConversationPlan, draftDevelopmentPlan, draftExpectations, draftJustification } from '../engine/assistant-engine';
import { createCase, historyEvent, personRef, type StoredCase } from '../engine/case-factory';
import { summarizeCase } from '../engine/case-summary';
import { analyzeObservation, type ObservationDraft } from '../engine/observation-analyzer';
import { analyzePosition } from '../engine/position-analyzer';
import { newId } from '../engine/text';
import { badRequest, conflict, forbidden, notFound, unprocessable } from '../http';
import type { MockRouter, RouteContext } from '../router';

/** Sekcja sprawy edytowana w danym kroku — po jego zakończeniu sekcja jest zablokowana. */
const SECTION_STEP: Readonly<Record<keyof AssessmentCasePatch, StepId>> = {
  positionReview: 'stanowisko',
  criteria: 'kryteria',
  preliminary: 'rozmowa-wstepna',
  preparatoryService: 'sluzba-przygotowawcza',
  report: 'sprawozdanie',
  review: 'rozmowa-oceniajaca',
  conclusion: 'podsumowanie',
};

/** Pola podsumowania, których zmiana unieważnia wygenerowany arkusz. */
const SHEET_CONTENT_FIELDS = ['justification', 'developmentPlan', 'promotionRequest', 'promotionJustification', 'draftedAt'] as const;

function stepLabel(c: StoredCase, stepId: StepId): string {
  return stepDefinition(c.path, stepId)?.label ?? stepId;
}

function loadCase(ctx: RouteContext): StoredCase {
  const c = ctx.db.findCase(ctx.params['caseId'] ?? '');
  if (!canSeeCase(c, ctx.user)) {
    throw forbidden('Ta ocena jest dostępna tylko dla oceniającego, kierującego komórką i kadr.');
  }
  return c;
}

function editableCase(ctx: RouteContext): StoredCase {
  const c = loadCase(ctx);
  requireEditor(c, ctx.user);
  return c;
}

function requireStepOpen(c: StoredCase, stepId: StepId): void {
  if (!stepsFor(c.path).some((step) => step.id === stepId)) {
    throw badRequest('Ten krok nie występuje w tej ścieżce oceny.');
  }
  if (!isStepReachable(c, stepId)) {
    throw conflict(`Najpierw zakończ wcześniejsze kroki — „${stepLabel(c, stepId)}” jest jeszcze niedostępny.`);
  }
  if (isStepCompleted(c, stepId)) {
    throw conflict(`Krok „${stepLabel(c, stepId)}” jest zakończony — zmiany są zablokowane.`);
  }
}

function visibleCases(db: MockDb, user: AppUser, scope: CaseScope): StoredCase[] {
  if (scope === 'all') {
    requireHr(user);
    return db.state.cases;
  }
  return db.state.cases.filter((c) => c.evaluator.id === user.id || c.headOfUnit?.id === user.id);
}

function notify(db: MockDb, notification: Omit<AppNotification, 'id' | 'createdAt'>): void {
  db.update((state) => ({
    ...state,
    notifications: [{ ...notification, id: newId('n'), createdAt: db.now() }, ...state.notifications],
  }));
}

function upsertDocument(c: StoredCase, kind: DocumentKind, title: string, status: CaseDocument['status'], at: string): CaseDocument[] {
  const existing = c.documents.find((doc) => doc.kind === kind);
  if (existing) {
    return c.documents.map((doc) =>
      doc.kind === kind ? { ...doc, title, status, createdAt: at, version: doc.version + 1 } : doc,
    );
  }
  return [...c.documents, { id: newId('doc'), kind, title, status, createdAt: at, version: 1 }];
}

// — Tworzenie sprawy —

function startCase(ctx: RouteContext): CaseSummary {
  const { db, user } = ctx;
  const request = (ctx.body ?? {}) as Partial<StartCaseRequest>;
  const employee = db.employee(request.employeeId ?? '');
  const isSupervisor = employee.supervisorId === user.id;
  if (!user.roles.includes('hr') && !isSupervisor) {
    throw forbidden('Ocenę uruchamiają kadry albo bezpośredni przełożony.');
  }
  const path = request.path === 'first' ? 'first' : 'periodic';
  if (path === 'first' && employee.employment.basis !== 'pierwsza-umowa') {
    throw unprocessable('Pierwsza ocena dotyczy osób zatrudnionych na pierwszą umowę na czas określony.');
  }
  if (db.state.cases.some((c) => c.employee.id === employee.id && c.status === 'w-toku')) {
    throw conflict(`${employee.fullName} ma już ocenę w toku.`);
  }
  const evaluator = db.user(employee.supervisorId);
  const unit = db.orgUnit(employee.orgUnitId);
  const headOfUnit = path === 'first' && unit.parentId ? USERS.find((candidate) => candidate.orgUnitId === unit.parentId) : undefined;
  const created = createCase({
    path,
    employee,
    position: db.position(employee.positionId),
    evaluator: personRef(evaluator),
    ...(headOfUnit ? { headOfUnit: personRef(headOfUnit) } : {}),
    orgUnitName: unit.name,
    createdAt: db.now(),
    createdBy: personRef(user),
  });
  const saved = db.saveCase(created);
  const firstStep = stepsFor(path)[0];
  notify(db, {
    recipientId: evaluator.id,
    kind: 'proces',
    title: `Uruchomiono ${path === 'first' ? 'pierwszą ocenę' : 'ocenę okresową'}: ${employee.fullName}`,
    body: `Pierwszy krok: ${firstStep?.label ?? ''}. Rozmowa wstępna do ${formatDatePl(saved.deadlines.preliminaryDueDate)}.`,
    caseId: saved.id,
    link: `/oceny/${saved.id}`,
    sender: personRef(user),
  });
  return summarizeCase(saved, db.state.today);
}

// — Dokument OSP przypisany do oceny —

function positionOptions(ctx: RouteContext): PositionOption[] {
  const c = editableCase(ctx);
  return ctx.db.positionsInUnit(c.position.orgUnitId).map((position) => ({
    id: position.id,
    code: position.code,
    title: position.title,
    documentName: position.documentName,
    fromOrganizer: position.fromOrganizer,
  }));
}

function assignPosition(ctx: RouteContext) {
  const { db, user } = ctx;
  const c = editableCase(ctx);
  requireStepOpen(c, 'stanowisko');
  const positionId = (ctx.body as { positionId?: unknown } | null)?.positionId;
  if (typeof positionId !== 'string') throw badRequest('Wskaż dokument OSP.');
  const position = db.position(positionId);
  if (position.orgUnitId !== c.position.orgUnitId) {
    throw unprocessable('Przypisz OSP stanowiska z komórki, w której pracuje oceniany.');
  }
  if (position.id === c.position.id) return presentCase(c, user);
  const now = db.now();
  const analysis = analyzePosition(position, now);
  return presentCase(
    db.saveCase({
      ...c,
      position,
      positionReview: { analysis },
      history: [
        ...c.history,
        historyEvent(
          now,
          personRef(user),
          'krok',
          `Zmieniono przypisany dokument: ${c.position.documentName} → ${position.documentName}. Asystent przeanalizował nowy OSP — rekomendacja: arkusz ${analysis.recommendedVariant}.`,
          'stanowisko',
        ),
      ],
    }),
    user,
  );
}

// — Autozapis sekcji —

function patchCase(ctx: RouteContext) {
  const { db, user } = ctx;
  const c = editableCase(ctx);
  const patch = (ctx.body ?? {}) as AssessmentCasePatch;
  let next: StoredCase = c;

  for (const section of Object.keys(patch) as (keyof AssessmentCasePatch)[]) {
    const stepId = SECTION_STEP[section];
    if (!stepId) throw badRequest(`Nieznana sekcja: ${section}.`);
    requireStepOpen(c, stepId);
  }

  if (patch.positionReview) {
    const positionReview = { ...next.positionReview, ...patch.positionReview };
    const variant = positionReview.confirmedVariant;
    const allowed = variant ? additionalCriteriaCandidates(variant) : null;
    next = {
      ...next,
      positionReview,
      criteria: allowed
        ? { ...next.criteria, additional: next.criteria.additional.filter((id) => allowed.includes(id)) }
        : next.criteria,
    };
  }
  if (patch.criteria) next = { ...next, criteria: { ...next.criteria, ...patch.criteria } };
  if (patch.preliminary) next = { ...next, preliminary: { ...next.preliminary, ...patch.preliminary } };
  if (patch.preparatoryService) next = { ...next, preparatoryService: { ...next.preparatoryService, ...patch.preparatoryService } };
  if (patch.report) next = { ...next, report: { ...next.report, ...patch.report } };
  if (patch.review) next = { ...next, review: { ...next.review, ...patch.review } };
  if (patch.conclusion) {
    if (next.conclusion.employeeAcknowledgedAt) {
      throw conflict('Oceniany zapoznał się już z oceną — treści arkusza nie można zmieniać.');
    }
    const conclusion = { ...next.conclusion, ...patch.conclusion };
    const contentChanged = SHEET_CONTENT_FIELDS.some((field) => patch.conclusion?.[field] !== undefined && patch.conclusion[field] !== next.conclusion[field]);
    if (contentChanged && next.conclusion.sheetGeneratedAt) {
      const { sheetGeneratedAt: _revoked, ...rest } = conclusion;
      next = {
        ...next,
        conclusion: rest,
        documents: next.documents.map((doc) =>
          doc.kind === 'arkusz-okresowy' || doc.kind === 'arkusz-pierwszej-oceny' ? { ...doc, status: 'szkic' } : doc,
        ),
        history: [
          ...next.history,
          historyEvent(db.now(), personRef(user), 'dokument', 'Zmieniono treść oceny po wygenerowaniu arkusza — arkusz wymaga ponownego wygenerowania.', 'podsumowanie'),
        ],
      };
    } else {
      next = { ...next, conclusion };
    }
  }
  return presentCase(db.saveCase(next), user);
}

// — Ukończenie kroku —

function completeStep(ctx: RouteContext) {
  const { db, user } = ctx;
  const c = editableCase(ctx);
  const stepId = ctx.params['stepId'] as StepId;
  requireStepOpen(c, stepId);
  const issues = validateStep(c, stepId);
  const blocking = blockingIssues(issues);
  if (blocking.length > 0) {
    throw unprocessable(`Nie można zakończyć kroku „${stepLabel(c, stepId)}”.`, blocking.map((issue) => issue.message));
  }

  const now = db.now();
  const actor = personRef(user);
  let next: StoredCase = { ...c, steps: { ...c.steps, [stepId]: { completedAt: now, completedById: user.id } } };
  const events: HistoryEvent[] = [];

  switch (stepId) {
    case 'stanowisko': {
      const variant = c.positionReview.confirmedVariant;
      const recommended = c.positionReview.analysis?.recommendedVariant;
      next = { ...next, positionReview: { ...next.positionReview, confirmedAt: now } };
      events.push(
        recommended && variant !== recommended
          ? historyEvent(now, actor, 'odstepstwo', `Zatwierdzono arkusz ${variant} wbrew rekomendacji (${recommended}): ${c.positionReview.overrideReason ?? ''}`, stepId)
          : historyEvent(now, actor, 'krok', `Zatwierdzono arkusz ${variant}${recommended ? ' zgodnie z rekomendacją asystenta' : ''}.`, stepId),
      );
      break;
    }
    case 'kryteria': {
      next = { ...next, criteria: { ...next.criteria, approvedAt: now } };
      const names = c.criteria.additional.map(criterionName).join(', ') || 'brak';
      events.push(historyEvent(now, actor, 'krok', `Zatwierdzono kryteria dodatkowe: ${names}.`, stepId));
      break;
    }
    case 'rozmowa-wstepna': {
      const title =
        c.path === 'first'
          ? 'Pierwsza ocena — ustalenia rozmowy wstępnej i termin sprawozdania'
          : `Arkusz ${c.positionReview.confirmedVariant ?? ''} — część I (kryteria i termin)`;
      next = { ...next, documents: upsertDocument(next, 'czesc-i', title, 'podpisany', now) };
      events.push(historyEvent(now, actor, 'krok', 'Zapisano rozmowę wstępną; oceniany potwierdził zapoznanie podpisem.', stepId));
      break;
    }
    case 'podsumowanie': {
      const outcome = caseOutcome(c);
      const result = caseResult(c);
      const mean = result.path === 'first' ? result.first.mean : result.periodic.mean;
      next = {
        ...next,
        status: 'zakonczona',
        documents: next.documents.map((doc) =>
          doc.kind === 'arkusz-okresowy' || doc.kind === 'arkusz-pierwszej-oceny' ? { ...doc, status: 'podpisany' } : doc,
        ),
      };
      events.push(historyEvent(now, actor, 'krok', `Ocena zakończona — ${outcome ?? 'brak wyniku'}${mean !== null ? ` (${formatScore(mean)})` : ''}.`, stepId));
      for (const hr of USERS.filter((candidate) => candidate.roles.includes('hr'))) {
        notify(db, {
          recipientId: hr.id,
          kind: 'proces',
          title: `Zakończono ocenę: ${c.employee.fullName}`,
          body: `Wynik: ${outcome ?? '—'}${mean !== null ? `, średnia ${formatScore(mean)}` : ''}. Arkusz podpisany — do akt osobowych.`,
          caseId: c.id,
          link: `/oceny/${c.id}/podsumowanie`,
          sender: actor,
        });
      }
      break;
    }
    default:
      events.push(historyEvent(now, actor, 'krok', `Zakończono krok „${stepLabel(c, stepId)}”.`, stepId));
  }

  next = { ...next, history: [...next.history, ...events] };
  return presentCase(db.saveCase(next), user);
}

// — Obserwacje —

type ObservationInput = Omit<Observation, 'id' | 'authorId' | 'createdAt' | 'updatedAt'>;

const OBSERVATION_LIMIT = 1200;

function parseObservation(body: unknown, c: StoredCase, today: IsoDate): ObservationInput {
  const input = (body ?? {}) as Partial<Record<keyof ObservationInput, unknown>>;
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const date = text(input.date);
  const issues: string[] = [];
  if (!isIsoDate(date)) issues.push('Podaj datę sytuacji.');
  else if (isAfter(date, today)) issues.push('Data obserwacji nie może być z przyszłości.');
  if (!text(input.title)) issues.push('Dodaj krótki tytuł obserwacji.');
  if (!text(input.description)) issues.push('Opisz zadanie i zachowanie osoby ocenianej.');
  else if (text(input.description).length > OBSERVATION_LIMIT) issues.push(`Opis może mieć najwyżej ${OBSERVATION_LIMIT} znaków.`);
  const criteria = caseCriteria(c);
  const criterionIds = (Array.isArray(input.criterionIds) ? input.criterionIds : []).filter(
    (id): id is CriterionId => criteria.includes(id as CriterionId),
  );
  if (criterionIds.length === 0) issues.push('Powiąż obserwację z co najmniej jednym kryterium.');
  if (issues.length > 0) throw unprocessable('Obserwacja wymaga uzupełnienia.', issues);
  const indicatorIds = (Array.isArray(input.indicatorIds) ? input.indicatorIds : []).filter(
    (id): id is string => typeof id === 'string' && criterionIds.some((criterionId) => id.startsWith(`${criterionId}-`)),
  );
  const taskId = text(input.positionTaskId);
  return {
    date,
    title: text(input.title),
    ...(taskId && c.position.tasks.some((task) => task.id === taskId) ? { positionTaskId: taskId } : {}),
    description: text(input.description),
    criterionIds,
    indicatorIds,
  };
}

function requireObservationsOpen(c: StoredCase): void {
  if (!isStepReachable(c, 'obserwacje')) {
    throw conflict('Obserwacje zbiera się od zapoznania ocenianego z kryteriami — najpierw zakończ wcześniejsze kroki.');
  }
  if (isStepCompleted(c, 'ocena')) {
    throw conflict('Oceny cząstkowe są zatwierdzone — obserwacji nie można już zmieniać.');
  }
}

// — Oceny cząstkowe —

interface RatingInput {
  readonly indicators?: readonly Partial<IndicatorAssessment>[];
  readonly decision?: { readonly points?: number; readonly rationale?: string } | null;
}

function saveRating(ctx: RouteContext): CriterionRating {
  const { db, user } = ctx;
  const c = editableCase(ctx);
  requireStepOpen(c, 'ocena');
  const criterionId = ctx.params['criterionId'] as CriterionId;
  if (!caseCriteria(c).includes(criterionId)) {
    throw badRequest('To kryterium nie należy do tej oceny.');
  }
  const input = (ctx.body ?? {}) as RatingInput;
  const observationIds = new Set(c.observations.map((o) => o.id));
  const indicators: IndicatorAssessment[] = (input.indicators ?? [])
    .filter((item) => typeof item.indicatorId === 'string' && item.indicatorId.startsWith(`${criterionId}-`))
    .map((item) => {
      const noBasis = item.noBasis === true;
      const level = !noBasis && typeof item.level === 'number' && item.level >= 1 && item.level <= 5 ? (item.level as BehaviorLevel) : null;
      return {
        indicatorId: item.indicatorId as string,
        level,
        noBasis,
        observationIds: (item.observationIds ?? []).filter((id) => observationIds.has(id)),
      };
    });

  const suggestion = suggestCriterionScore(c.path, indicators, db.indicatorCount(criterionId));
  const previous = c.ratings.find((rating) => rating.criterionId === criterionId);
  const now = db.now();
  let decision: CriterionRating['decision'] = null;
  if (input.decision && typeof input.decision.points === 'number') {
    const points = input.decision.points;
    if (!isValidPoints(c.path, points)) {
      throw unprocessable('Ocena spoza skali tej ścieżki.', [`Dozwolone wartości: ${c.path === 'first' ? '3, 5, 7' : '1, 3, 5, 7, 9'}.`]);
    }
    const unchanged = previous?.decision?.points === points;
    decision = {
      points,
      rationale: (input.decision.rationale ?? '').trim(),
      decidedAt: unchanged && previous?.decision ? previous.decision.decidedAt : now,
      decidedById: user.id,
      suggestedPoints: suggestion.points,
      suggestedAverage: suggestion.average,
    };
  }

  const rating: CriterionRating = { criterionId, indicators, decision };
  const history = [...c.history];
  if (decision && decision.points !== previous?.decision?.points) {
    const deviates = decision.suggestedPoints !== null && decision.points !== decision.suggestedPoints;
    history.push(
      historyEvent(
        now,
        personRef(user),
        deviates ? 'odstepstwo' : 'decyzja',
        deviates
          ? `${criterionName(criterionId)}: ${decision.points} pkt — odstępstwo od sugestii narzędzia (${decision.suggestedPoints} pkt).`
          : `${criterionName(criterionId)}: ${decision.points} pkt.`,
        'ocena',
      ),
    );
  }
  db.saveCase({
    ...c,
    ratings: previous ? c.ratings.map((item) => (item.criterionId === criterionId ? rating : item)) : [...c.ratings, rating],
    history,
  });
  return rating;
}

// — Dokumenty —

function generateDocument(ctx: RouteContext) {
  const { db, user } = ctx;
  const c = editableCase(ctx);
  const { kind } = (ctx.body ?? {}) as { kind?: DocumentKind };
  const now = db.now();
  const actor = personRef(user);

  if (kind === 'czesc-i') {
    requireStepOpen(c, 'rozmowa-wstepna');
    const title =
      c.path === 'first'
        ? 'Pierwsza ocena — ustalenia rozmowy wstępnej i termin sprawozdania'
        : `Arkusz ${c.positionReview.confirmedVariant ?? ''} — część I (kryteria i termin)`;
    const signed = Boolean(c.preliminary.employeeAcknowledgedAt);
    return presentCase(
      db.saveCase({
        ...c,
        documents: upsertDocument(c, kind, title, signed ? 'podpisany' : 'wygenerowany', now),
        history: [
          ...c.history,
          historyEvent(
            now,
            actor,
            'dokument',
            `${signed ? 'Zapisano podpisaną' : 'Wygenerowano'} ${title.charAt(0).toLowerCase()}${title.slice(1)}.`,
            'rozmowa-wstepna',
          ),
        ],
      }),
      user,
    );
  }

  if (kind === 'arkusz-okresowy' || kind === 'arkusz-pierwszej-oceny') {
    requireStepOpen(c, 'podsumowanie');
    const withDate: StoredCase = { ...c, conclusion: { ...c.conclusion, draftedAt: c.conclusion.draftedAt ?? db.state.today } };
    const issues = blockingIssues(validateStep(withDate, 'podsumowanie')).filter(
      (issue) => !issue.message.startsWith('Wygeneruj arkusz') && !issue.message.startsWith('Odnotuj datę zapoznania'),
    );
    if (issues.length > 0) {
      throw unprocessable('Uzupełnij podsumowanie przed wygenerowaniem arkusza.', issues.map((issue) => issue.message));
    }
    const title =
      kind === 'arkusz-okresowy'
        ? `Arkusz oceny okresowej ${c.positionReview.confirmedVariant ?? ''} — części I–III`
        : 'Arkusz pierwszej oceny';
    return presentCase(
      db.saveCase({
        ...withDate,
        conclusion: { ...withDate.conclusion, sheetGeneratedAt: now },
        documents: upsertDocument(withDate, kind, title, 'wygenerowany', now),
        history: [...c.history, historyEvent(now, actor, 'dokument', `Wygenerowano ${title.toLowerCase()} do podpisu.`, 'podsumowanie')],
      }),
      user,
    );
  }

  if (kind === 'zawiadomienie-o-terminie') {
    const pending = c.deadlines.extensions.filter((extension) => !extension.employeeNotifiedAt);
    if (pending.length === 0) throw conflict('Brak przedłużeń terminu wymagających zawiadomienia.');
    return presentCase(
      db.saveCase({
        ...c,
        deadlines: {
          ...c.deadlines,
          extensions: c.deadlines.extensions.map((extension) =>
            extension.employeeNotifiedAt ? extension : { ...extension, employeeNotifiedAt: db.state.today },
          ),
        },
        documents: upsertDocument(c, kind, 'Zawiadomienie o nowym terminie oceny (§ 8)', 'wygenerowany', now),
        history: [...c.history, historyEvent(now, actor, 'termin', `Zawiadomiono ocenianego o nowym terminie oceny: ${formatDatePl(c.deadlines.dueDate)}.`)],
      }),
      user,
    );
  }

  throw badRequest('Nieobsługiwany rodzaj dokumentu.');
}

function acknowledge(ctx: RouteContext) {
  const { db, user } = ctx;
  const c = editableCase(ctx);
  requireStepOpen(c, 'podsumowanie');
  const { date } = (ctx.body ?? {}) as { date?: string };
  if (!c.conclusion.sheetGeneratedAt) {
    throw conflict('Najpierw wygeneruj arkusz do podpisu.');
  }
  if (!date || !isIsoDate(date)) {
    throw unprocessable('Podaj datę zapoznania.', ['Data zapoznania jest wymagana.']);
  }
  if (isAfter(date, db.state.today) || (c.conclusion.draftedAt && isBefore(date, c.conclusion.draftedAt))) {
    throw unprocessable('Nieprawidłowa data zapoznania.', ['Data zapoznania musi przypadać między sporządzeniem oceny a dniem dzisiejszym.']);
  }
  const now = db.now();
  return presentCase(
    db.saveCase({
      ...c,
      conclusion: { ...c.conclusion, employeeAcknowledgedAt: date },
      history: [
        ...c.history,
        historyEvent(
          now,
          personRef(user),
          'zapoznanie',
          c.path === 'periodic'
            ? `Oceniany zapoznał się z oceną ${formatDatePl(date)} i otrzymał kopię. Termin na sprzeciw: ${formatDatePl(objectionDeadline(date))}.`
            : `Oceniany zapoznał się z pierwszą oceną ${formatDatePl(date)}.`,
          'podsumowanie',
        ),
      ],
    }),
    user,
  );
}

export function registerCaseRoutes(router: MockRouter): void {
  router
    .get('/cases', ({ db, user, query }) => {
      const scope: CaseScope = query.get('scope') === 'all' ? 'all' : 'mine';
      return visibleCases(db, user, scope).map((c) => summarizeCase(c, db.state.today));
    })
    .post('/cases', startCase)
    .get('/cases/:caseId', (ctx) => presentCase(loadCase(ctx), ctx.user))
    .patch('/cases/:caseId', patchCase)
    .post('/cases/:caseId/steps/:stepId/complete', completeStep)
    .post('/cases/:caseId/observations', (ctx) => {
      const c = editableCase(ctx);
      requireObservationsOpen(c);
      const input = parseObservation(ctx.body, c, ctx.db.state.today);
      const now = ctx.db.now();
      const observation: Observation = { ...input, id: newId('obs'), authorId: ctx.user.id, createdAt: now, updatedAt: now };
      return presentCase(
        ctx.db.saveCase({
          ...c,
          observations: [...c.observations, observation],
          history: [...c.history, historyEvent(now, personRef(ctx.user), 'obserwacja', `Dodano obserwację „${observation.title}” (${formatDatePl(observation.date)}).`, 'obserwacje')],
        }),
        ctx.user,
      );
    })
    .put('/cases/:caseId/observations/:observationId', (ctx) => {
      const c = editableCase(ctx);
      requireObservationsOpen(c);
      const existing = c.observations.find((o) => o.id === ctx.params['observationId']);
      if (!existing) throw notFound('obserwacja');
      const input = parseObservation(ctx.body, c, ctx.db.state.today);
      const updated: Observation = {
        id: existing.id,
        authorId: existing.authorId,
        createdAt: existing.createdAt,
        ...input,
        updatedAt: ctx.db.now(),
      };
      return presentCase(
        ctx.db.saveCase({ ...c, observations: c.observations.map((o) => (o.id === existing.id ? updated : o)) }),
        ctx.user,
      );
    })
    .delete('/cases/:caseId/observations/:observationId', (ctx) => {
      const c = editableCase(ctx);
      requireObservationsOpen(c);
      const existing = c.observations.find((o) => o.id === ctx.params['observationId']);
      if (!existing) throw notFound('obserwacja');
      return presentCase(
        ctx.db.saveCase({
          ...c,
          observations: c.observations.filter((o) => o.id !== existing.id),
          ratings: c.ratings.map((rating) => ({
            ...rating,
            indicators: rating.indicators.map((item) => ({
              ...item,
              observationIds: item.observationIds.filter((id) => id !== existing.id),
            })),
          })),
          history: [...c.history, historyEvent(ctx.db.now(), personRef(ctx.user), 'obserwacja', `Usunięto obserwację „${existing.title}”.`, 'obserwacje')],
        }),
        ctx.user,
      );
    })
    .post(
      '/cases/:caseId/observation-analysis',
      (ctx) => {
        const c = editableCase(ctx);
        const draft = (ctx.body ?? {}) as Partial<Record<keyof ObservationDraft, unknown>>;
        const text = (value: unknown) => (typeof value === 'string' ? value : '');
        if (!text(draft.description).trim()) throw badRequest('Opisz zadanie i zachowanie, aby asystent mógł zaproponować powiązania.');
        return analyzeObservation(
          { date: text(draft.date), title: text(draft.title), description: text(draft.description) },
          caseCriteria(c),
          c.position.tasks,
          ctx.db.now(),
        );
      },
      { ai: true },
    )
    .put('/cases/:caseId/ratings/:criterionId', saveRating)
    .post(
      '/cases/:caseId/position-analysis',
      (ctx) => {
        const c = editableCase(ctx);
        requireStepOpen(c, 'stanowisko');
        const now = ctx.db.now();
        const analysis = analyzePosition(c.position, now);
        return presentCase(
          ctx.db.saveCase({
            ...c,
            positionReview: { ...c.positionReview, analysis },
            history: [
              ...c.history,
              historyEvent(now, personRef(ctx.user), 'krok', `Asystent przeanalizował OSP — rekomendacja: arkusz ${analysis.recommendedVariant}, ${analysis.suggestions.length} propozycje kryteriów dodatkowych.`, 'stanowisko'),
            ],
          }),
          ctx.user,
        );
      },
      { ai: true },
    )
    .get('/cases/:caseId/position-options', positionOptions)
    .put('/cases/:caseId/position', assignPosition, { ai: true })
    .post('/cases/:caseId/documents', generateDocument)
    .post('/cases/:caseId/acknowledgement', acknowledge)
    .post(
      '/cases/:caseId/conversation-plan',
      (ctx) => {
        const c = editableCase(ctx);
        const now = ctx.db.now();
        const plan = buildConversationPlan(c, ctx.db.model, now);
        ctx.db.saveCase({
          ...c,
          review: { ...c.review, planGeneratedAt: now },
          documents: upsertDocument(c, 'plan-rozmowy', 'Plan rozmowy oceniającej (materiał roboczy)', 'szkic', now),
        });
        return plan;
      },
      { ai: true },
    )
    .post('/cases/:caseId/drafts/justification', (ctx) => draftJustification(editableCase(ctx), ctx.db.now()), { ai: true })
    .post('/cases/:caseId/drafts/development-plan', (ctx) => draftDevelopmentPlan(editableCase(ctx), ctx.db.now()), { ai: true })
    .post('/cases/:caseId/drafts/expectations', (ctx) => draftExpectations(editableCase(ctx), ctx.db.model), { ai: true });
}
