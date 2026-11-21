import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CasesApi } from '@core/api/cases.api';
import { toApiError } from '@core/http/api-error';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';

export interface AssignDocumentData {
  readonly caseId: string;
  readonly currentPositionId: string;
  readonly orgUnitName: string;
}

@Component({
  selector: 'kp-assign-document-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ButtonComponent, CalloutComponent, SkeletonComponent],
  template: `
    <kp-dialog-shell
      heading="Zmień przypisany dokument"
      [description]="'Opisy stanowisk z ewidencji komórki: ' + data.orgUnitName + '.'"
      titleId="kp-document-title"
    >
      <div class="kp-document">
        @if (options.isLoading()) {
          <div class="kp-document__options" role="status">
            <span class="kp-visually-hidden">Wczytywanie dokumentów…</span>
            @for (row of [1, 2, 3]; track row) {
              <kp-skeleton height="58px" radius="var(--kp-radius-md)" />
            }
          </div>
        } @else if (loadError(); as message) {
          <kp-callout tone="danger" heading="Nie udało się pobrać dokumentów">{{ message }}</kp-callout>
        } @else {
          <fieldset class="kp-fieldset kp-document__options">
            <legend class="kp-visually-hidden">Dokument OSP</legend>
            @for (option of options.value() ?? []; track option.id) {
              <label class="kp-choice kp-choice--compact">
                <input type="radio" name="kp-document" [value]="option.id" [checked]="selected() === option.id" (change)="selected.set(option.id)" />
                <span class="kp-choice__body">
                  <span class="kp-choice__title kp-document__title">
                    {{ option.documentName }}
                    @if (option.id === data.currentPositionId) {
                      <span class="kp-tag">Obecny</span>
                    }
                  </span>
                  <span class="kp-choice__description">
                    {{ option.title }} · {{ option.code }} · {{ option.fromOrganizer ? 'dokument z materiałów zadania' : 'dane demonstracyjne' }}
                  </span>
                </span>
              </label>
            }
          </fieldset>
          <p class="kp-legal">Po zmianie asystent przeanalizuje nowy OSP i ponownie zaproponuje arkusz. Wybór arkusza zostanie wyzerowany.</p>
        }
      </div>

      <ng-container dialogFooter>
        <button type="button" kpButton="secondary" (click)="ref.close()">Anuluj</button>
        <button type="button" kpButton [disabled]="!changed()" (click)="ref.close(selected())">Przypisz dokument</button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-document {
      display: grid;
      gap: var(--kp-space-3);
    }
    .kp-document__options {
      display: grid;
      gap: var(--kp-space-2);
    }
    .kp-document__title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--kp-space-2);
      overflow-wrap: anywhere;
    }
    .kp-legal {
      margin: 0;
    }
  `,
})
export class AssignDocumentDialogComponent {
  protected readonly data = inject<AssignDocumentData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  private readonly api = inject(CasesApi);

  protected readonly options = rxResource({ stream: () => this.api.positionOptions(this.data.caseId) });
  protected readonly loadError = computed(() => {
    const error = this.options.error();
    return error ? toApiError(error).message : null;
  });
  protected readonly selected = signal(this.data.currentPositionId);
  protected readonly changed = computed(() => this.selected() !== this.data.currentPositionId);
}
