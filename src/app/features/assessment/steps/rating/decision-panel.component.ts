import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { AssessmentPath, RatingDecision } from '@core/domain/assessment.model';
import { DEFAULT_SCORING_RULES, type CriterionSuggestion } from '@core/domain/scoring';
import { scaleFor, type ScorePoints } from '@core/domain/scales';
import { KpScorePipe } from '@shared/pipes/format.pipes';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';

export interface DecisionInput {
  readonly points: ScorePoints;
  readonly rationale: string;
}

/** Sugestia narzędzia (jawna reguła) obok decyzji oceniającego — wyraźnie rozdzielone. */
@Component({
  selector: 'kp-decision-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CalloutComponent, FormFieldComponent, ControlDirective, IconComponent, KpScorePipe],
  templateUrl: './decision-panel.component.html',
  styleUrl: './decision-panel.component.scss',
})
export class DecisionPanelComponent {
  readonly criterionId = input.required<string>();
  readonly path = input.required<AssessmentPath>();
  readonly suggestion = input.required<CriterionSuggestion>();
  readonly decision = input<RatingDecision | null>(null);
  readonly editable = input(false);
  readonly decided = output<DecisionInput>();

  protected readonly rules = DEFAULT_SCORING_RULES;
  protected readonly scale = computed(() => scaleFor(this.path()));
  protected readonly name = computed(() => `kp-decision-${this.criterionId()}`);
  protected readonly suggestedLabel = computed(
    () => this.scale().find((option) => option.points === this.suggestion().points)?.label ?? '',
  );
  protected readonly deviates = computed(() => {
    const decision = this.decision();
    const suggested = this.suggestion().points;
    return Boolean(decision && suggested !== null && decision.points !== suggested);
  });
  protected readonly rationaleError = computed(() =>
    this.deviates() && !this.decision()?.rationale.trim() ? 'Ocena różni się od sugestii — wpisz, dlaczego.' : null,
  );
  protected readonly mapping = computed(() =>
    this.path() === 'first'
      ? 'Poziomy zachowań 1–2 → 3 pkt, 3 → 5 pkt, 4–5 → 7 pkt. Średnia do 4 → 3 pkt, do 6 → 5 pkt, powyżej 6 → 7 pkt.'
      : 'Poziom zachowania n → 2n−1 pkt (1, 3, 5, 7, 9). Średnią przypisujemy do przedziałów jak w § 11 ust. 1 pkt 2: do 2, do 4, do 6, do 8, powyżej 8.',
  );

  protected shortLabel(points: ScorePoints): string {
    switch (points) {
      case 1:
        return 'Znacznie poniżej';
      case 3:
        return 'Poniżej';
      case 5:
        return 'Na poziomie';
      case 7:
        return 'Powyżej';
      case 9:
        return 'Znacznie powyżej';
      default:
        return '';
    }
  }

  protected choose(points: ScorePoints): void {
    this.decided.emit({ points, rationale: this.decision()?.rationale ?? '' });
  }

  protected acceptSuggestion(): void {
    const points = this.suggestion().points;
    if (points !== null) this.choose(points);
  }

  protected setRationale(event: Event): void {
    const decision = this.decision();
    if (!decision) return;
    this.decided.emit({ points: decision.points, rationale: (event.target as HTMLTextAreaElement).value });
  }
}
