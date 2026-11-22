import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PeopleApi } from '@core/api/people.api';
import type { CaseSummary } from '@core/domain/assessment.model';
import type { EmployeeListItem } from '@core/domain/people.model';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { SessionStore } from '@core/session/session.store';
import { toApiError } from '@core/http/api-error';
import { KpDatePipe, KpScorePipe } from '@shared/pipes/format.pipes';
import { ATTENTION, OUTCOME_TONE, PATH_LABEL, caseKindLabel } from '@shared/presentation/case-presentation';
import { CIVIL_STATUS_LABEL, EMPLOYMENT_BASIS_LABEL, employmentBasisFor } from '@shared/presentation/people-presentation';
import { EditEmploymentDialogComponent, type EditEmploymentData } from './edit-employment-dialog.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { DueChipComponent } from '@shared/ui/due-chip/due-chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageSkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { StartCaseDialogComponent, type StartCaseDialogData } from '../start-case/start-case-dialog.component';

@Component({
  selector: 'kp-employee-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    DueChipComponent,
    EmptyStateComponent,
    PageSkeletonComponent,
    KpDatePipe,
    KpScorePipe,
  ],
  templateUrl: './employee-detail.page.html',
  styleUrl: './employee-detail.page.scss',
})
export class EmployeeDetailPage {
  private readonly api = inject(PeopleApi);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly breadcrumbs = inject(BreadcrumbStore);
  protected readonly session = inject(SessionStore);

  readonly employeeId = input.required<string>();

  protected readonly statusLabel = CIVIL_STATUS_LABEL;
  protected readonly outcomeTone = OUTCOME_TONE;
  protected readonly attention = ATTENTION;
  protected readonly pathLabel = PATH_LABEL;
  protected readonly contractLabel = EMPLOYMENT_BASIS_LABEL;
  protected readonly contractOf = employmentBasisFor;
  protected readonly kindLabel = caseKindLabel;

  protected readonly detail = rxResource({
    params: () => this.employeeId(),
    stream: ({ params }) => this.api.employee(params),
  });
  protected readonly data = computed(() => (this.detail.hasValue() ? this.detail.value() : null));
  protected readonly errorStatus = computed(() => (this.detail.error() ? toApiError(this.detail.error()).status : null));
  protected readonly dominantTasks = computed(() => this.data()?.position.tasks.filter((task) => task.kind === 'dominujace') ?? []);
  protected readonly otherTasksCount = computed(() => (this.data()?.position.tasks.length ?? 0) - this.dominantTasks().length);
  protected readonly canEdit = computed(() => {
    const employee = this.data()?.employee;
    if (!employee) return false;
    return this.session.isHr() || employee.supervisor.id === this.session.user()?.id;
  });
  protected readonly canStart = computed(() => {
    const employee = this.data()?.employee;
    if (!employee || employee.activeCaseId) return false;
    return this.session.isHr() || employee.supervisor.id === this.session.user()?.id;
  });

  constructor() {
    effect(() => {
      const root = this.session.isHr() ? { label: 'Pracownicy', link: '/pracownicy' } : { label: 'Mój zespół', link: '/pracownicy' };
      this.breadcrumbs.set([root, { label: this.data()?.employee.fullName ?? 'Pracownik' }]);
    });
  }

  protected editEmployment(): void {
    const employee = this.data()?.employee;
    if (!employee) return;
    const ref = this.dialog.open<EmployeeListItem | undefined, EditEmploymentData, EditEmploymentDialogComponent>(
      EditEmploymentDialogComponent,
      { data: { employee }, labelledBy: 'kp-edit-employment-title' },
    );
    ref.closed.subscribe((updated) => {
      if (!updated) return;
      this.toast.success(`Zapisano umowę: ${updated.fullName}`, `${this.contractLabel[this.contractOf(updated.suggestedPath)]}. Kolejna ocena: ${this.pathLabel[updated.suggestedPath].toLowerCase()}.`);
      this.detail.reload();
    });
  }

  protected start(): void {
    const employee = this.data()?.employee;
    if (!employee) return;
    const ref = this.dialog.open<CaseSummary, StartCaseDialogData, StartCaseDialogComponent>(StartCaseDialogComponent, {
      data: { employees: [employee], employeeId: employee.id },
      labelledBy: 'kp-start-title',
    });
    ref.closed.subscribe((summary) => {
      if (!summary) return;
      this.toast.success(`Uruchomiono ocenę: ${summary.employee.fullName}`, `Pierwszy krok: ${summary.currentStepLabel}.`);
      if (summary.evaluator.id === this.session.user()?.id) {
        void this.router.navigate(['/oceny', summary.id]);
      } else {
        this.detail.reload();
      }
    });
  }
}
