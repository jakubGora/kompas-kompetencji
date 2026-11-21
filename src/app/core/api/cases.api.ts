import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ConversationPlan, DraftText, ObservationAnalysis } from '@core/domain/assistant.model';
import type {
  AssessmentCase,
  AssessmentCasePatch,
  CaseSummary,
  CriterionRating,
  DocumentKind,
  Expectation,
  StartCaseRequest,
  StepId,
} from '@core/domain/assessment.model';
import type { CriterionId } from '@core/domain/criteria';
import type { IsoDate } from '@core/domain/date';
import type { PositionOption } from '@core/domain/position.model';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';
import type { CaseScope, ObservationDraftInput, ObservationInput, RatingInput } from './api.types';

@Injectable({ providedIn: 'root' })
export class CasesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/cases`;

  list(scope: CaseScope): Observable<CaseSummary[]> {
    return this.http.get<CaseSummary[]>(this.base, { params: { scope } });
  }

  get(caseId: string): Observable<AssessmentCase> {
    return this.http.get<AssessmentCase>(this.url(caseId));
  }

  start(request: StartCaseRequest): Observable<CaseSummary> {
    return this.http.post<CaseSummary>(this.base, request);
  }

  patch(caseId: string, patch: AssessmentCasePatch): Observable<AssessmentCase> {
    return this.http.patch<AssessmentCase>(this.url(caseId), patch);
  }

  completeStep(caseId: string, stepId: StepId): Observable<AssessmentCase> {
    return this.http.post<AssessmentCase>(this.url(caseId, `steps/${stepId}/complete`), {});
  }

  analyzePosition(caseId: string): Observable<AssessmentCase> {
    return this.http.post<AssessmentCase>(this.url(caseId, 'position-analysis'), {});
  }

  positionOptions(caseId: string): Observable<PositionOption[]> {
    return this.http.get<PositionOption[]>(this.url(caseId, 'position-options'));
  }

  /** Przypisuje inny dokument OSP; serwer od razu analizuje go ponownie i zeruje wybór arkusza. */
  assignPosition(caseId: string, positionId: string): Observable<AssessmentCase> {
    return this.http.put<AssessmentCase>(this.url(caseId, 'position'), { positionId });
  }

  addObservation(caseId: string, input: ObservationInput): Observable<AssessmentCase> {
    return this.http.post<AssessmentCase>(this.url(caseId, 'observations'), input);
  }

  updateObservation(caseId: string, observationId: string, input: ObservationInput): Observable<AssessmentCase> {
    return this.http.put<AssessmentCase>(this.url(caseId, `observations/${observationId}`), input);
  }

  deleteObservation(caseId: string, observationId: string): Observable<AssessmentCase> {
    return this.http.delete<AssessmentCase>(this.url(caseId, `observations/${observationId}`));
  }

  analyzeObservation(caseId: string, draft: ObservationDraftInput): Observable<ObservationAnalysis> {
    return this.http.post<ObservationAnalysis>(this.url(caseId, 'observation-analysis'), draft);
  }

  saveRating(caseId: string, criterionId: CriterionId, input: RatingInput): Observable<CriterionRating> {
    return this.http.put<CriterionRating>(this.url(caseId, `ratings/${criterionId}`), input);
  }

  generateDocument(caseId: string, kind: DocumentKind): Observable<AssessmentCase> {
    return this.http.post<AssessmentCase>(this.url(caseId, 'documents'), { kind });
  }

  acknowledge(caseId: string, date: IsoDate): Observable<AssessmentCase> {
    return this.http.post<AssessmentCase>(this.url(caseId, 'acknowledgement'), { date });
  }

  conversationPlan(caseId: string): Observable<ConversationPlan> {
    return this.http.post<ConversationPlan>(this.url(caseId, 'conversation-plan'), {});
  }

  draftJustification(caseId: string): Observable<DraftText> {
    return this.http.post<DraftText>(this.url(caseId, 'drafts/justification'), {});
  }

  draftDevelopmentPlan(caseId: string): Observable<DraftText> {
    return this.http.post<DraftText>(this.url(caseId, 'drafts/development-plan'), {});
  }

  draftExpectations(caseId: string): Observable<Expectation[]> {
    return this.http.post<Expectation[]>(this.url(caseId, 'drafts/expectations'), {});
  }

  private url(caseId: string, suffix?: string): string {
    const base = `${this.base}/${encodeURIComponent(caseId)}`;
    return suffix ? `${base}/${suffix}` : base;
  }
}
