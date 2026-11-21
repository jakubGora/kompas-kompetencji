import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { EmployeeListItem, PersonRef, UserRole } from '@core/domain/people.model';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';
import type { EmployeeDetail } from './api.types';

@Injectable({ providedIn: 'root' })
export class PeopleApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  employees(): Observable<EmployeeListItem[]> {
    return this.http.get<EmployeeListItem[]>(`${this.base}/employees`);
  }

  employee(employeeId: string): Observable<EmployeeDetail> {
    return this.http.get<EmployeeDetail>(`${this.base}/employees/${encodeURIComponent(employeeId)}`);
  }

  users(role?: UserRole): Observable<PersonRef[]> {
    return this.http.get<PersonRef[]>(`${this.base}/users`, { params: role ? { role } : {} });
  }
}
