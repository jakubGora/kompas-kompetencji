import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';
import type { DemoInfo, SessionInfo } from './api.types';

@Injectable({ providedIn: 'root' })
export class SessionApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  session(): Observable<SessionInfo> {
    return this.http.get<SessionInfo>(`${this.base}/session`);
  }

  demo(): Observable<DemoInfo> {
    return this.http.get<DemoInfo>(`${this.base}/demo`);
  }

  reset(): Observable<{ landing: string }> {
    return this.http.post<{ landing: string }>(`${this.base}/demo/reset`, {});
  }
}
