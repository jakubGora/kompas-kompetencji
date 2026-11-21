import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { firstValueFrom } from 'rxjs';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';
import { AssignDocumentDialogComponent, type AssignDocumentData } from './assign-document-dialog.component';
import { ChangeSheetDialogComponent, type ChangeSheetData, type ChangeSheetResult } from './change-sheet-dialog.component';

const SUBORDINATES_LABEL: Readonly<Record<string, string>> = {
  brak: 'Brak podwładnych',
  '1-4': '1–4 podwładnych',
  '5-9': '5–9 podwładnych',
  '10-19': '10–19 podwładnych',
  '20+': '20 i więcej podwładnych',
};

@Component({
  selector: 'kp-position-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepFrameComponent, ButtonComponent],
  templateUrl: './position-step.component.html',
  styleUrl: './position-step.component.scss',
})
export class PositionStepComponent {
  protected readonly store = inject(CaseStore);
  private readonly dialogs = inject(DialogService);
  protected readonly subordinatesLabel = SUBORDINATES_LABEL;

  protected readonly c = computed(() => this.store.snapshot());
  protected readonly position = computed(() => this.c().position);
  protected readonly review = computed(() => this.c().positionReview);
  protected readonly analysis = computed(() => this.review().analysis);
  protected readonly editable = computed(() => this.store.isEditable('stanowisko'));
  protected readonly analyzing = computed(() => this.store.busy() === 'analysis');
  protected readonly dominant = computed(() => this.position().tasks.filter((task) => task.kind === 'dominujace'));
  protected readonly other = computed(() => this.position().tasks.filter((task) => task.kind === 'pozostale'));

  protected readonly variant = computed(() => this.review().confirmedVariant);
  protected readonly deviates = computed(() => {
    const recommended = this.analysis()?.recommendedVariant;
    const chosen = this.review().confirmedVariant;
    return Boolean(recommended && chosen && recommended !== chosen);
  });

  constructor() {
    // Przypisany OSP czyta asystent; jego rekomendacja to wybór wstępny, który oceniający zatwierdza albo zmienia.
    let requested = false;
    effect(() => {
      if (!this.editable() || this.store.busy()) return;
      const analysis = this.analysis();
      if (!analysis) {
        if (requested) return;
        requested = true;
        untracked(() => void this.store.analyzePosition());
      } else if (!this.review().confirmedVariant) {
        untracked(() => this.store.patch({ positionReview: { confirmedVariant: analysis.recommendedVariant } }));
      }
    });
  }

  protected async changeSheet(): Promise<void> {
    const analysis = this.analysis();
    const variant = this.variant();
    const reason = this.review().overrideReason;
    const ref = this.dialogs.open<ChangeSheetResult, ChangeSheetData, ChangeSheetDialogComponent>(ChangeSheetDialogComponent, {
      data: { ...(analysis ? { analysis } : {}), ...(variant ? { variant } : {}), ...(reason ? { reason } : {}) },
      width: '600px',
      labelledBy: 'kp-sheet-title',
    });
    const result = await firstValueFrom(ref.closed);
    if (result) {
      this.store.patch({ positionReview: { confirmedVariant: result.variant, overrideReason: result.reason } });
    }
  }

  protected async changeDocument(): Promise<void> {
    const c = this.c();
    const ref = this.dialogs.open<string, AssignDocumentData, AssignDocumentDialogComponent>(AssignDocumentDialogComponent, {
      data: { caseId: c.id, currentPositionId: c.position.id, orgUnitName: c.position.division },
      width: '600px',
      labelledBy: 'kp-document-title',
    });
    const positionId = await firstValueFrom(ref.closed);
    if (positionId) {
      await this.store.assignPosition(positionId);
    }
  }
}
