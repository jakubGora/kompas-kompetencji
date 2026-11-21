import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { IndicatorAssessment } from '@core/domain/assessment.model';
import { criterionName, criterionShortName, mandatoryCriteriaFor, type CriterionId } from '@core/domain/criteria';
import { levelToPoints } from '@core/domain/scoring';
import { ratingFor } from '@core/domain/workflow';
import { ReferenceStore } from '@core/reference/reference.store';
import { KpPluralPipe } from '@shared/pipes/format.pipes';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { map } from 'rxjs';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';
import { DecisionPanelComponent, type DecisionInput } from './decision-panel.component';
import { IndicatorCardComponent } from './indicator-card.component';

interface NavItem {
  readonly id: CriterionId;
  readonly name: string;
  readonly points: number | null;
  readonly answered: number;
  readonly total: number;
  readonly mandatory: boolean;
}

interface ScaleColumn {
  readonly points: number;
  readonly short: string;
}

@Component({
  selector: 'kp-rating-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StepFrameComponent,
    IndicatorCardComponent,
    DecisionPanelComponent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    RouterLink,
    KpPluralPipe,
  ],
  templateUrl: './rating-step.component.html',
  styleUrl: './rating-step.component.scss',
})
export class RatingStepComponent {
  protected readonly store = inject(CaseStore);
  private readonly reference = inject(ReferenceStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly requested = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('k'))), {
    initialValue: this.route.snapshot.queryParamMap.get('k'),
  });

  protected readonly c = computed(() => this.store.snapshot());
  protected readonly editable = computed(() => this.store.isEditable('ocena'));
  protected readonly criteria = this.store.criteria;
  private readonly mandatory = computed(
    () => new Set<string>(mandatoryCriteriaFor(this.c().path, this.c().positionReview.confirmedVariant)),
  );

  protected readonly selectedId = computed<CriterionId>(() => {
    const ids = this.criteria();
    const requested = ids.find((id) => id === this.requested());
    return requested ?? ids.find((id) => !ratingFor(this.c(), id)?.decision) ?? ids[0];
  });
  protected readonly index = computed(() => this.criteria().indexOf(this.selectedId()));
  protected readonly previousId = computed(() => this.criteria()[this.index() - 1] ?? null);
  protected readonly nextId = computed(() => this.criteria()[this.index() + 1] ?? null);
  protected readonly isMandatory = computed(() => this.mandatory().has(this.selectedId()));

  protected readonly indicators = computed(() => this.reference.indicatorsOf(this.selectedId()));
  protected readonly rating = computed(() => ratingFor(this.c(), this.selectedId()));
  protected readonly assessments = computed<IndicatorAssessment[]>(() =>
    this.indicators().map(
      (indicator) =>
        this.rating()?.indicators.find((item) => item.indicatorId === indicator.id) ?? {
          indicatorId: indicator.id,
          level: null,
          noBasis: false,
          observationIds: [],
        },
    ),
  );
  protected readonly suggestion = computed(() => this.store.suggestionFor(this.selectedId(), this.assessments()));
  protected readonly observations = computed(() =>
    this.c().observations.filter((observation) => observation.criterionIds.includes(this.selectedId())),
  );
  protected readonly taskNumbers = computed(() => {
    const ids = new Set(this.observations().map((observation) => observation.positionTaskId).filter(Boolean));
    return this.c()
      .position.tasks.filter((task) => ids.has(task.id))
      .map((task) => task.no)
      .join(', ');
  });

  protected readonly nav = computed<readonly NavItem[]>(() =>
    this.criteria().map((id) => {
      const rating = ratingFor(this.c(), id);
      return {
        id,
        name: criterionShortName(id),
        points: rating?.decision?.points ?? null,
        answered: rating?.indicators.filter((item) => item.level !== null || item.noBasis).length ?? 0,
        total: this.reference.indicatorsOf(id).length,
        mandatory: this.mandatory().has(id),
      };
    }),
  );
  protected readonly decidedCount = computed(() => this.nav().filter((item) => item.points !== null).length);
  protected readonly columns = computed<readonly ScaleColumn[]>(() => {
    const path = this.c().path;
    const behaviors = this.indicators()[0]?.behaviors ?? [];
    return behaviors.map((behavior) => {
      const points = levelToPoints(path, behavior.level_index);
      return { points, short: shortScaleLabel(points) };
    });
  });

  protected criterionName(id: string): string {
    return criterionName(id);
  }

  protected select(id: CriterionId): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { k: id }, replaceUrl: true });
  }

  protected onIndicator(next: IndicatorAssessment): void {
    const decision = this.rating()?.decision;
    this.store.updateRating(this.selectedId(), {
      indicators: this.assessments().map((item) => (item.indicatorId === next.indicatorId ? next : item)),
      decision: decision ? { points: decision.points, rationale: decision.rationale } : null,
    });
  }

  protected onDecision(decision: DecisionInput): void {
    this.store.updateRating(this.selectedId(), { indicators: this.assessments(), decision });
  }
}

function shortScaleLabel(points: number): string {
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
      return String(points);
  }
}
