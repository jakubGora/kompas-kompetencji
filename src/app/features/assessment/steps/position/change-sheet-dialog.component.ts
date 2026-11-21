import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { FormVariant } from '@core/domain/assessment.model';
import { criterionName, mandatoryCriteriaFor } from '@core/domain/criteria';
import type { PositionAnalysis } from '@core/domain/position.model';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

export interface ChangeSheetData {
  readonly analysis?: PositionAnalysis;
  readonly variant?: FormVariant;
  readonly reason?: string;
}

export interface ChangeSheetResult {
  readonly variant: FormVariant;
  /** Pusty, gdy wybór zgadza się z rekomendacją asystenta. */
  readonly reason: string;
}

const SHEETS: readonly { readonly id: FormVariant; readonly title: string; readonly description: string }[] = [
  {
    id: 'B',
    title: 'Arkusz B',
    description: 'Stanowiska, na których osoba oceniana bezpośrednio kieruje pracą innych pracowników.',
  },
  {
    id: 'C',
    title: 'Arkusz C',
    description: 'Pozostałe stanowiska — bez bezpośredniego kierowania pracownikami.',
  },
];

@Component({
  selector: 'kp-change-sheet-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ButtonComponent, FormFieldComponent, ControlDirective, IconComponent],
  template: `
    <kp-dialog-shell
      heading="Zmień arkusz"
      description="Arkusz B dotyczy stanowisk z bezpośrednim kierowaniem pracownikami, arkusz C — pozostałych (§ 3 rozporządzenia z 2016 r.)."
      titleId="kp-sheet-title"
    >
      <div class="kp-sheet">
        @if (analysis; as result) {
          <section class="kp-sheet__recommendation" aria-labelledby="kp-sheet-recommendation">
            <p class="kp-sheet__recommendation-title" id="kp-sheet-recommendation">
              <kp-icon name="sparkles" [size]="16" /> Rekomendacja asystenta: arkusz {{ result.recommendedVariant }}
            </p>
            <p class="kp-sheet__recommendation-text">{{ result.variantRationale }}</p>
            @for (quote of result.variantEvidence; track $index) {
              <blockquote class="kp-quote">
                „{{ quote.text }}”
                <cite>{{ quote.location }}</cite>
              </blockquote>
            }
            <p class="kp-legal">{{ result.legalBasis }}</p>
          </section>
        }

        <fieldset class="kp-fieldset kp-sheet__options">
          <legend class="kp-visually-hidden">Arkusz oceny</legend>
          @for (sheet of sheets; track sheet.id) {
            <label class="kp-choice">
              <input type="radio" name="kp-sheet" [value]="sheet.id" [checked]="variant() === sheet.id" (change)="variant.set(sheet.id)" />
              <span class="kp-choice__body">
                <span class="kp-choice__title kp-sheet__option-title">
                  {{ sheet.title }}
                  @if (analysis?.recommendedVariant === sheet.id) {
                    <span class="kp-tag">Rekomendacja</span>
                  }
                </span>
                <span class="kp-choice__description">{{ sheet.description }}</span>
                <span class="kp-choice__description">Kryteria obowiązkowe: {{ mandatory(sheet.id) }}.</span>
              </span>
            </label>
          }
        </fieldset>

        @if (deviates()) {
          <kp-field
            label="Uzasadnienie wyboru innego arkusza"
            hint="Zapisze się w historii oceny jako świadome odstępstwo od rekomendacji."
            [required]="true"
          >
            <textarea kpControl class="kp-textarea" rows="3" [value]="reason()" (input)="setReason($event)"></textarea>
          </kp-field>
        }
      </div>

      <ng-container dialogFooter>
        <button type="button" kpButton="secondary" (click)="ref.close()">Anuluj</button>
        <button type="button" kpButton [disabled]="!canSave()" (click)="save()">Zapisz arkusz</button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-sheet {
      display: grid;
      gap: var(--kp-space-4);
    }
    .kp-sheet__recommendation {
      display: grid;
      gap: var(--kp-space-2);
      padding: var(--kp-space-4);
      border-radius: var(--kp-radius-md);
      background: var(--kp-color-surface-tint);
    }
    .kp-sheet__recommendation-title {
      display: flex;
      align-items: center;
      gap: var(--kp-space-1-5);
      margin: 0;
      color: var(--kp-color-primary);
      font-size: var(--kp-font-size-xs);
      font-weight: var(--kp-font-weight-medium);
    }
    .kp-sheet__recommendation-text {
      margin: 0;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-xs);
    }
    .kp-sheet__recommendation .kp-quote {
      background: var(--kp-color-surface);
    }
    .kp-sheet__recommendation .kp-legal {
      margin: 0;
    }
    .kp-sheet__options {
      display: grid;
      gap: var(--kp-space-2);
    }
    .kp-sheet__option-title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--kp-space-2);
    }
  `,
})
export class ChangeSheetDialogComponent {
  private readonly data = inject<ChangeSheetData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<ChangeSheetResult>>(DialogRef);

  protected readonly sheets = SHEETS;
  protected readonly analysis = this.data.analysis;
  protected readonly variant = signal<FormVariant | undefined>(this.data.variant ?? this.data.analysis?.recommendedVariant);
  protected readonly reason = signal(this.data.reason ?? '');

  protected readonly deviates = computed(() => {
    const recommended = this.analysis?.recommendedVariant;
    const chosen = this.variant();
    return Boolean(recommended && chosen && chosen !== recommended);
  });
  protected readonly canSave = computed(() => Boolean(this.variant()) && (!this.deviates() || this.reason().trim().length > 0));

  protected mandatory(variant: FormVariant): string {
    return mandatoryCriteriaFor('periodic', variant).map(criterionName).join(', ');
  }

  protected setReason(event: Event): void {
    this.reason.set((event.target as HTMLTextAreaElement).value);
  }

  protected save(): void {
    const variant = this.variant();
    if (!variant || !this.canSave()) return;
    this.ref.close({ variant, reason: this.deviates() ? this.reason().trim() : '' });
  }
}
