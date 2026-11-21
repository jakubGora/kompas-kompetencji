import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'danger' | 'ai';
export type ButtonSize = 'md' | 'sm';

/**
 * Przycisk na natywnym `<button>` / `<a>` — zachowuje semantykę, fokus i obsługę klawiatury.
 * Użycie: `<button kpButton="secondary" icon="plus">Dodaj</button>`.
 */
@Component({
  selector: 'button[kpButton], a[kpButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    class: 'kp-btn',
    '[class]': '"kp-btn--" + (variant() || "primary") + " kp-btn--" + size()',
    '[class.kp-btn--loading]': 'loading()',
    '[class.kp-btn--icon-only]': 'iconOnly()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
  template: `
    @if (loading()) {
      <span class="kp-btn__spinner" aria-hidden="true"></span>
    } @else if (icon(); as name) {
      <kp-icon [name]="name" [size]="size() === 'sm' ? 16 : 18" />
    }
    <ng-content />
    @if (iconEnd(); as name) {
      <kp-icon [name]="name" [size]="size() === 'sm' ? 16 : 18" />
    }
  `,
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant | ''>('primary', { alias: 'kpButton' });
  readonly size = input<ButtonSize>('md');
  readonly icon = input<IconName>();
  readonly iconEnd = input<IconName>();
  readonly loading = input(false, { transform: booleanAttribute });
  readonly iconOnly = input(false, { transform: booleanAttribute });
}
