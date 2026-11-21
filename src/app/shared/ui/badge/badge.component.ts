import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/icons';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/** Etykieta stanu — styl etykiet z projektu (promień 8, 10 px Medium). */
@Component({
  selector: 'kp-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    class: 'kp-badge',
    '[class]': '"kp-badge--" + tone()',
    '[class.kp-badge--strong]': 'strong()',
  },
  template: `
    @if (icon(); as name) {
      <kp-icon [name]="name" [size]="12" [strokeWidth]="2" />
    } @else if (dot()) {
      <span class="kp-badge__dot" aria-hidden="true"></span>
    }
    <ng-content />
  `,
  styles: `
    :host {
      --_fg: var(--kp-color-text-muted);
      --_bg: var(--kp-color-surface-muted);
      display: inline-flex;
      align-items: center;
      gap: var(--kp-space-1);
      min-height: 22px;
      padding: 2px var(--kp-space-2);
      border-radius: var(--kp-radius-sm);
      background: var(--_bg);
      color: var(--_fg);
      font-size: var(--kp-font-size-3xs);
      font-weight: 500;
      line-height: 1.4;
      white-space: nowrap;
    }
    :host(.kp-badge--primary) {
      --_fg: var(--kp-color-text);
      --_bg: var(--kp-color-primary-tint-strong);
    }
    :host(.kp-badge--success) {
      --_fg: var(--kp-color-success);
      --_bg: var(--kp-color-success-bg);
    }
    :host(.kp-badge--warning) {
      --_fg: var(--kp-color-warning);
      --_bg: var(--kp-color-warning-bg);
    }
    :host(.kp-badge--danger) {
      --_fg: var(--kp-color-danger);
      --_bg: var(--kp-color-danger-bg);
    }
    :host(.kp-badge--info) {
      --_fg: var(--kp-color-primary);
      --_bg: var(--kp-color-primary-tint);
    }
    :host(.kp-badge--strong) {
      --_bg: var(--_fg);
      color: var(--kp-color-text-on-primary);
    }
    :host(.kp-badge--primary.kp-badge--strong) {
      --_bg: var(--kp-color-primary);
    }
    .kp-badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  `,
})
export class BadgeComponent {
  readonly tone = input<Tone>('neutral');
  readonly icon = input<IconName>();
  readonly dot = input(false);
  readonly strong = input(false);
}
