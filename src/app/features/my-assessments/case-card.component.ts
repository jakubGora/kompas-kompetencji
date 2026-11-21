import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CaseSummary } from '@core/domain/assessment.model';
import { KpPluralPipe } from '@shared/pipes/format.pipes';
import { ATTENTION, caseKindLabel, stepProgress } from '@shared/presentation/case-presentation';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { DueChipComponent } from '@shared/ui/due-chip/due-chip.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ProgressComponent } from '@shared/ui/progress/progress.component';

/** Karta sprawy w toku — cała karta prowadzi do bieżącego kroku oceny. */
@Component({
  selector: 'kp-case-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AvatarComponent, BadgeComponent, DueChipComponent, IconComponent, ProgressComponent, KpPluralPipe],
  host: { class: 'kp-case-card', '[class.kp-case-card--featured]': 'featured()' },
  template: `
    <header class="kp-case-card__header">
      <kp-avatar [name]="summary().employee.fullName" [size]="featured() ? 48 : 40" />
      <div class="kp-case-card__who">
        <h3 class="kp-case-card__name">
          <a class="kp-case-card__link" [routerLink]="['/oceny', summary().id]">{{ summary().employee.fullName }}</a>
        </h3>
        <p class="kp-case-card__position">{{ summary().employee.positionTitle }}</p>
      </div>
      <span class="kp-chip">{{ kind() }}</span>
    </header>

    <kp-progress
      [value]="progress()"
      [label]="'Postęp oceny: ' + summary().employee.fullName"
      [valueText]="'Krok ' + summary().stepIndex + ' z ' + summary().stepCount + ': ' + summary().currentStepLabel"
    />

    <div class="kp-case-card__next">
      <p class="kp-case-card__next-label">Następna czynność</p>
      <p class="kp-case-card__next-text">{{ summary().nextActionLabel }}</p>
      @if (summary().nextActionDue; as due) {
        <kp-due-chip [date]="due" />
      }
    </div>

    <footer class="kp-case-card__footer">
      <div class="kp-cluster">
        @for (reason of summary().attention; track reason) {
          <kp-badge [tone]="attention[reason].tone" [icon]="attention[reason].icon">{{ attention[reason].label }}</kp-badge>
        }
        <span class="kp-case-card__meta"><kp-icon name="notebook" [size]="14" /> {{ summary().observationsCount | kpPlural: ['obserwacja', 'obserwacje', 'obserwacji'] }}</span>
      </div>
      <span class="kp-case-card__cta" aria-hidden="true">Kontynuuj <kp-icon name="arrow-right" [size]="16" /></span>
    </footer>
  `,
  styles: `
    :host {
      position: relative;
      display: grid;
      gap: var(--kp-space-4);
      padding: var(--kp-space-5);
      border: 1px solid var(--kp-color-border-subtle);
      border-radius: var(--kp-radius-lg);
      background: var(--kp-color-surface);
      box-shadow: var(--kp-shadow-sm);
      transition:
        border-color var(--kp-duration-fast) ease,
        box-shadow var(--kp-duration-fast) ease,
        transform var(--kp-duration-fast) ease;
    }
    :host:hover {
      border-color: var(--kp-color-primary-border);
      box-shadow: var(--kp-shadow-md);
      transform: translateY(-1px);
    }
    :host:has(.kp-case-card__link:focus-visible) {
      outline: 2px solid var(--kp-focus-outline-color);
      outline-offset: 2px;
    }
    :host(.kp-case-card--featured) {
      border-color: transparent;
      background:
        linear-gradient(var(--kp-color-surface), var(--kp-color-surface)) padding-box,
        linear-gradient(135deg, var(--kp-color-primary), var(--kp-violet-300)) border-box;
      border-width: 2px;
    }
    .kp-case-card__header {
      display: flex;
      align-items: center;
      gap: var(--kp-space-3);
    }
    .kp-case-card__who {
      flex: 1;
      min-width: 0;
    }
    .kp-case-card__name {
      margin: 0;
      font-size: var(--kp-font-size-md);
      font-weight: var(--kp-font-weight-semibold);
    }
    .kp-case-card__link {
      color: inherit;
      text-decoration: none;
    }
    .kp-case-card__link:focus-visible {
      outline: none;
    }
    .kp-case-card__link::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
    }
    .kp-case-card__position {
      overflow: hidden;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-xs);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .kp-case-card__next {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 2px var(--kp-space-3);
      padding: var(--kp-space-3);
      border-radius: var(--kp-radius-md);
      background: var(--kp-color-surface-muted);
    }
    .kp-case-card__next-label {
      grid-column: 1 / -1;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .kp-case-card__next-text {
      font-size: var(--kp-font-size-sm);
      font-weight: var(--kp-font-weight-medium);
    }
    .kp-case-card__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--kp-space-3);
    }
    .kp-case-card__meta {
      display: inline-flex;
      align-items: center;
      gap: var(--kp-space-1);
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-case-card__cta {
      display: inline-flex;
      align-items: center;
      gap: var(--kp-space-1);
      color: var(--kp-color-primary);
      font-size: var(--kp-font-size-sm);
      font-weight: var(--kp-font-weight-medium);
    }
    @media (prefers-reduced-motion: reduce) {
      :host,
      :host:hover {
        transition: none;
        transform: none;
      }
    }
  `,
})
export class CaseCardComponent {
  readonly summary = input.required<CaseSummary>();
  readonly featured = input(false);

  protected readonly attention = ATTENTION;
  protected readonly kind = computed(() => caseKindLabel(this.summary()));
  protected readonly progress = computed(() => stepProgress(this.summary()));
}
