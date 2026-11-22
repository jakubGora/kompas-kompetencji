import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/session/auth.guard';
import { roleGuard } from '@core/session/role.guard';
import { SessionStore } from '@core/session/session.store';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'logowanie',
    title: 'Logowanie',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(SessionStore).homeUrl() },
      {
        path: 'procesy',
        title: 'Procesy ocen',
        canActivate: [roleGuard('hr')],
        loadComponent: () => import('./features/hr-dashboard/hr-dashboard.page').then((m) => m.HrDashboardPage),
      },
      {
        path: 'moje-oceny',
        title: 'Moje oceny',
        canActivate: [roleGuard('manager')],
        loadComponent: () => import('./features/my-assessments/my-assessments.page').then((m) => m.MyAssessmentsPage),
      },
      {
        path: 'oceny/:caseId',
        loadChildren: () => import('./features/assessment/assessment.routes'),
      },
      {
        path: 'pracownicy',
        title: 'Pracownicy',
        loadComponent: () => import('./features/employees/employees.page').then((m) => m.EmployeesPage),
      },
      {
        path: 'pracownicy/:employeeId',
        title: 'Pracownik',
        loadComponent: () => import('./features/employees/employee-detail.page').then((m) => m.EmployeeDetailPage),
      },
      {
        path: 'przypomnienia',
        title: 'Przypomnienia',
        canActivate: [roleGuard('hr')],
        loadComponent: () => import('./features/reminders/reminders.page').then((m) => m.RemindersPage),
      },
      { path: 'rekrutacje', pathMatch: 'full', redirectTo: 'pracownicy' },
      { path: 'rekrutacje/kandydaci/:candidateId', redirectTo: 'pracownicy' },
      {
        path: 'baza-wiedzy',
        title: 'Baza wiedzy',
        loadComponent: () => import('./features/knowledge/knowledge.page').then((m) => m.KnowledgePage),
      },
      {
        path: 'brak-dostepu',
        title: 'Brak dostępu',
        loadComponent: () => import('./features/system/forbidden.page').then((m) => m.ForbiddenPage),
      },
      {
        path: '**',
        title: 'Nie znaleziono strony',
        loadComponent: () => import('./features/system/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
