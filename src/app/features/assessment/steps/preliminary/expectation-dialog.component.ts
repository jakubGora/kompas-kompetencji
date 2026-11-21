import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

export interface ExpectationDialogData {
  readonly criterionName: string;
  readonly text: string;
  readonly drafted: boolean;
}

const MAX_LENGTH = 600;

@Component({
  selector: 'kp-expectation-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ButtonComponent, FormFieldComponent, ControlDirective],
  template: `
    <kp-dialog-shell
      [heading]="data.criterionName"
      description="Oczekiwanie co do sposobu spełniania kryterium (§ 5 ust. 1 pkt 3) — konkretnie i w odniesieniu do zadań z OSP."
      titleId="kp-expectation-title"
    >
      <kp-field
        label="Oczekiwanie"
        [hint]="data.drafted ? 'Szkic asystenta na podstawie opisów zachowań „na poziomie oczekiwań”. Dopasuj go do stanowiska.' : undefined"
      >
        <span fieldAside class="kp-legal kp-tabular">{{ text().length }} / {{ max }}</span>
        <textarea kpControl class="kp-textarea" rows="5" [maxLength]="max" [value]="text()" (input)="setText($event)"></textarea>
      </kp-field>

      <ng-container dialogFooter>
        <button type="button" kpButton="secondary" (click)="ref.close()">Anuluj</button>
        <button type="button" kpButton [disabled]="!valid()" (click)="ref.close(text().trim())">Zapisz oczekiwanie</button>
      </ng-container>
    </kp-dialog-shell>
  `,
})
export class ExpectationDialogComponent {
  protected readonly data = inject<ExpectationDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly max = MAX_LENGTH;
  protected readonly text = signal(this.data.text);
  protected readonly valid = computed(() => this.text().trim().length > 0);

  protected setText(event: Event): void {
    this.text.set((event.target as HTMLTextAreaElement).value);
  }
}
