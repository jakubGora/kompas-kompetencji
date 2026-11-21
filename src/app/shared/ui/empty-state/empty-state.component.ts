import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/icons';

@Component({
  selector: 'kp-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'kp-empty-state', '[class.kp-empty-state--compact]': 'compact()' },
  template: `
    <span class="kp-empty-state__icon"><kp-icon [name]="icon()" [size]="compact() ? 20 : 24" /></span>
    <p class="kp-empty-state__title">{{ heading() }}</p>
    @if (description()) {
      <p class="kp-empty-state__description">{{ description() }}</p>
    }
    <div class="kp-empty-state__actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--kp-space-2);
      padding: var(--kp-space-10) var(--kp-space-6);
      text-align: center;
    }
    :host(.kp-empty-state--compact) {
      padding: var(--kp-space-6) var(--kp-space-4);
    }
    .kp-empty-state__icon {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--kp-color-primary-tint);
      color: var(--kp-color-primary);
    }
    :host(.kp-empty-state--compact) .kp-empty-state__icon {
      width: 40px;
      height: 40px;
    }
    .kp-empty-state__title {
      margin: var(--kp-space-1) 0 0;
      font-weight: 600;
    }
    .kp-empty-state__description {
      margin: 0;
      max-width: 52ch;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-sm);
    }
    .kp-empty-state__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--kp-space-2);
      margin-top: var(--kp-space-2);
    }
    .kp-empty-state__actions:empty {
      display: none;
    }
  `,
})
export class EmptyStateComponent {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly icon = input<IconName>('inbox');
  readonly compact = input(false);
}
