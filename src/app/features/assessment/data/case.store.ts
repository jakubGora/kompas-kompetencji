import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { ObservationDraftInput, ObservationInput, RatingInput } from '@core/api/api.types';
import { CasesApi } from '@core/api/cases.api';
import type { ConversationPlan, DraftText, ObservationAnalysis } from '@core/domain/assistant.model';
import type {
  AssessmentCase,
  AssessmentCasePatch,
  CriterionRating,
  DocumentKind,
  Expectation,
  StepId,
} from '@core/domain/assessment.model';
import type { CriterionId } from '@core/domain/criteria';
import type { IsoDate } from '@core/domain/date';
import { suggestCriterionScore } from '@core/domain/scoring';
import {
  caseCriteria,
  caseResult,
  currentStepId,
  isStepCompleted,
  isStepReachable,
  stepDefinition,
  stepsFor,
  validateStep,
} from '@core/domain/workflow';
import { toApiError, type ApiError } from '@core/http/api-error';
import { ReferenceStore } from '@core/reference/reference.store';
import { SessionStore } from '@core/session/session.store';
import type { SaveState } from '@shared/ui/save-status/save-status.component';
import type { StepperItem } from '@shared/ui/stepper/stepper.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { firstValueFrom, type Observable } from 'rxjs';
import { applyPatch, isEmptyPatch, mergePatch } from './case-patch';

const AUTOSAVE_DELAY_MS = 700;
const RATING_SAVE_DELAY_MS = 500;

export type CaseOperation =
  | 'analysis'
  | 'document'
  | 'acknowledgement'
  | 'plan'
  | 'draft-justification'
  | 'draft-development'
  | 'draft-expectations'
  | 'observation';

export type CompletionResult = { readonly ok: true } | { readonly ok: false; readonly issues: readonly string[] };

/** Stan jednej sprawy oceny w przestrzeni roboczej (zakres: trasa `/oceny/:caseId`). */
@Injectable()
export class CaseStore {
  private readonly api = inject(CasesApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);
  private readonly reference = inject(ReferenceStore);

  private readonly caseId = signal<string | null>(null);
  private readonly resource = rxResource({
    params: () => this.caseId() ?? undefined,
    stream: ({ params }) => this.api.get(params),
  });

  readonly case = computed(() => (this.resource.hasValue() ? this.resource.value() : undefined));
  readonly loading = computed(() => this.resource.isLoading() && !this.resource.hasValue());
  readonly error = computed<ApiError | null>(() => {
    const error = this.resource.error();
    return error ? toApiError(error) : null;
  });

  readonly path = computed(() => this.case()?.path ?? 'periodic');
  readonly steps = computed(() => stepsFor(this.path()));
  readonly currentStepId = computed(() => {
    const c = this.case();
    return c ? currentStepId(c) : null;
  });
  readonly criteria = computed<readonly CriterionId[]>(() => {
    const c = this.case();
    return c ? caseCriteria(c) : [];
  });
  readonly result = computed(() => {
    const c = this.case();
    return c ? caseResult(c) : null;
  });
  readonly canEdit = computed(() => this.case()?.access.canEdit ?? false);
  readonly redacted = computed(() => this.case()?.access.redacted ?? false);
  readonly baseUrl = computed(() => `/oceny/${this.case()?.id ?? ''}`);

  readonly stepperItems = computed<readonly StepperItem[]>(() => {
    const c = this.case();
    if (!c) return [];
    const current = currentStepId(c);
    return stepsFor(c.path).map((step) => ({
      id: step.id,
      label: step.label,
      state: isStepCompleted(c, step.id) ? 'done' : step.id === current && c.status === 'w-toku' ? 'current' : 'upcoming',
      link: isStepReachable(c, step.id) ? `${this.baseUrl()}/${step.id}` : null,
    }));
  });

  readonly saveState = signal<SaveState>({ status: 'idle' });
  readonly busy = signal<CaseOperation | null>(null);
  readonly completing = signal<StepId | null>(null);
  /** Ostatni plan rozmowy z asystenta — żyje w pamięci przestrzeni roboczej, nie w aktach. */
  readonly plan = signal<ConversationPlan | null>(null);

