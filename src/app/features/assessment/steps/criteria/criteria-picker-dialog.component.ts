import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal } from '@angular/core';
import type { FormVariant } from '@core/domain/assessment.model';
import { CRITERIA, MAX_ADDITIONAL_CRITERIA, additionalCriteriaCandidates, criterionName, type CriterionId } from '@core/domain/criteria';
import type { AdditionalCriterionSuggestion, Confidence } from '@core/domain/position.model';
import { ReferenceStore } from '@core/reference/reference.store';
import { KpPluralPipe } from '@shared/pipes/format.pipes';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

export interface CriteriaPickerData {
  readonly variant: FormVariant;
  readonly selected: readonly CriterionId[];
  readonly rejected: readonly CriterionId[];
  readonly suggestions: readonly AdditionalCriterionSuggestion[];
  /** Kryterium, od którego otwarto dialog („Edytuj”) — dostaje fokus. */
  readonly focusId?: CriterionId;
}

export interface CriteriaPickerResult {
  readonly additional: readonly CriterionId[];
  readonly rejectedSuggestions: readonly CriterionId[];
}

const CONFIDENCE: Readonly<Record<Confidence, string>> = {
  wysoka: 'Wysokie dopasowanie do OSP',
  srednia: 'Średnie dopasowanie do OSP',
  niska: 'Niskie dopasowanie do OSP',
};

@Component({
  selector: 'kp-criteria-picker-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ButtonComponent, IconComponent, KpPluralPipe],
  template: `
    <kp-dialog-shell
      heading="Kryteria dodatkowe"
      description="Wybierz najwyżej 3 kryteria najistotniejsze dla zadań na stanowisku (§ 5 ust. 2 rozporządzenia z 2016 r.)."
      titleId="kp-picker-title"
    >
      <div class="kp-picker">
        <p class="kp-picker__count" aria-live="polite">Wybrano {{ selected().length }} z {{ max }} możliwych</p>

        @if (suggestions.length > 0) {
          <section class="kp-picker__group" aria-labelledby="kp-picker-suggested">
            <h3 class="kp-picker__heading" id="kp-picker-suggested"><kp-icon name="sparkles" [size]="16" /> Propozycje asystenta z analizy OSP</h3>
            @for (item of suggestions; track item.criterionId) {
              <div class="kp-picker__item">
                <div class="kp-option" [class.kp-option--disabled]="isRejected(item.criterionId)">
                  <input
                    type="checkbox"
                    class="kp-check"
                    [id]="'kp-pick-' + item.criterionId"
                    [checked]="isSelected(item.criterionId)"
                    [disabled]="isBlocked(item.criterionId)"
                    (change)="toggle(item.criterionId, $event)"
                  />
                  <label class="kp-option__body" [for]="'kp-pick-' + item.criterionId">
                    <span class="kp-option__title">{{ name(item.criterionId) }}</span>
                    <span class="kp-option__text">{{ isRejected(item.criterionId) ? 'Propozycja odrzucona' : confidence[item.confidence] }}</span>
                  </label>
                  <span class="kp-option__aside">
                    @if (isRejected(item.criterionId)) {
                      <button type="button" class="kp-text-link kp-text-link--sm kp-text-link--plain" (click)="restore(item.criterionId)">Przywróć</button>
                    } @else if (!isSelected(item.criterionId)) {
                      <button type="button" class="kp-text-link kp-text-link--sm kp-text-link--plain" (click)="reject(item.criterionId)">Odrzuć</button>
                    }
                  </span>
                </div>
                <details class="kp-picker__why">
                  <summary>Dlaczego asystent to proponuje?</summary>
                  <p>{{ item.rationale }}</p>
                  @for (quote of item.evidence; track $index) {
                    <blockquote class="kp-quote">
                      „{{ quote.text }}”
                      <cite>{{ quote.location }}</cite>
                    </blockquote>
                  }
                </details>
              </div>
            }
          </section>
        }

        <section class="kp-picker__group" aria-labelledby="kp-picker-catalog">
          <h3 class="kp-picker__heading" id="kp-picker-catalog">Pozostałe kryteria z katalogu</h3>
          @for (id of catalog(); track id) {
            <div class="kp-option">
              <input
                type="checkbox"
                class="kp-check"
                [id]="'kp-pick-' + id"
                [checked]="isSelected(id)"
                [disabled]="isBlocked(id)"
                (change)="toggle(id, $event)"
              />
              <label class="kp-option__body" [for]="'kp-pick-' + id">
                <span class="kp-option__title">{{ name(id) }}</span>
                <span class="kp-option__text">
                  zał. nr 1, poz. {{ criteria[id].annexNo }} · {{ indicatorCount(id) | kpPlural: ['wskaźnik', 'wskaźniki', 'wskaźników'] }}
                </span>
              </label>
            </div>
          }
        </section>

        @if (limitReached()) {
          <p class="kp-legal" role="status">Osiągnięto limit {{ max }} kryteriów — odznacz jedno, aby wybrać inne.</p>
        }
      </div>

      <ng-container dialogFooter>
        <button type="button" kpButton="secondary" (click)="ref.close()">Anuluj</button>
        <button type="button" kpButton (click)="save()">Zapisz wybór</button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-picker {
      display: grid;
      gap: var(--kp-space-5);
    }
    .kp-picker__count {
      margin: 0;
      font-size: var(--kp-font-size-xs);
    }
    .kp-picker__group {
      display: grid;
      gap: var(--kp-space-2);
    }
    .kp-picker__heading {
      display: flex;
      align-items: center;
      gap: var(--kp-space-1-5);
      margin: 0 0 var(--kp-space-1);
      font-size: var(--kp-font-size-sm);
      font-weight: var(--kp-font-weight-medium);
    }
    .kp-picker__heading kp-icon {
      color: var(--kp-color-primary);
    }
    .kp-picker__item {
      display: grid;
      gap: var(--kp-space-1-5);
    }
    .kp-option__body {
      cursor: pointer;
    }
    .kp-picker__why {
      padding-inline: var(--kp-space-4);
      font-size: var(--kp-font-size-xs);
    }
    .kp-picker__why summary {
      width: fit-content;
      color: var(--kp-color-primary);
      font-size: var(--kp-font-size-2xs);
      font-weight: var(--kp-font-weight-medium);
      cursor: pointer;
    }
    .kp-picker__why p {
      margin: var(--kp-space-2) 0;
      color: var(--kp-color-text-muted);
    }
    .kp-picker__why .kp-quote + .kp-quote {
      margin-top: var(--kp-space-2);
    }
    .kp-legal {
      margin: 0;
    }
  `,
})
export class CriteriaPickerDialogComponent {
  private readonly data = inject<CriteriaPickerData>(DIALOG_DATA);
  private readonly reference = inject(ReferenceStore);
  protected readonly ref = inject<DialogRef<CriteriaPickerResult>>(DialogRef);

