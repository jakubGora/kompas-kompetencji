import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { describeDueIn, diffInDays, formatDatePl, type IsoDate } from '@core/domain/date';
import { SessionStore } from '@core/session/session.store';
import { IconComponent } from '../icon/icon.component';

/** Termin z odniesieniem do „dziś”: kolor i tekst mówią, ile zostało czasu. */
@Component({
  selector: 'kp-due-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'kp-due-chip', '[class]': '"kp-due-chip--" + tone()' },
  template: `
    <kp-icon [name]="tone() === 'overdue' ? 'alert-circle' : 'calendar'" [size]="14" [strokeWidth]="2" />
    @if (prefix()) {
      <span class="kp-due-chip__prefix">{{ prefix() }}</span>
    }
    <span>{{ formatted() }}</span>
    @if (showRelative()) {
      <span class="kp-due-chip__relative">· {{ relative() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--kp-space-1);
      padding: 2px var(--kp-space-2);
      border-radius: var(--kp-radius-pill);
      font-size: var(--kp-font-size-2xs);
      font-weight: 500;
      white-space: nowrap;
      background: var(--kp-color-surface-muted);
      color: var(--kp-color-text-muted);
    }
    :host(.kp-due-chip--overdue) {
      background: var(--kp-color-danger-bg);
      color: var(--kp-color-danger);
    }
    :host(.kp-due-chip--urgent) {
      background: var(--kp-color-warning-bg);
      color: var(--kp-color-warning);
    }
    :host(.kp-due-chip--soon) {
      background: var(--kp-color-primary-tint);
      color: var(--kp-color-primary-strong);
    }
    .kp-due-chip__prefix {
      font-weight: 400;
    }
    .kp-due-chip__relative {
      font-weight: 600;
    }
  `,
})
export class DueChipComponent {
  private readonly session = inject(SessionStore);

  readonly date = input.required<IsoDate>();
  readonly prefix = input<string>();
  readonly showRelative = input(true);

  protected readonly days = computed(() => diffInDays(this.date(), this.session.today()));
  protected readonly tone = computed(() => {
    const days = this.days();
    if (days < 0) return 'overdue';
    if (days <= 3) return 'urgent';
    if (days <= 14) return 'soon';
    return 'later';
  });
  protected readonly formatted = computed(() => formatDatePl(this.date()));
  protected readonly relative = computed(() => describeDueIn(this.date(), this.session.today()));
}
