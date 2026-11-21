import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { criterionName, mandatoryCriteriaFor } from '@core/domain/criteria';
import { scaleFor } from '@core/domain/scales';
import { ratingFor } from '@core/domain/workflow';
import { KpScorePipe } from '@shared/pipes/format.pipes';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';

@Component({
  selector: 'kp-rating-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepFrameComponent, RouterLink, BadgeComponent, CalloutComponent, IconComponent, KpScorePipe],
  template: `
    <kp-step-frame
      stepId="ocena"
      heading="Przegląd ocen cząstkowych"
      description="Sprawdź, czy każda decyzja ma oparcie w faktach, a odstępstwa od sugestii — uzasadnienie."
      completeLabel="Zatwierdź oceny cząstkowe"
    >
      <section class="kp-card kp-card--flush" aria-labelledby="kp-overview-title">
        <div class="kp-card__header">
          <div>
            <h3 class="kp-card__title" id="kp-overview-title">Sugestia narzędzia a Twoja decyzja</h3>
            <p class="kp-card__subtitle">Sugestia to jawna reguła narzędzia. Ocena cząstkowa to Twoja decyzja.</p>
          </div>
        </div>
        <div class="kp-overview__table-wrap">
          <table class="kp-table">
            <thead>
              <tr>
                <th scope="col">Kryterium</th>
                <th scope="col" class="kp-overview__num">Sugestia</th>
                <th scope="col" class="kp-overview__num">Decyzja</th>
                <th scope="col">Ślad</th>
                <th scope="col"><span class="kp-visually-hidden">Akcje</span></th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.id) {
                <tr [class.kp-overview__row--missing]="row.points === null">
                  <th scope="row">
                    <span class="kp-overview__name">{{ row.name }}</span>
                    <span class="kp-overview__type">{{ row.mandatory ? 'obowiązkowe' : 'dodatkowe' }}</span>
                  </th>
                  <td class="kp-overview__num">
                    @if (row.suggested !== null) {
                      <span class="kp-overview__points kp-overview__points--muted">{{ row.suggested }}</span>
                      @if (row.average !== null) {
                        <span class="kp-overview__avg">śr. {{ row.average | kpScore }}</span>
                      }
                    } @else {
                      <span class="kp-muted">—</span>
                    }
                  </td>
                  <td class="kp-overview__num">
                    @if (row.points !== null) {
                      <span class="kp-overview__points" [class.kp-overview__points--veto]="row.veto">{{ row.points }}</span>
                      <span class="kp-overview__avg">{{ row.label }}</span>
                    } @else {
                      <kp-badge tone="warning">brak</kp-badge>
                    }
                  </td>
                  <td>
                    <div class="kp-cluster">
                      @if (row.deviates) {
                        <kp-badge [tone]="row.hasRationale ? 'info' : 'danger'" icon="alert">
                          {{ row.hasRationale ? 'odstępstwo uzasadnione' : 'brak uzasadnienia' }}
                        </kp-badge>
                      } @else if (row.points !== null && row.suggested !== null) {
                        <kp-badge tone="success" icon="check">zgodna z sugestią</kp-badge>
                      }
                      @if (row.evidence > 0) {
                        <kp-badge icon="notebook">{{ row.evidence }} dow.</kp-badge>
                      }
                    </div>
                  </td>
                  <td class="kp-overview__action">
                    <a [routerLink]="[store.baseUrl(), 'ocena']" [queryParams]="{ k: row.id }">
                      {{ store.isEditable('ocena') ? 'Zmień' : 'Szczegóły' }}
                      <kp-icon name="chevron-right" [size]="14" />
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (store.result(); as result) {
        @if (result.path === 'periodic') {
          <section class="kp-card kp-overview__result" aria-label="Wynik wstępny">
            <div class="kp-kpi">
              <span class="kp-kpi__label">Średnia ocen cząstkowych</span>
              <span class="kp-kpi__value">{{ result.periodic.mean | kpScore }}</span>
            </div>
            <div class="kp-kpi">
              <span class="kp-kpi__label">Poziom (§ 11 ust. 1 pkt 2)</span>
              <span class="kp-overview__level">{{ result.periodic.level?.label ?? 'po uzupełnieniu wszystkich ocen' }}</span>
            </div>
            @if (result.periodic.outcome; as outcome) {
              <kp-badge [tone]="outcome === 'pozytywna' ? 'success' : 'danger'" [strong]="true">Ocena {{ outcome }}</kp-badge>
            }
          </section>
          @if (result.periodic.vetoCriteria.length > 0) {
            <kp-callout tone="danger" heading="Ocena cząstkowa 1 pkt">
              Ocena będzie negatywna niezależnie od średniej (§ 11 ust. 1 pkt 4). Upewnij się, że decyzja ma oparcie w faktach.
            </kp-callout>
          } @else if (result.periodic.onBoundary) {
            <kp-callout tone="info" heading="Średnia na granicy przedziału">
              {{ result.periodic.explanation[2] }}
            </kp-callout>
          }
        } @else {
          <section class="kp-card kp-overview__result" aria-label="Wynik wstępny">
            <div class="kp-kpi">
              <span class="kp-kpi__label">Ocena łączna</span>
              <span class="kp-kpi__value">{{ result.first.mean | kpScore }}</span>
            </div>
            <div class="kp-kpi">
              <span class="kp-kpi__label">Oceny 3 pkt</span>
              <span class="kp-kpi__value">{{ result.first.belowCount }}</span>
            </div>
            <p class="kp-muted kp-text-xs">Pełne warunki pozytywnej pierwszej oceny sprawdzisz w następnym kroku.</p>
          </section>
        }
      }
    </kp-step-frame>
  `,
  styles: `
    .kp-overview__table-wrap {
      overflow-x: auto;
    }
    .kp-overview__name {
      display: block;
      font-weight: 600;
    }
    .kp-overview__type {
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
      font-weight: 400;
    }
    .kp-overview__num {
      text-align: center;
      white-space: nowrap;
    }
    .kp-overview__points {
      display: inline-grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: var(--kp-radius-sm);
      background: var(--kp-color-primary);
      color: var(--kp-color-text-on-primary);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .kp-overview__points--muted {
      background: var(--kp-color-surface-tint);
      color: var(--kp-color-primary-strong);
    }
    .kp-overview__points--veto {
      background: var(--kp-color-danger);
    }
    .kp-overview__avg {
      display: block;
      margin-top: 2px;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-overview__row--missing th {
      color: var(--kp-color-text-muted);
    }
    .kp-overview__action {
      text-align: end;
      white-space: nowrap;
    }
    .kp-overview__action a {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: var(--kp-font-size-xs);
      font-weight: 500;
    }
    .kp-overview__result {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--kp-space-4) var(--kp-space-8);
    }
    .kp-overview__level {
      font-size: var(--kp-font-size-md);
      font-weight: 600;
    }
  `,
})
export class RatingOverviewComponent {
  protected readonly store = inject(CaseStore);

  protected readonly rows = computed(() => {
    const c = this.store.snapshot();
    const mandatory = new Set<string>(mandatoryCriteriaFor(c.path, c.positionReview.confirmedVariant));
    const scale = scaleFor(c.path);
    return this.store.criteria().map((id) => {
      const rating = ratingFor(c, id);
      const decision = rating?.decision ?? null;
      const suggestion = rating ? this.store.suggestionFor(id, rating.indicators) : null;
      const suggested = suggestion?.points ?? decision?.suggestedPoints ?? null;
      return {
        id,
        name: criterionName(id),
        mandatory: mandatory.has(id),
        suggested,
        average: suggestion?.average ?? decision?.suggestedAverage ?? null,
        points: decision?.points ?? null,
        label: scale.find((option) => option.points === decision?.points)?.label ?? '',
        deviates: !c.access.redacted && Boolean(decision && suggested !== null && decision.points !== suggested),
        hasRationale: Boolean(decision?.rationale.trim()),
        veto: c.path === 'periodic' && decision?.points === 1,
        evidence: new Set(rating?.indicators.flatMap((item) => item.observationIds) ?? []).size,
      };
    });
  });
}
