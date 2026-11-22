import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { PeopleApi } from '@core/api/people.api';
import type { EmployeeListItem, EmploymentBasis } from '@core/domain/people.model';
import { toApiError } from '@core/http/api-error';
import { EMPLOYMENT_BASIS_PATH, employmentBasisFor } from '@shared/presentation/people-presentation';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { firstValueFrom } from 'rxjs';

export interface EditEmploymentData {
  readonly employee: EmployeeListItem;
}

@Component({
  selector: 'kp-edit-employment-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, FormField, FormFieldComponent, ControlDirective, ButtonComponent, CalloutComponent],
  template: `
    <kp-dialog-shell
      heading="Rodzaj umowy"
      eyebrow="Kartoteka"
      [description]="'Umowa ' + data.employee.fullName + ' wskazuje, który formularz oceny uruchomi się następnym razem.'"
      titleId="kp-edit-employment-title"
    >
      <form class="kp-edit-employment" id="kp-edit-employment-form" (submit)="$event.preventDefault(); save()" novalidate>
        <kp-field label="Rodzaj umowy" [field]="f.employmentBasis">
          <select kpControl class="kp-select" [formField]="f.employmentBasis">
            <option value="pierwsza-umowa">Pierwsza umowa na czas określony</option>
            <option value="czas-nieokreslony">Umowa na czas nieokreślony</option>
          </select>
        </kp-field>
        <p class="kp-edit-employment__path">{{ pathHint() }}</p>

        <kp-field label="Data zatrudnienia" hint="Od tej daty liczy się termin kolejnej oceny." [field]="f.employedSince">
          <input kpControl class="kp-input" type="date" [formField]="f.employedSince" />
        </kp-field>

        @if (data.employee.activeCaseId) {
          <kp-callout tone="info" heading="Ocena w toku zostaje bez zmian">
            Trwający formularz ma ścieżkę z dnia uruchomienia. Nowa umowa obowiązuje od następnej oceny.
          </kp-callout>
        }

        @if (error(); as message) {
          <kp-callout tone="danger" heading="Nie udało się zapisać umowy" [live]="true">{{ message }}</kp-callout>
        }
      </form>

      <ng-container dialogFooter>
        <button type="button" kpButton="ghost" (click)="ref.close()">Anuluj</button>
        <button type="submit" kpButton icon="check-circle" form="kp-edit-employment-form" [loading]="saving()">Zapisz umowę</button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-edit-employment {
      display: grid;
      gap: var(--kp-space-4);
    }
    .kp-edit-employment__path {
      margin: calc(var(--kp-space-3) * -1) 0 0;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-sm);
    }
  `,
})
export class EditEmploymentDialogComponent {
  private readonly api = inject(PeopleApi);
  protected readonly data = inject<EditEmploymentData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<EmployeeListItem | undefined>>(DialogRef);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly model = signal({
    employmentBasis: employmentBasisFor(this.data.employee.suggestedPath) as EmploymentBasis,
    employedSince: this.data.employee.employedSince,
  });

  protected readonly f = form(this.model, (path) => {
    required(path.employmentBasis, { message: 'Wybierz rodzaj umowy.' });
    required(path.employedSince, { message: 'Podaj datę zatrudnienia.' });
  });

  protected pathHint(): string {
    const basis = this.f.employmentBasis().value();
    return basis === 'pierwsza-umowa' || basis === 'czas-nieokreslony' ? `Kolejna ocena: ${EMPLOYMENT_BASIS_PATH[basis]}.` : '';
  }

  protected async save(): Promise<void> {
    await submit(this.f, {
      action: async () => {
        if (this.saving()) return undefined;
        this.saving.set(true);
        this.error.set(null);
        try {
          const basis = this.f.employmentBasis().value();
          this.ref.close(
            await firstValueFrom(
              this.api.updateEmployment(this.data.employee.id, {
                employmentBasis: basis,
                employedSince: this.f.employedSince().value(),
              }),
            ),
          );
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
