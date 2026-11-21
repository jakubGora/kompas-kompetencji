import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { AssessmentPath } from '@core/domain/assessment.model';
import type {
  AssistantAnswer,
  AssistantMode,
  AssistantQuestion,
  KnowledgeSource,
  SourceFragment,
  SuggestedQuestion,
} from '@core/domain/assistant.model';
import type { CompetencyModel } from '@core/domain/competency.model';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class KnowledgeApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  competencyModel(): Observable<CompetencyModel> {
    return this.http.get<CompetencyModel>(`${this.base}/reference/competency-model`);
  }

  sources(): Observable<KnowledgeSource[]> {
    return this.http.get<KnowledgeSource[]>(`${this.base}/knowledge/sources`);
  }

  fragments(filter: { readonly sourceId?: string; readonly q?: string } = {}): Observable<SourceFragment[]> {
    const params: Record<string, string> = {};
    if (filter.sourceId) params['sourceId'] = filter.sourceId;
    if (filter.q) params['q'] = filter.q;
    return this.http.get<SourceFragment[]>(`${this.base}/knowledge/fragments`, { params });
  }

  fragment(fragmentId: string): Observable<SourceFragment> {
    return this.http.get<SourceFragment>(`${this.base}/knowledge/fragments/${encodeURIComponent(fragmentId)}`);
  }

  suggestions(mode: AssistantMode, path?: AssessmentPath): Observable<SuggestedQuestion[]> {
    return this.http.get<SuggestedQuestion[]>(`${this.base}/assistant/suggestions`, {
      params: path ? { mode, path } : { mode },
    });
  }

  ask(question: AssistantQuestion): Observable<AssistantAnswer> {
    return this.http.post<AssistantAnswer>(`${this.base}/assistant/ask`, question);
  }
}
