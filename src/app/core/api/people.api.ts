import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CivilServiceStatus, EmployeeListItem, PersonRef, UserRole } from '@core/domain/people.model';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';
import type { EmployeeDetail } from './api.types';

export interface PositionOption {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly orgUnitId: string;
  readonly orgUnitName: string;
}

export interface CreateEmployeeRequest {
  readonly firstName: string;
  readonly lastName: string;
  readonly positionId: string;
  readonly status: CivilServiceStatus;
  readonly employmentBasis: 'pierwsza-umowa' | 'czas-nieokreslony';
  readonly employedSince: string;
  readonly supervisorId?: string;
}

@Injectable({ providedIn: 'root' })
export class PeopleApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  employees(): Observable<EmployeeListItem[]> {
    return this.http.get<EmployeeListItem[]>(`${this.base}/employees`);
  }

  createEmployee(body: CreateEmployeeRequest): Observable<EmployeeListItem> {
    return this.http.post<EmployeeListItem>(`${this.base}/employees`, body);
  }

  employee(employeeId: string): Observable<EmployeeDetail> {
    return this.http.get<EmployeeDetail>(`${this.base}/employees/${encodeURIComponent(employeeId)}`);
  }

  positions(): Observable<PositionOption[]> {
    return this.http.get<PositionOption[]>(`${this.base}/positions`);
  }

  users(role?: UserRole): Observable<PersonRef[]> {
    return this.http.get<PersonRef[]>(`${this.base}/users`, { params: role ? { role } : {} });
  }
}
