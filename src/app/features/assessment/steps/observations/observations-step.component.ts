import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Observation } from '@core/domain/assessment.model';
import { criterionShortName } from '@core/domain/criteria';
import { formatDatePl } from '@core/domain/date';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { deadlineShift } from '@shared/presentation/deadline-presentation';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';
import { ObservationDialogComponent, type ObservationDialogData } from './observation-dialog.component';

@Component({
  selector: 'kp-observations-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepFrameComponent, ButtonComponent, CalloutComponent, EmptyStateComponent, KpDatePipe],
  templateUrl: './observations-step.component.html',
  styleUrl: './observations-step.component.scss',
})
export class ObservationsStepComponent {
  protected readonly store = inject(CaseStore);
  private readonly dialogs = inject(DialogService);

  protected readonly c = computed(() => this.store.snapshot());
  /** Obserwacje można dopisywać do zakończenia oceny kryteriów — także po zamknięciu tego kroku. */
  protected readonly editable = computed(
    () => this.store.canEdit() && this.store.isReachable('obserwacje') && !this.store.isCompleted('ocena'),
  );
  protected readonly deadlines = computed(() => this.c().deadlines);
  protected readonly shift = computed(() => deadlineShift(this.deadlines()));
  protected readonly deadlineText = computed(() => {
    const shift = this.shift();
    if (!shift) return `${this.deadlines().basis}.`;
    const absences =
      shift.absences.length === 1
        ? `Nieobecność usprawiedliwiona ${shift.absences[0]}.`
        : `Nieobecności usprawiedliwione: ${shift.absences.join('; ')}.`;
    return `${absences} Termin bazowy ${formatDatePl(shift.baseDueDate)} został przedłużony.`;
  });
  /** Początek okresu oceny („OD”) — data zapoznania z kryteriami. */
  protected readonly periodStart = computed(() => this.c().preliminary.employeeAcknowledgedAt ?? this.c().preliminary.meetingDate);
  protected readonly observations = computed(() => [...this.c().observations].sort((a, b) => a.date.localeCompare(b.date)));

  protected criteriaLabel(observation: Observation): string {
    return observation.criterionIds.map((id) => criterionShortName(id)).join(', ');
  }

  protected open(observation?: Observation): void {
    this.dialogs.open<boolean, ObservationDialogData>(ObservationDialogComponent, {
      data: { store: this.store, ...(observation ? { observation } : {}) },
      width: '344px',
      labelledBy: 'kp-observation-title',
    });
  }
}
