import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AppNotification,
  ReminderCandidate,
  ReminderLogEntry,
  ReminderRule,
  ReminderRuleId,
} from '@core/domain/notification.model';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';
import type { ReminderSendResult } from './api.types';

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.base}/notifications`);
  }

  markRead(notificationId: string): Observable<AppNotification> {
    return this.http.post<AppNotification>(`${this.base}/notifications/${encodeURIComponent(notificationId)}/read`, {});
  }

  markAllRead(): Observable<unknown> {
    return this.http.post(`${this.base}/notifications/read-all`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class RemindersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reminders`;

  rules(): Observable<ReminderRule[]> {
    return this.http.get<ReminderRule[]>(`${this.base}/rules`);
  }

  updateRule(ruleId: ReminderRuleId, patch: Partial<Pick<ReminderRule, 'enabled' | 'daysBefore'>>): Observable<ReminderRule> {
    return this.http.put<ReminderRule>(`${this.base}/rules/${ruleId}`, patch);
  }

  candidates(): Observable<ReminderCandidate[]> {
    return this.http.get<ReminderCandidate[]>(`${this.base}/candidates`);
  }

  log(): Observable<ReminderLogEntry[]> {
    return this.http.get<ReminderLogEntry[]>(`${this.base}/log`);
  }

  send(candidateIds: readonly string[], note: string): Observable<ReminderSendResult> {
    return this.http.post<ReminderSendResult>(`${this.base}/send`, { candidateIds, note });
  }
}
