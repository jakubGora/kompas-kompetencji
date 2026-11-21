import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { DialogShellComponent } from './dialog-shell.component';

export interface ConfirmOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly destructive?: boolean;
}

@Component({
  selector: 'kp-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ButtonComponent],
  template: `
    <kp-dialog-shell [heading]="data.title" titleId="kp-confirm-title">
      <p class="kp-confirm__message">{{ data.message }}</p>
      <ng-container dialogFooter>
        <button type="button" kpButton="secondary" (click)="ref.close(false)">{{ data.cancelLabel ?? 'Anuluj' }}</button>
        <button type="button" [kpButton]="data.destructive ? 'danger' : 'primary'" (click)="ref.close(true)">
          {{ data.confirmLabel ?? 'Potwierdź' }}
        </button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-confirm__message {
      margin: 0;
      color: var(--kp-color-text);
      line-height: var(--kp-line-height-base);
    }
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}
