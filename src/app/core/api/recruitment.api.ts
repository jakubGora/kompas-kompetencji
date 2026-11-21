import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Candidate, Recruitment } from '@core/domain/recruitment.model';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';
import type { CandidateDetail, CandidatePatch, RecruitmentDetail } from './api.types';

@Injectable({ providedIn: 'root' })
export class RecruitmentApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Observable<Recruitment[]> {
    return this.http.get<Recruitment[]>(`${this.base}/recruitments`);
  }

  get(recruitmentId: string): Observable<RecruitmentDetail> {
    return this.http.get<RecruitmentDetail>(`${this.base}/recruitments/${encodeURIComponent(recruitmentId)}`);
  }

  candidate(candidateId: string): Observable<CandidateDetail> {
    return this.http.get<CandidateDetail>(`${this.base}/candidates/${encodeURIComponent(candidateId)}`);
  }

  updateCandidate(candidateId: string, patch: CandidatePatch): Observable<Candidate> {
    return this.http.patch<Candidate>(`${this.base}/candidates/${encodeURIComponent(candidateId)}`, patch);
  }
}
