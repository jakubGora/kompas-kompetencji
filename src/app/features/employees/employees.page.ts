import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PeopleApi } from '@core/api/people.api';
import type { CaseSummary } from '@core/domain/assessment.model';
import type { EmployeeListItem } from '@core/domain/people.model';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { OUTCOME_TONE, PATH_LABEL } from '@shared/presentation/case-presentation';
import { CIVIL_STATUS_LABEL } from '@shared/presentation/people-presentation';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { DueChipComponent } from '@shared/ui/due-chip/due-chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { CreateEmployeeDialogComponent } from './create-employee-dialog.component';
import { StartCaseDialogComponent, type StartCaseDialogData } from '../start-case/start-case-dialog.component';

type Scope = 'all' | 'active' | 'idle';

@Component({
  selector: 'kp-employees-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    DueChipComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    KpDatePipe,
  ],
  template: `
    <kp-page-header
      [eyebrow]="session.isHr() ? session.office()?.name : session.orgUnit()?.name"
      [heading]="title()"
      [description]="
        session.isHr()
          ? 'Kartoteka członków korpusu służby cywilnej z terminami kolejnych ocen.'
          : 'Osoby, których jesteś bezpośrednim przełożonym, i terminy ich ocen.'
      "
    >
      <button pageActions type="button" kpButton icon="plus" (click)="create()">Dodaj pracownika</button>
    </kp-page-header>

    @if (employees.isLoading() && !employees.hasValue()) {
      <kp-skeleton height="360px" radius="var(--kp-radius-lg)" />
    } @else if (employees.error()) {
      <div class="kp-card">
        <kp-empty-state icon="alert-circle" heading="Nie udało się wczytać listy pracowników">
          <button type="button" kpButton icon="reset" (click)="employees.reload()">Spróbuj ponownie</button>
        </kp-empty-state>
      </div>
    } @else {
      <section class="kp-card kp-card--flush" aria-labelledby="kp-employees-title">
        <div class="kp-employees__toolbar">
          <h2 class="kp-visually-hidden" id="kp-employees-title">{{ title() }}</h2>
          <label class="kp-input-group kp-employees__search">
            <kp-icon name="search" [size]="16" />
            <input
              class="kp-input kp-input--sm"
              type="search"
              placeholder="Szukaj po nazwisku lub stanowisku"
              aria-label="Szukaj pracownika"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          </label>
          <div class="kp-segmented" role="radiogroup" aria-label="Zakres listy">
            <label><input type="radio" name="kp-employees-scope" [checked]="scope() === 'all'" (change)="scope.set('all')" /> Wszyscy ({{ list().length }})</label>
            <label><input type="radio" name="kp-employees-scope" [checked]="scope() === 'active'" (change)="scope.set('active')" /> Z oceną w toku</label>
            <label><input type="radio" name="kp-employees-scope" [checked]="scope() === 'idle'" (change)="scope.set('idle')" /> Bez oceny w toku</label>
          </div>
        </div>

        @if (filtered().length === 0) {
          <kp-empty-state [compact]="true" icon="users" heading="Brak osób dla wybranych filtrów" />
        } @else {
          <div class="kp-employees__table-wrap">
            <table class="kp-table">
              <caption class="kp-visually-hidden">{{ title() }}</caption>
              <thead>
                <tr>
                  <th scope="col">Pracownik</th>
                  <th scope="col">Status</th>
                  @if (session.isHr()) {
                    <th scope="col">Przełożony</th>
                  }
                  <th scope="col">Poprzednia ocena</th>
                  <th scope="col">Najbliższa czynność</th>
                  <th scope="col"><span class="kp-visually-hidden">Akcje</span></th>
                </tr>
              </thead>
              <tbody>
                @for (employee of filtered(); track employee.id) {
                  <tr>
                    <td>
                      <div class="kp-employees__person">
                        <kp-avatar [name]="employee.fullName" [size]="36" />
                        <div>
                          <a class="kp-employees__name" [routerLink]="['/pracownicy', employee.id]">{{ employee.fullName }}</a>
                          <span class="kp-employees__meta">{{ employee.positionTitle }} · {{ employee.orgUnitCode }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="kp-employees__status">
                      {{ statusLabel[employee.status] }}
                      <span class="kp-employees__meta">od {{ employee.employedSince | kpDate }}</span>
                    </td>
                    @if (session.isHr()) {
                      <td class="kp-employees__nowrap">{{ employee.supervisor.fullName }}</td>
                    }
                    <td>
                      @if (employee.previousAssessment; as previous) {
                        <kp-badge [tone]="outcomeTone[previous.outcome]" [dot]="true">{{ previous.outcome }}</kp-badge>
                        <span class="kp-employees__meta">zapoznanie {{ previous.acknowledgedAt | kpDate }}</span>
                      } @else {
                        <span class="kp-muted">—</span>
                      }
                    </td>
                    <td>
                      @if (employee.nextAction; as next) {
                        <span class="kp-employees__next">{{ next.label }}</span>
                        @if (next.dueDate) {
                          <kp-due-chip [date]="next.dueDate" />
                        }
                      }
                    </td>
                    <td class="kp-employees__action">
                      @if (employee.activeCaseId) {
                        <a kpButton="secondary" size="sm" iconEnd="arrow-right" [routerLink]="['/oceny', employee.activeCaseId]">Ocena w toku</a>
                      } @else if (canStart(employee)) {
                        <button type="button" kpButton="ghost" size="sm" icon="play" (click)="start(employee)">
                          Uruchom {{ pathLabel[employee.suggestedPath].toLowerCase() }}
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
  styles: `
    .kp-employees__toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--kp-space-3);
      padding: var(--kp-space-4) var(--kp-space-5);
      border-bottom: 1px solid var(--kp-color-border-subtle);
    }
    .kp-employees__search {
      flex: 0 1 360px;
    }
    .kp-employees__table-wrap {
      overflow-x: auto;
    }
    .kp-employees__person {
      display: flex;
      align-items: center;
      gap: var(--kp-space-3);
    }
    .kp-employees__name {
      color: var(--kp-color-text);
      font-weight: var(--kp-font-weight-medium);
      text-decoration: none;
    }
    .kp-employees__name:hover {
      color: var(--kp-color-primary);
      text-decoration: underline;
    }
    .kp-employees__meta {
      display: block;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-employees__status {
      font-size: var(--kp-font-size-xs);
    }
    .kp-employees__next {
      display: block;
      margin-bottom: var(--kp-space-1);
      font-size: var(--kp-font-size-xs);
    }
    .kp-employees__nowrap {
      white-space: nowrap;
    }
    .kp-employees__action {
      text-align: end;
      white-space: nowrap;
    }
  `,
})
export class EmployeesPage {
  private readonly api = inject(PeopleApi);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionStore);

  protected readonly statusLabel = CIVIL_STATUS_LABEL;
  protected readonly outcomeTone = OUTCOME_TONE;
  protected readonly pathLabel = PATH_LABEL;

  protected readonly employees = rxResource({ stream: () => this.api.employees() });
  protected readonly query = signal('');
  protected readonly scope = signal<Scope>('all');

  protected readonly title = computed(() => (this.session.isHr() ? 'Pracownicy' : 'Mój zespół'));
  protected readonly list = computed(() => (this.employees.hasValue() ? this.employees.value() : []));
  protected readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('pl');
    const scope = this.scope();
    return this.list()
      .filter((employee) => !query || `${employee.fullName} ${employee.positionTitle}`.toLocaleLowerCase('pl').includes(query))
      .filter((employee) => scope === 'all' || (scope === 'active') === Boolean(employee.activeCaseId));
  });

  constructor() {
    inject(BreadcrumbStore).set([{ label: inject(SessionStore).isHr() ? 'Pracownicy' : 'Mój zespół' }]);
  }

  protected canStart(employee: EmployeeListItem): boolean {
    return this.session.isHr() || employee.supervisor.id === this.session.user()?.id;
  }

  protected create(): void {
    const ref = this.dialog.open<EmployeeListItem | undefined, undefined, CreateEmployeeDialogComponent>(
      CreateEmployeeDialogComponent,
      { labelledBy: 'kp-create-employee-title' },
    );
    ref.closed.subscribe((created) => {
      if (!created) return;
      this.toast.success(`Dodano: ${created.fullName}`, 'Możesz uruchomić ocenę z listy pracowników.');
      this.employees.reload();
    });
  }

  protected start(employee: EmployeeListItem): void {
    const ref = this.dialog.open<CaseSummary, StartCaseDialogData, StartCaseDialogComponent>(StartCaseDialogComponent, {
      data: { employees: this.list(), employeeId: employee.id },
      labelledBy: 'kp-start-title',
    });
    ref.closed.subscribe((summary) => {
      if (!summary) return;
      this.toast.success(`Uruchomiono ocenę: ${summary.employee.fullName}`, `Pierwszy krok: ${summary.currentStepLabel}.`);
      if (summary.evaluator.id === this.session.user()?.id) {
        void this.router.navigate(['/oceny', summary.id]);
      } else {
        this.employees.reload();
      }
    });
  }
}
