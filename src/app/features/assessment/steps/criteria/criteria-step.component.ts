import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAX_ADDITIONAL_CRITERIA, criterionName, mandatoryCriteriaFor, type CriterionId } from '@core/domain/criteria';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { firstValueFrom } from 'rxjs';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';
import { CriteriaPickerDialogComponent, type CriteriaPickerData, type CriteriaPickerResult } from './criteria-picker-dialog.component';

interface AdditionalRow {
  readonly id: CriterionId;
  readonly selected: boolean;
  readonly suggested: boolean;
}

@Component({
  selector: 'kp-criteria-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepFrameComponent, ButtonComponent],
  templateUrl: './criteria-step.component.html',
  styleUrl: './criteria-step.component.scss',
})
export class CriteriaStepComponent {
  protected readonly store = inject(CaseStore);
  private readonly dialogs = inject(DialogService);

  protected readonly max = MAX_ADDITIONAL_CRITERIA;

  protected readonly c = computed(() => this.store.snapshot());
  protected readonly editable = computed(() => this.store.isEditable('kryteria'));
  protected readonly variant = computed(() => this.c().positionReview.confirmedVariant ?? 'C');
  protected readonly mandatory = computed(() => mandatoryCriteriaFor('periodic', this.variant()));
  protected readonly selected = computed(() => this.c().criteria.additional);
  protected readonly rejected = computed(() => this.c().criteria.rejectedSuggestions);
  protected readonly limitReached = computed(() => this.selected().length >= MAX_ADDITIONAL_CRITERIA);

  private readonly suggestions = computed(() => {
    const mandatory = new Set<string>(this.mandatory());
    return (this.c().positionReview.analysis?.suggestions ?? []).filter((item) => !mandatory.has(item.criterionId));
  });

  /** Wybrane kryteria, a pod nimi propozycje asystenta czekające na decyzję (zaznacz albo odrzuć w „Edytuj”). */
  protected readonly rows = computed<readonly AdditionalRow[]>(() => {
    const suggested = new Set<string>(this.suggestions().map((item) => item.criterionId));
    const selected = this.selected().map((id) => ({ id, selected: true, suggested: suggested.has(id) }));
    const pending = this.editable()
      ? this.suggestions()
          .filter((item) => !this.selected().includes(item.criterionId) && !this.rejected().includes(item.criterionId))
          .map((item) => ({ id: item.criterionId, selected: false, suggested: true }))
      : [];
    return [...selected, ...pending];
  });

  protected name(id: string): string {
    return criterionName(id);
  }

  protected toggle(id: CriterionId, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked && !this.limitReached()) {
      this.store.patch({
        criteria: { additional: [...this.selected(), id], rejectedSuggestions: this.rejected().filter((item) => item !== id) },
      });
    } else if (!checked) {
      this.store.patch({ criteria: { additional: this.selected().filter((item) => item !== id) } });
    }
  }

  protected async openPicker(focusId?: CriterionId): Promise<void> {
    const ref = this.dialogs.open<CriteriaPickerResult, CriteriaPickerData, CriteriaPickerDialogComponent>(CriteriaPickerDialogComponent, {
      data: {
        variant: this.variant(),
        selected: this.selected(),
        rejected: this.rejected(),
        suggestions: this.suggestions(),
        ...(focusId ? { focusId } : {}),
      },
      width: '640px',
      labelledBy: 'kp-picker-title',
    });
    const result = await firstValueFrom(ref.closed);
    if (result) {
      this.store.patch({ criteria: { additional: result.additional, rejectedSuggestions: result.rejectedSuggestions } });
    }
  }
}
