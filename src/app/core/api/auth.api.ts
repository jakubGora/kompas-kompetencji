import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';
import type { AuthAccountHint, LoginResult } from './api.types';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  login(login: string, password: string): Observable<LoginResult> {
    return this.http.post<LoginResult>(`${this.base}/auth/login`, { login, password });
  }

  logout(): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/auth/logout`, {});
  }

  me(): Observable<import('./api.types').SessionInfo> {
    return this.http.get<import('./api.types').SessionInfo>(`${this.base}/auth/me`);
  }

  accounts(): Observable<{ accounts: readonly AuthAccountHint[] }> {
    return this.http.get<{ accounts: readonly AuthAccountHint[] }>(`${this.base}/auth/accounts`);
  }
}