  private pending: AssessmentCasePatch = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight: Promise<boolean> | null = null;
  private readonly ratingTimers = new Map<CriterionId, ReturnType<typeof setTimeout>>();
  private readonly ratingPending = new Map<CriterionId, RatingInput>();
  private ratingInflight: Promise<boolean> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      void this.flush();
      void this.flushRatings();
    });
  }

  load(caseId: string): void {
    if (this.caseId() !== caseId) {
      this.caseId.set(caseId);
    }
  }

  async refresh(): Promise<void> {
    await this.flushAll();
    this.resource.reload();
  }

  /** Bieżąca sprawa — kroki renderują się dopiero po jej wczytaniu. */
  snapshot(): AssessmentCase {
    const c = this.case();
    if (!c) throw new Error('Sprawa nie jest wczytana.');
    return c;
  }

  stepLabel(stepId: StepId): string {
    return stepDefinition(this.path(), stepId)?.label ?? stepId;
  }

  isCompleted(stepId: StepId): boolean {
    const c = this.case();
    return c ? isStepCompleted(c, stepId) : false;
  }

  isReachable(stepId: StepId): boolean {
    const c = this.case();
    return c ? isStepReachable(c, stepId) : false;
  }

  isEditable(stepId: StepId): boolean {
    return this.canEdit() && this.isReachable(stepId) && !this.isCompleted(stepId);
  }

  issues(stepId: StepId) {
    const c = this.case();
    return c ? validateStep(c, stepId) : [];
  }

  nextStepId(stepId: StepId): StepId | null {
    const steps = this.steps();
    const index = steps.findIndex((step) => step.id === stepId);
    return steps[index + 1]?.id ?? null;
  }

  previousStepId(stepId: StepId): StepId | null {
    const steps = this.steps();
    const index = steps.findIndex((step) => step.id === stepId);
    return index > 0 ? (steps[index - 1]?.id ?? null) : null;
  }

  // — Autozapis sekcji —

  patch(patch: AssessmentCasePatch): void {
    this.resource.update((c) => (c ? applyPatch(c, patch) : c));
    this.pending = mergePatch(this.pending, patch);
    this.saveState.set({ status: 'dirty' });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), AUTOSAVE_DELAY_MS);
  }

  async flush(): Promise<boolean> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.inflight) {
      await this.inflight;
    }
    const caseId = this.caseId();
    const patch = this.pending;
    if (!caseId || isEmptyPatch(patch)) {
      return this.saveState().status !== 'error';
    }
    this.pending = {};
    this.saveState.set({ status: 'saving' });
    this.inflight = firstValueFrom(this.api.patch(caseId, patch))
      .then((saved) => {
        this.resource.update((local) =>
          local
            ? {
                ...local,
                updatedAt: saved.updatedAt,
                documents: saved.documents,
                history: saved.history,
                criteria: this.pending.criteria ? local.criteria : saved.criteria,
                conclusion: { ...local.conclusion, sheetGeneratedAt: saved.conclusion.sheetGeneratedAt },
              }
            : local,
        );
        this.saveState.set({ status: isEmptyPatch(this.pending) ? 'saved' : 'dirty', savedAt: saved.updatedAt });
        return true;
      })
      .catch((error: unknown) => {
        this.pending = mergePatch(patch, this.pending);
        this.saveState.set({ status: 'error' });
        this.toast.error('Nie zapisano zmian', toApiError(error).message);
        return false;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  // — Oceny cząstkowe —

  /** Sugestia narzędzia dla bieżących zaznaczeń — ta sama reguła co po stronie serwera. */
  suggestionFor(criterionId: CriterionId, indicators: RatingInput['indicators']) {
    return suggestCriterionScore(this.path(), indicators, this.reference.indicatorsOf(criterionId).length);
  }

  updateRating(criterionId: CriterionId, input: RatingInput): void {
    const suggestion = this.suggestionFor(criterionId, input.indicators);
    const userId = this.session.user()?.id ?? '';
    this.resource.update((c) => {
      if (!c) return c;
      const previous = c.ratings.find((rating) => rating.criterionId === criterionId);
      const rating: CriterionRating = {
        criterionId,
        indicators: input.indicators,
        decision: input.decision
          ? {
              points: input.decision.points,
              rationale: input.decision.rationale,
              decidedAt: previous?.decision?.decidedAt ?? c.updatedAt,
              decidedById: userId,
              suggestedPoints: suggestion.points,
              suggestedAverage: suggestion.average,
            }
          : null,
      };
      return {
        ...c,
        ratings: previous
          ? c.ratings.map((item) => (item.criterionId === criterionId ? rating : item))
          : [...c.ratings, rating],
      };
    });
    this.ratingPending.set(criterionId, input);
    this.saveState.set({ status: 'dirty' });
    const timer = this.ratingTimers.get(criterionId);
    if (timer) clearTimeout(timer);
    this.ratingTimers.set(
      criterionId,
      setTimeout(() => void this.flushRatings(), RATING_SAVE_DELAY_MS),
    );
  }

  async flushRatings(): Promise<boolean> {
    this.ratingTimers.forEach((timer) => clearTimeout(timer));
    this.ratingTimers.clear();
    if (this.ratingInflight) {
      await this.ratingInflight;
    }
    const caseId = this.caseId();
    if (!caseId || this.ratingPending.size === 0) return true;
    const batch = [...this.ratingPending.entries()];
    this.ratingPending.clear();
    this.saveState.set({ status: 'saving' });
    this.ratingInflight = Promise.all(
      batch.map(async ([criterionId, input]) => {
        const saved = await firstValueFrom(this.api.saveRating(caseId, criterionId, input));
        if (!this.ratingPending.has(criterionId)) {
          this.resource.update((c) =>
            c ? { ...c, ratings: c.ratings.map((item) => (item.criterionId === criterionId ? saved : item)) } : c,
          );
        }
        return saved;
      }),
    )
      .then((saved) => {
        this.saveState.set({ status: 'saved', savedAt: saved.at(-1)?.decision?.decidedAt ?? this.case()?.updatedAt });
        return true;
      })
      .catch((error: unknown) => {
        for (const [criterionId, input] of batch) {
          if (!this.ratingPending.has(criterionId)) this.ratingPending.set(criterionId, input);
        }
        this.saveState.set({ status: 'error' });
        this.toast.error('Nie zapisano oceny cząstkowej', toApiError(error).message);
        return false;
      })
      .finally(() => {
        this.ratingInflight = null;
      });
    return this.ratingInflight;
  }

  async flushAll(): Promise<boolean> {
    const [sections, ratings] = await Promise.all([this.flush(), this.flushRatings()]);
    return sections && ratings;
  }

  retrySave(): void {
    void this.flushAll();
  }

  // — Kroki —

  async completeStep(stepId: StepId): Promise<CompletionResult> {
    if (!(await this.flushAll())) {
      return { ok: false, issues: ['Ostatnie zmiany nie zostały zapisane — spróbuj ponownie.'] };
    }
    this.completing.set(stepId);
    try {
      this.resource.set(await firstValueFrom(this.api.completeStep(this.snapshot().id, stepId)));
      return { ok: true };
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status !== 422) {
        this.toast.error('Nie udało się zakończyć kroku', apiError.message);
      }
      return { ok: false, issues: apiError.issues.length > 0 ? apiError.issues : [apiError.message] };
    } finally {
      this.completing.set(null);
    }
  }

  // — Operacje zwracające całą sprawę —

  analyzePosition(): Promise<ApiError | null> {
    return this.run('analysis', () => this.api.analyzePosition(this.snapshot().id));
  }

  assignPosition(positionId: string): Promise<ApiError | null> {
    return this.run(
      'analysis',
      () => this.api.assignPosition(this.snapshot().id, positionId),
      'Przypisano nowy dokument — asystent ponownie zaproponował arkusz.',
    );
  }

  generateDocument(kind: DocumentKind): Promise<ApiError | null> {
    return this.run('document', () => this.api.generateDocument(this.snapshot().id, kind));
  }

  acknowledge(date: IsoDate): Promise<ApiError | null> {
    return this.run('acknowledgement', () => this.api.acknowledge(this.snapshot().id, date), 'Odnotowano zapoznanie z oceną.');
  }

  addObservation(input: ObservationInput): Promise<ApiError | null> {
    return this.run('observation', () => this.api.addObservation(this.snapshot().id, input), 'Dodano obserwację.', false);
  }

  updateObservation(observationId: string, input: ObservationInput): Promise<ApiError | null> {
    return this.run('observation', () => this.api.updateObservation(this.snapshot().id, observationId, input), 'Zapisano obserwację.', false);
  }

  deleteObservation(observationId: string): Promise<ApiError | null> {
    return this.run('observation', () => this.api.deleteObservation(this.snapshot().id, observationId), 'Usunięto obserwację.');
  }

  // — Asystent (odpowiedzi nie zmieniają sprawy) —

  analyzeObservation(draft: ObservationDraftInput): Promise<ObservationAnalysis> {
    return firstValueFrom(this.api.analyzeObservation(this.snapshot().id, draft));
  }

  async conversationPlan(): Promise<ConversationPlan | null> {
    const plan = await this.ask('plan', () => this.api.conversationPlan(this.snapshot().id));
    if (plan) {
      this.plan.set(plan);
      await this.refresh();
    }
    return plan;
  }

  draftJustification(): Promise<DraftText | null> {
    return this.ask('draft-justification', () => this.api.draftJustification(this.snapshot().id));
  }

  draftDevelopmentPlan(): Promise<DraftText | null> {
    return this.ask('draft-development', () => this.api.draftDevelopmentPlan(this.snapshot().id));
  }

  draftExpectations(): Promise<Expectation[] | null> {
    return this.ask('draft-expectations', () => this.api.draftExpectations(this.snapshot().id));
  }

  private async run(
    operation: CaseOperation,
    request: () => Observable<AssessmentCase>,
    success?: string,
    toastOnError = true,
  ): Promise<ApiError | null> {
    if (!(await this.flushAll())) {
      return { status: -1, message: 'Ostatnie zmiany nie zostały zapisane.', issues: [] };
    }
    this.busy.set(operation);
    try {
      this.resource.set(await firstValueFrom(request()));
      if (success) this.toast.success(success);
      return null;
    } catch (error) {
      const apiError = toApiError(error);
      if (toastOnError) {
        this.toast.error(apiError.message, apiError.issues.join(' '));
      }
      return apiError;
    } finally {
      this.busy.set(null);
    }
  }

  private async ask<T>(operation: CaseOperation, request: () => Observable<T>): Promise<T | null> {
    await this.flushAll();
    this.busy.set(operation);
    try {
      return await firstValueFrom(request());
    } catch (error) {
      this.toast.error('Asystent nie odpowiedział', toApiError(error).message);
      return null;
    } finally {
      this.busy.set(null);
    }
  }
}
