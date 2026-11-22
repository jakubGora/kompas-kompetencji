import type { Routes } from '@angular/router';
import { CaseStore } from './data/case.store';
import { CaseRedirectComponent } from './workspace/case-redirect.component';
import { CaseWorkspaceComponent } from './workspace/case-workspace.component';
import { StepHeaderSlot } from './workspace/step-header-aside';

export default [
  {
    path: '',
    component: CaseWorkspaceComponent,
    providers: [CaseStore, StepHeaderSlot],
    children: [
      { path: '', pathMatch: 'full', component: CaseRedirectComponent },
      {
        path: 'stanowisko',
        data: { step: 'stanowisko' },
        loadComponent: () => import('./steps/position/position-step.component').then((m) => m.PositionStepComponent),
      },
      {
        path: 'kryteria',
        data: { step: 'kryteria' },
        loadComponent: () => import('./steps/criteria/criteria-step.component').then((m) => m.CriteriaStepComponent),
      },
      {
        path: 'rozmowa-wstepna',
        data: { step: 'rozmowa-wstepna' },
        loadComponent: () =>
          import('./steps/preliminary/preliminary-step.component').then((m) => m.PreliminaryStepComponent),
      },
      {
        path: 'sluzba-przygotowawcza',
        data: { step: 'sluzba-przygotowawcza' },
        loadComponent: () =>
          import('./steps/preparatory/preparatory-step.component').then((m) => m.PreparatoryStepComponent),
      },
      {
        path: 'obserwacje',
        data: { step: 'obserwacje' },
        loadComponent: () =>
          import('./steps/observations/observations-step.component').then((m) => m.ObservationsStepComponent),
      },
      {
        path: 'sprawozdanie',
        data: { step: 'sprawozdanie' },
        loadComponent: () => import('./steps/report/report-step.component').then((m) => m.ReportStepComponent),
      },
      {
        path: 'rozmowa-oceniajaca',
        data: { step: 'rozmowa-oceniajaca' },
        loadComponent: () => import('./steps/review/review-step.component').then((m) => m.ReviewStepComponent),
      },
      {
        path: 'ocena',
        data: { step: 'ocena' },
        loadComponent: () => import('./steps/rating/rating-step.component').then((m) => m.RatingStepComponent),
      },
      {
        path: 'ocena/przeglad',
        data: {
          step: 'ocena',
          view: 'Przegląd ocen cząstkowych',
          intro: 'Sprawdź komplet ocen cząstkowych i uzasadnienia odstępstw. Potem przejdź do części II.',
        },
        loadComponent: () => import('./steps/rating/rating-overview.component').then((m) => m.RatingOverviewComponent),
      },
      {
        path: 'podsumowanie',
        data: { step: 'podsumowanie' },
        loadComponent: () => import('./steps/summary/summary-step.component').then((m) => m.SummaryStepComponent),
      },
      {
        path: 'arkusz',
        data: { view: 'Arkusz oceny', intro: 'Podgląd arkusza w układzie A4 — ten sam dokument do druku i PDF.' },
        loadComponent: () => import('./documents/sheet-preview.component').then((m) => m.SheetPreviewComponent),
      },
      {
        path: 'historia',
        data: { view: 'Historia i dokumenty', intro: 'Wszystkie zdarzenia i dokumenty tej oceny w kolejności, w jakiej powstawały.' },
        loadComponent: () => import('./history/case-history.component').then((m) => m.CaseHistoryComponent),
      },
      { path: '**', redirectTo: '' },
    ],
  },
] satisfies Routes;
