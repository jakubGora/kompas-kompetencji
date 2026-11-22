import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { IndicatorAssessment, Observation } from '@core/domain/assessment.model';
import type { BehaviorLevel, Indicator } from '@core/domain/competency.model';
import { KpDatePipe } from '@shared/pipes/format.pipes';

/** Wiersz siatki: zachowania × poziom + „nie miałem okazji”. Sugestia punktowa jest przy skali, nie przy opisie. */
@Component({
  selector: 'kp-indicator-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KpDatePipe],
  templateUrl: './indicator-card.component.html',
  styleUrl: './indicator-card.component.scss',
})
export class IndicatorCardComponent {
  readonly indicator = input.required<Indicator>();
  readonly assessment = input.required<IndicatorAssessment>();
  readonly number = input.required<number>();
  readonly observations = input<readonly Observation[]>([]);
  readonly editable = input(false);
  readonly changed = output<IndicatorAssessment>();

  protected readonly name = computed(() => `kp-indicator-${this.indicator().id}`);
  protected readonly answered = computed(() => this.assessment().level !== null || this.assessment().noBasis);
  protected readonly evidence = computed(() =>
    [...this.observations()]
      .filter((observation) => observation.indicatorIds.includes(this.indicator().id) || observation.criterionIds.length > 0)
      .sort((a, b) => {
        const aMatch = a.indicatorIds.includes(this.indicator().id) ? 0 : 1;
        const bMatch = b.indicatorIds.includes(this.indicator().id) ? 0 : 1;
        return aMatch - bMatch || b.date.localeCompare(a.date);
      }),
  );

  protected selectLevel(level: BehaviorLevel): void {
    const current = this.assessment();
    this.changed.emit({
      ...current,
      level,
      noBasis: false,
      observationIds: current.observationIds.length > 0 ? current.observationIds : this.suggestedEvidence(),
    });
  }

  protected selectNoBasis(): void {
    this.changed.emit({ ...this.assessment(), level: null, noBasis: true });
  }

  protected clear(): void {
    this.changed.emit({ ...this.assessment(), level: null, noBasis: false });
  }

  private suggestedEvidence(): string[] {
    return this.observations()
      .filter((observation) => observation.indicatorIds.includes(this.indicator().id))
      .map((observation) => observation.id);
  }
}
