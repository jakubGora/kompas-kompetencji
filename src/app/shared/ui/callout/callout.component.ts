import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/icons';

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'ai' | 'neutral';

const DEFAULT_ICONS: Readonly<Record<CalloutTone, IconName>> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert',
  danger: 'alert-circle',
  ai: 'sparkles',
  neutral: 'info',
};

/** Komunikat w treści ekranu — tło w kolorze tonu, bez obramowania (jak banery w projekcie). */
@Component({
  selector: 'kp-callout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    class: 'kp-callout',
    '[class]': '"kp-callout--" + tone()',
    '[attr.role]': 'live() ? "status" : null',
  },
  template: `
    <kp-icon class="kp-callout__icon" [name]="iconName()" [size]="18" />
    <div class="kp-callout__body">
      @if (heading()) {
        <p class="kp-callout__title">{{ heading() }}</p>
      }
      <div class="kp-callout__content"><ng-content /></div>
      <div class="kp-callout__actions"><ng-content select="[calloutActions]" /></div>
    </div>
  `,
  styles: `
    :host {
      --_fg: var(--kp-color-primary);
      --_bg: var(--kp-color-surface-tint);
      display: flex;
      gap: var(--kp-space-3);
      padding: var(--kp-space-3) var(--kp-space-4);
      border-radius: var(--kp-radius-md);
      background: var(--_bg);
      color: var(--kp-color-text);
      font-size: var(--kp-font-size-xs);
    }
    :host(.kp-callout--success) {
      --_fg: var(--kp-color-success);
      --_bg: var(--kp-color-success-bg);
    }
    :host(.kp-callout--warning) {
      --_fg: var(--kp-color-warning);
      --_bg: var(--kp-color-warning-bg);
    }
    :host(.kp-callout--danger) {
      --_fg: var(--kp-color-danger);
      --_bg: var(--kp-color-danger-bg);
    }
    :host(.kp-callout--neutral) {
      --_fg: var(--kp-color-text-muted);
      --_bg: var(--kp-color-surface-lilac);
    }
    .kp-callout__icon {
      color: var(--_fg);
      margin-top: 1px;
    }
    .kp-callout__body {
      display: grid;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }
    .kp-callout__title {
      margin: 0;
      color: var(--_fg);
      font-weight: 500;
    }
    .kp-callout__content {
      color: var(--kp-color-text);
      line-height: var(--kp-line-height-base);
    }
    .kp-callout__content:empty,
    .kp-callout__actions:empty {
      display: none;
    }
    .kp-callout__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--kp-space-3);
      margin-top: var(--kp-space-2);
    }
  `,
})
export class CalloutComponent {
  readonly tone = input<CalloutTone>('info');
  readonly heading = input<string>();
  readonly icon = input<IconName>();
  /** Ogłaszaj treść czytnikom ekranu (komunikaty pojawiające się dynamicznie). */
  readonly live = input(false);

  protected readonly iconName = computed(() => this.icon() ?? DEFAULT_ICONS[this.tone()]);
}
