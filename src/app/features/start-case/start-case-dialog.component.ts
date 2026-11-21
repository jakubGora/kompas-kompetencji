import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { CasesApi } from '@core/api/cases.api';
import type { CaseSummary } from '@core/domain/assessment.model';
import type { EmployeeListItem } from '@core/domain/people.model';
import { stepsFor } from '@core/domain/workflow';
import { toApiError } from '@core/http/api-error';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { PATH_LABEL } from '@shared/presentation/case-presentation';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { firstValueFrom } from 'rxjs';

export interface StartCaseDialogData {
  readonly employees: readonly EmployeeListItem[];
  readonly employeeId?: string;
}

const PATH_BASIS = {
  first: 'Pierwsza umowa na czas określony — pierwsza ocena przed upływem 12 miesięcy (art. 35 ust. 1 ustawy o służbie cywilnej).',
  periodic: 'Ocena okresowa co 24 miesiące od poprzedniej oceny (art. 81 ust. 1 ustawy o służbie cywilnej).',
} as const;

@Component({
  selector: 'kp-start-case-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, FormField, FormFieldComponent, ControlDirective, ButtonComponent, CalloutComponent, IconComponent, KpDatePipe],
  template: `
    <kp-dialog-shell
      heading="Uruchom ocenę"
      eyebrow="Kadry"
      description="Ocenę prowadzi bezpośredni przełożony. Po uruchomieniu dostanie powiadomienie z pierwszym krokiem i terminem."
      titleId="kp-start-title"
    >
      <form class="kp-start" id="kp-start-form" (submit)="$event.preventDefault(); start()" novalidate>
        <kp-field label="Pracownik" [field]="f.employeeId">
          <select kpControl class="kp-select" [formField]="f.employeeId">
            <option value="">— wybierz osobę —</option>
            @for (employee of available; track employee.id) {
              <option [value]="employee.id">{{ employee.fullName }} · {{ employee.positionTitle }}</option>
            }
          </select>
        </kp-field>

        @if (selected(); as employee) {
          <dl class="kp-dl kp-start__facts">
            <div>
              <dt>Ścieżka</dt>
              <dd><strong>{{ pathLabel[employee.suggestedPath] }}</strong></dd>
            </div>
            <div>
              <dt>Oceniający</dt>
              <dd>{{ employee.supervisor.fullName }}</dd>
            </div>
            <div>
              <dt>Komórka</dt>
              <dd>{{ employee.orgUnitName }}</dd>
            </div>
            <div>
              <dt>Poprzednia ocena</dt>
              <dd>
                @if (employee.previousAssessment; as previous) {
                  {{ previous.outcome }}, zapoznanie {{ previous.acknowledgedAt | kpDate }}
                } @else {
                  brak
                }
              </dd>
            </div>
          </dl>
          <p class="kp-legal">{{ pathBasis[employee.suggestedPath] }}</p>
          <ol class="kp-start__next">
            <li><kp-icon name="bell" [size]="16" /> Powiadomimy: {{ employee.supervisor.fullName }}</li>
            <li><kp-icon name="route" [size]="16" /> Pierwszy krok: {{ firstStep() }}</li>
            @if (employee.nextAction?.dueDate; as due) {
              <li><kp-icon name="calendar" [size]="16" /> Termin części I / rozmowy wstępnej: {{ due | kpDate }}</li>
            }
          </ol>
        }

        @if (available.length === 0) {
          <kp-callout tone="info">Wszyscy pracownicy mają już ocenę w toku.</kp-callout>
        }
        @if (error(); as message) {
          <kp-callout tone="danger" heading="Nie udało się uruchomić oceny" [live]="true">{{ message }}</kp-callout>
        }
      </form>

      <ng-container dialogFooter>
        <button type="button" kpButton="ghost" (click)="ref.close()">Anuluj</button>
        <button type="submit" kpButton icon="play" form="kp-start-form" [loading]="saving()">Uruchom ocenę</button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-start {
      display: grid;
      gap: var(--kp-space-4);
    }
    .kp-start__facts {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: var(--kp-space-4);
      border-radius: var(--kp-radius-md);
      background: var(--kp-color-surface-muted);
    }
    .kp-start__next {
      display: grid;
      gap: var(--kp-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--kp-font-size-sm);
    }
    .kp-start__next li {
      display: flex;
      align-items: center;
      gap: var(--kp-space-2);
    }
    .kp-start__next kp-icon {
      color: var(--kp-color-primary);
    }
  `,
})
export class StartCaseDialogComponent {
  private readonly data = inject<StartCaseDialogData>(DIALOG_DATA);
  private readonly api = inject(CasesApi);
  protected readonly ref = inject<DialogRef<CaseSummary>>(DialogRef);

  protected readonly pathLabel = PATH_LABEL;
  protected readonly pathBasis = PATH_BASIS;
  protected readonly available = this.data.employees.filter((employee) => !employee.activeCaseId);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly model = signal({
    employeeId: this.available.some((employee) => employee.id === this.data.employeeId) ? (this.data.employeeId ?? '') : '',
  });
  protected readonly f = form(this.model, (path) => {
    required(path.employeeId, { message: 'Wybierz pracownika.' });
  });

  protected readonly selected = computed(() => this.available.find((employee) => employee.id === this.f.employeeId().value()) ?? null);
  protected readonly firstStep = computed(() => {
    const employee = this.selected();
    return employee ? (stepsFor(employee.suggestedPath)[0]?.label ?? '') : '';
  });

  protected async start(): Promise<void> {
    await submit(this.f, {
      action: async () => {
        const employee = this.selected();
        if (!employee || this.saving()) return undefined;
        this.saving.set(true);
        this.error.set(null);
        try {
          this.ref.close(await firstValueFrom(this.api.start({ employeeId: employee.id, path: employee.suggestedPath })));
        } catch (error) {
          this.error.set(toApiError(error).message);
        } finally {
          this.saving.set(false);
        }
        return undefined;
      },
    });
  }
}