  protected readonly max = MAX_ADDITIONAL_CRITERIA;
  protected readonly criteria = CRITERIA;
  protected readonly confidence = CONFIDENCE;
  protected readonly suggestions = this.data.suggestions;
  protected readonly selected = signal<readonly CriterionId[]>(this.data.selected);
  protected readonly rejected = signal<readonly CriterionId[]>(this.data.rejected);
  protected readonly limitReached = computed(() => this.selected().length >= MAX_ADDITIONAL_CRITERIA);
  protected readonly catalog = computed(() => {
    const suggested = new Set<string>(this.suggestions.map((item) => item.criterionId));
    return additionalCriteriaCandidates(this.data.variant).filter((id) => !suggested.has(id));
  });

  constructor() {
    const focusId = this.data.focusId;
    if (focusId) {
      const host = inject<ElementRef<HTMLElement>>(ElementRef);
      afterNextRender(() => host.nativeElement.querySelector<HTMLInputElement>(`#kp-pick-${focusId}`)?.focus());
    }
  }

  protected name(id: string): string {
    return criterionName(id);
  }

  protected indicatorCount(id: string): number {
    return this.reference.indicatorsOf(id).length;
  }

  protected isSelected(id: CriterionId): boolean {
    return this.selected().includes(id);
  }

  protected isRejected(id: CriterionId): boolean {
    return this.rejected().includes(id);
  }

  protected isBlocked(id: CriterionId): boolean {
    return !this.isSelected(id) && (this.limitReached() || this.isRejected(id));
  }

  protected toggle(id: CriterionId, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selected.update((list) => (checked ? [...list.filter((item) => item !== id), id] : list.filter((item) => item !== id)));
  }

  protected reject(id: CriterionId): void {
    this.selected.update((list) => list.filter((item) => item !== id));
    this.rejected.update((list) => [...list.filter((item) => item !== id), id]);
  }

  protected restore(id: CriterionId): void {
    this.rejected.update((list) => list.filter((item) => item !== id));
  }

  protected save(): void {
    this.ref.close({ additional: this.selected(), rejectedSuggestions: this.rejected() });
  }
}
