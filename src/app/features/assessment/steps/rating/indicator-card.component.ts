import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { IndicatorAssessment, Observation } from '@core/domain/assessment.model';
import type { BehaviorLevel, Indicator } from '@core/domain/competency.model';
import { levelToPoints, type CriterionSuggestion } from '@core/domain/scoring';
import type { AssessmentPath } from '@core/domain/assessment.model';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { IconComponent } from '@shared/ui/icon/icon.component';

/** Wiersz siatki: zachowania × poziom + „nie miałem okazji”. */
@Component({
  selector: 'kp-indicator-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, KpDatePipe],
  templateUrl: './indicator-card.component.html',
  styleUrl: './indicator-card.component.scss',
})
export class IndicatorCardComponent {
  readonly indicator = input.required<Indicator>();
  readonly assessment = input.required<IndicatorAssessment>();
  readonly number = input.required<number>();
  readonly observations = input<readonly Observation[]>([]);
  readonly editable = input(false);
  readonly path = input<AssessmentPath>('periodic');
  readonly suggestion = input<CriterionSuggestion | null>(null);
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

  protected isAiSuggested(level: BehaviorLevel): boolean {
    const suggestion = this.suggestion();
    if (!suggestion || suggestion.points === null || this.assessment().noBasis) return false;
    if (this.assessment().level !== null && this.assessment().level !== level) return false;
    return levelToPoints(this.path(), level) === suggestion.points;
  }

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
