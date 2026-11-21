import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CasesApi } from '@core/api/cases.api';
import { PeopleApi } from '@core/api/people.api';
import type { AssessmentPath, CaseSummary } from '@core/domain/assessment.model';
import { addDays, formatDatePl, isAfter } from '@core/domain/date';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { SessionStore } from '@core/session/session.store';
import { KpScorePipe } from '@shared/pipes/format.pipes';
import { ATTENTION, OUTCOME_TONE, byUrgency, caseKindLabel, stepProgress } from '@shared/presentation/case-presentation';
import { downloadCsv } from '@shared/presentation/csv';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { DueChipComponent } from '@shared/ui/due-chip/due-chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { ProgressComponent } from '@shared/ui/progress/progress.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { StartCaseDialogComponent, type StartCaseDialogData } from '../start-case/start-case-dialog.component';

type StatusFilter = 'all' | 'uwaga' | 'w-toku' | 'zakonczona';

const START_HORIZON_DAYS = 90;

@Component({
  selector: 'kp-hr-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    DueChipComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    ProgressComponent,
    SkeletonComponent,
    KpScorePipe,
  ],
  templateUrl: './hr-dashboard.page.html',
  styleUrl: './hr-dashboard.page.scss',
})
export class HrDashboardPage {
  private readonly casesApi = inject(CasesApi);
  private readonly peopleApi = inject(PeopleApi);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly session = inject(SessionStore);

  protected readonly attentionInfo = ATTENTION;
  protected readonly outcomeTone = OUTCOME_TONE;
  protected readonly kindLabel = caseKindLabel;
  protected readonly progressOf = stepProgress;

  protected readonly cases = rxResource({ stream: () => this.casesApi.list('all') });
  protected readonly employees = rxResource({ stream: () => this.peopleApi.employees() });

  protected readonly query = signal('');
  protected readonly pathFilter = signal<AssessmentPath | 'all'>('all');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly unitFilter = signal('all');

  private readonly all = computed(() => (this.cases.hasValue() ? this.cases.value() : []));
  protected readonly active = computed(() => this.all().filter((c) => c.status === 'w-toku'));
  protected readonly needsAttention = computed(() =>
    this.active()
      .filter((c) => c.attention.length > 0)
      .sort(byUrgency),
  );
  protected readonly overdueCount = computed(() => this.active().filter((c) => c.attention.includes('po-terminie')).length);
  protected readonly completedThisYear = computed(() => {
    const year = this.session.today().slice(0, 4);
    return this.all().filter((c) => c.status === 'zakonczona' && c.completedAt?.startsWith(year)).length;
  });

  protected readonly toStart = computed(() => {
    if (!this.employees.hasValue()) return [];
    const horizon = addDays(this.session.today(), START_HORIZON_DAYS);
    return this.employees
      .value()
      .filter((employee) => !employee.activeCaseId && employee.nextAction?.dueDate && !isAfter(employee.nextAction.dueDate, horizon))
      .sort((a, b) => (a.nextAction?.dueDate ?? '').localeCompare(b.nextAction?.dueDate ?? ''));
  });

  protected readonly units = computed(() => [...new Set(this.all().map((c) => c.employee.orgUnitCode))].sort((a, b) => a.localeCompare(b, 'pl')));

  protected readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('pl');
    const path = this.pathFilter();
    const status = this.statusFilter();
    const unit = this.unitFilter();
    return this.all()
      .filter((c) => !query || `${c.employee.fullName} ${c.employee.positionTitle} ${c.evaluator.fullName}`.toLocaleLowerCase('pl').includes(query))
      .filter((c) => path === 'all' || c.path === path)
      .filter((c) => unit === 'all' || c.employee.orgUnitCode === unit)
      .filter((c) => {
        switch (status) {
          case 'uwaga':
            return c.status === 'w-toku' && c.attention.length > 0;
          case 'w-toku':
          case 'zakonczona':
            return c.status === status;
          default:
            return true;
        }
      })
      .sort(byUrgency);
  });
  protected readonly hasFilters = computed(
    () => this.query() !== '' || this.pathFilter() !== 'all' || this.statusFilter() !== 'all' || this.unitFilter() !== 'all',
  );

  constructor() {
    inject(BreadcrumbStore).set([{ label: 'Procesy ocen' }]);
  }

  protected setPath(value: string): void {
    this.pathFilter.set(value === 'periodic' || value === 'first' ? value : 'all');
  }

  protected setStatus(value: string): void {
    this.statusFilter.set(value === 'uwaga' || value === 'w-toku' || value === 'zakonczona' ? value : 'all');
  }

  protected clearFilters(): void {
    this.query.set('');
    this.pathFilter.set('all');
    this.statusFilter.set('all');
    this.unitFilter.set('all');
  }

  protected remind(summary: CaseSummary): void {
    void this.router.navigate(['/przypomnienia'], { queryParams: { sprawa: summary.id } });
  }

  protected openStart(employeeId?: string): void {
    const employees = this.employees.hasValue() ? this.employees.value() : [];
    const ref = this.dialog.open<CaseSummary, StartCaseDialogData, StartCaseDialogComponent>(StartCaseDialogComponent, {
      data: { employees, ...(employeeId ? { employeeId } : {}) },
      labelledBy: 'kp-start-title',
    });
    ref.closed.subscribe((summary) => {
      if (!summary) return;
      this.toast.success(`Uruchomiono ocenę: ${summary.employee.fullName}`, `Powiadomiliśmy oceniającego — ${summary.evaluator.fullName}.`);
      this.cases.reload();
      this.employees.reload();
    });
  }

  protected exportCsv(): void {
    const header = ['Pracownik', 'Stanowisko', 'Komórka', 'Rodzaj', 'Krok', 'Następna czynność', 'Termin czynności', 'Termin oceny', 'Oceniający', 'Alerty', 'Wynik'];
    const rows = this.filtered().map((c) => [
      c.employee.fullName,
      c.employee.positionTitle,
      c.employee.orgUnitCode,
      caseKindLabel(c),
      c.status === 'zakonczona' ? 'zakończona' : `${c.stepIndex}/${c.stepCount} ${c.currentStepLabel}`,
      c.nextActionLabel,
      c.nextActionDue ? formatDatePl(c.nextActionDue) : '',
      formatDatePl(c.dueDate),
      c.evaluator.fullName,
      c.attention.map((reason) => ATTENTION[reason].label).join(', '),
      c.outcome ?? '',
    ]);
    downloadCsv(this.document, `procesy-ocen-${this.session.today()}.csv`, [header, ...rows]);
    this.toast.info('Wyeksportowano CSV', `${rows.length} wierszy — bez treści obserwacji i uzasadnień.`);
  }
}
