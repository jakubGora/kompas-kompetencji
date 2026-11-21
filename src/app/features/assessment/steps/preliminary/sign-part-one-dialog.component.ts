import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import type { AssessmentPath } from '@core/domain/assessment.model';
import { isAfter, isBefore, type IsoDate } from '@core/domain/date';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import type { EmployeeNoun } from '@shared/presentation/person-forms';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

export interface SignPartOneData {
  readonly path: AssessmentPath;
  readonly today: IsoDate;
  readonly dueDate: IsoDate;
  readonly noun: EmployeeNoun;
  readonly meetingDate?: IsoDate;
  readonly acknowledgedAt?: IsoDate;
}

export interface SignPartOneResult {
  readonly meetingDate: IsoDate;
  readonly acknowledgedAt: IsoDate;
}

@Component({
  selector: 'kp-sign-part-one-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ButtonComponent, FormField, FormFieldComponent, ControlDirective, KpDatePipe],
  template: `
    <kp-dialog-shell
      [heading]="data.path === 'first' ? 'Podpis ustaleń rozmowy wstępnej' : 'Podpis części I'"
      [description]="
        data.path === 'first'
          ? 'Podpis potwierdza rozmowę i termin złożenia sprawozdania (§ 4 ust. 3 rozporządzenia z 2015 r.).'
          : 'Podpis potwierdza zapoznanie z kryteriami, oczekiwaniami i terminem oceny (§ 6 rozporządzenia z 2016 r.).'
      "
      titleId="kp-sign-title"
    >
      <form class="kp-sign" id="kp-sign-form" (submit)="$event.preventDefault(); confirm()" novalidate>
        <kp-field label="Data rozmowy wstępnej" [field]="f.meetingDate" [hint]="'Termin rozmowy: ' + (data.dueDate | kpDate)">
          <input kpControl type="date" class="kp-input" [max]="data.today" [formField]="f.meetingDate" />
        </kp-field>
        <kp-field
          [label]="data.path === 'first' ? 'Data podpisu ' + data.noun.genitive : 'Data zapoznania ' + data.noun.genitive + ' z kryteriami'"
          [field]="f.acknowledgedAt"
          [hint]="data.path === 'first' ? undefined : 'Ta data rozpoczyna okres oceny („OD”).'"
        >
          <input kpControl type="date" class="kp-input" [max]="data.today" [formField]="f.acknowledgedAt" />
        </kp-field>
        <div class="kp-status-note">
          <p class="kp-status-note__title">Po podpisie</p>
          <p class="kp-status-note__text">
            Dane rozmowy zostaną zablokowane, kopia trafi do {{ data.noun.genitive }} i do akt, a podpis odnotujemy w historii oceny.
          </p>
        </div>
      </form>

      <ng-container dialogFooter>
        <button type="button" kpButton="secondary" (click)="ref.close()">Anuluj</button>
        <button type="submit" kpButton form="kp-sign-form">Odnotuj podpis i przejdź dalej</button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-sign {
      display: grid;
      gap: var(--kp-space-4);
    }
  `,
})
export class SignPartOneDialogComponent {
  protected readonly data = inject<SignPartOneData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<SignPartOneResult>>(DialogRef);

  private readonly model = signal({
    meetingDate: this.data.meetingDate ?? this.data.today,
    acknowledgedAt: this.data.acknowledgedAt ?? this.data.meetingDate ?? this.data.today,
  });

  protected readonly f = form(this.model, (p) => {
    required(p.meetingDate, { message: 'Podaj datę rozmowy wstępnej.' });
    required(p.acknowledgedAt, { message: 'Podaj datę podpisu.' });
    validate(p.meetingDate, ({ value }) =>
      value() && isAfter(value(), this.data.today) ? { kind: 'future', message: 'Data rozmowy nie może być z przyszłości.' } : null,
    );
    validate(p.acknowledgedAt, ({ value, valueOf }) => {
      if (!value()) return null;
      if (isAfter(value(), this.data.today)) return { kind: 'future', message: 'Data podpisu nie może być z przyszłości.' };
      return valueOf(p.meetingDate) && isBefore(value(), valueOf(p.meetingDate))
        ? { kind: 'order', message: 'Podpis nie może poprzedzać rozmowy.' }
        : null;
    });
  });

  protected async confirm(): Promise<void> {
    await submit(this.f, {
      action: async () => {
        const value = this.model();
        this.ref.close({ meetingDate: value.meetingDate, acknowledgedAt: value.acknowledgedAt });
        return undefined;
      },
    });
  }
}
