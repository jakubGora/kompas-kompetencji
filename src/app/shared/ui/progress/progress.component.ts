import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'kp-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'kp-progress',
    role: 'progressbar',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuetext]': 'valueText() ?? null',
  },
  template: `<span class="kp-progress__bar" [style.width.%]="percent()"></span>`,
  styles: `
    :host {
      display: block;
      height: 6px;
      overflow: hidden;
      border-radius: var(--kp-radius-pill);
      background: var(--kp-color-surface-tint-strong);
    }
    .kp-progress__bar {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--kp-color-primary);
      transition: width var(--kp-duration-slow) var(--kp-ease-standard);
    }
  `,
})
export class ProgressComponent {
  readonly value = input.required<number>();
  readonly max = input(100);
  readonly label = input.required<string>();
  readonly valueText = input<string>();

  protected readonly percent = computed(() => {
    const max = this.max();
    return max > 0 ? Math.min(100, Math.max(0, (this.value() / max) * 100)) : 0;
  });
}
