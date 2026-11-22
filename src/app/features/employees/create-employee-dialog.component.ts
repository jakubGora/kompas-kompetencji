import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { PeopleApi, type CreateEmployeeRequest } from '@core/api/people.api';
import type { CivilServiceStatus, EmployeeListItem } from '@core/domain/people.model';
import { toApiError } from '@core/http/api-error';
import { SessionStore } from '@core/session/session.store';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'kp-create-employee-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, FormField, FormFieldComponent, ControlDirective, ButtonComponent, CalloutComponent],
  template: `
    <kp-dialog-shell
      heading="Dodaj pracownika"
      eyebrow="Zespół"
      description="Nowa osoba trafi do listy pracowników. Potem możesz uruchomić pierwszą ocenę albo ocenę okresową."
      titleId="kp-create-employee-title"
    >
      <form class="kp-create-employee" id="kp-create-employee-form" (submit)="$event.preventDefault(); save()" novalidate>
        <div class="kp-create-employee__row">
          <kp-field label="Imię" [field]="f.firstName">
            <input kpControl class="kp-input" type="text" autocomplete="given-name" [formField]="f.firstName" />
          </kp-field>
          <kp-field label="Nazwisko" [field]="f.lastName">
            <input kpControl class="kp-input" type="text" autocomplete="family-name" [formField]="f.lastName" />
          </kp-field>
        </div>

        <kp-field label="Stanowisko" [field]="f.positionId">
          <select kpControl class="kp-select" [formField]="f.positionId">
            <option value="">— wybierz stanowisko —</option>
            @for (position of positions(); track position.id) {
              <option [value]="position.id">{{ position.title }} · {{ position.code }} ({{ position.orgUnitName }})</option>
            }
          </select>
        </kp-field>

        @if (session.isHr()) {
          <kp-field label="Przełożony" [field]="f.supervisorId">
            <select kpControl class="kp-select" [formField]="f.supervisorId">
              <option value="">— wybierz przełożonego —</option>
              @for (manager of managers(); track manager.id) {
                <option [value]="manager.id">{{ manager.fullName }} · {{ manager.jobTitle }}</option>
              }
            </select>
          </kp-field>
        }

        <div class="kp-create-employee__row">
          <kp-field label="Status w służbie cywilnej" [field]="f.status">
            <select kpControl class="kp-select" [formField]="f.status">
              <option value="pracownik-sc">Pracownik służby cywilnej</option>
              <option value="urzednik-sc">Urzędnik służby cywilnej</option>
            </select>
          </kp-field>
          <kp-field label="Podstawa zatrudnienia" [field]="f.employmentBasis">
            <select kpControl class="kp-select" [formField]="f.employmentBasis">
              <option value="pierwsza-umowa">Pierwsza umowa (ścieżka pierwszej oceny)</option>
              <option value="czas-nieokreslony">Umowa na czas nieokreślony (ocena okresowa)</option>
            </select>
          </kp-field>
        </div>

        <kp-field label="Data zatrudnienia" [field]="f.employedSince">
          <input kpControl class="kp-input" type="date" [formField]="f.employedSince" />
        </kp-field>

        @if (error(); as message) {
          <kp-callout tone="danger" heading="Nie udało się dodać pracownika" [live]="true">{{ message }}</kp-callout>
        }
      </form>

      <ng-container dialogFooter>
        <button type="button" kpButton="ghost" (click)="ref.close()">Anuluj</button>
        <button type="submit" kpButton icon="plus" form="kp-create-employee-form" [loading]="saving()">Dodaj</button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-create-employee {
      display: grid;
      gap: var(--kp-space-4);
    }
    .kp-create-employee__row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--kp-space-3);
    }
    @media (max-width: 640px) {
      .kp-create-employee__row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class CreateEmployeeDialogComponent {
  private readonly api = inject(PeopleApi);
  protected readonly session = inject(SessionStore);
  protected readonly ref = inject<DialogRef<EmployeeListItem | undefined>>(DialogRef);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly positionsResource = rxResource({ stream: () => this.api.positions() });
  private readonly managersResource = rxResource({ stream: () => this.api.users('manager') });

  protected readonly positions = computed(() => (this.positionsResource.hasValue() ? this.positionsResource.value() : []));
  protected readonly managers = computed(() => (this.managersResource.hasValue() ? this.managersResource.value() : []));

  private readonly model = signal({
    firstName: '',
    lastName: '',
    positionId: '',
    supervisorId: '',
    status: 'pracownik-sc' as CivilServiceStatus,
    employmentBasis: 'pierwsza-umowa' as CreateEmployeeRequest['employmentBasis'],
    employedSince: '2026-01-15',
  });

  protected readonly f = form(this.model, (path) => {
    required(path.firstName, { message: 'Podaj imię.' });
    required(path.lastName, { message: 'Podaj nazwisko.' });
    required(path.positionId, { message: 'Wybierz stanowisko.' });
    required(path.employedSince, { message: 'Podaj datę zatrudnienia.' });
    if (this.session.isHr()) {
      required(path.supervisorId, { message: 'Wybierz przełożonego.' });
    }
  });

  protected async save(): Promise<void> {
    await submit(this.f, {
      action: async () => {
        if (this.saving()) return undefined;
        this.saving.set(true);
        this.error.set(null);
        try {
          const body: CreateEmployeeRequest = {
            firstName: this.f.firstName().value().trim(),
            lastName: this.f.lastName().value().trim(),
            positionId: this.f.positionId().value(),
            status: this.f.status().value(),
            employmentBasis: this.f.employmentBasis().value(),
            employedSince: this.f.employedSince().value(),
            ...(this.session.isHr() ? { supervisorId: this.f.supervisorId().value() } : {}),
          };
          this.ref.close(await firstValueFrom(this.api.createEmployee(body)));
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
