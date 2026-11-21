import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DESIGN_ICONS, ICONS, type DesignIcon, type IconName } from './icons';

const LINE_VIEW_BOX = '0 0 24 24';

function designIcon(name: IconName): DesignIcon | null {
  return name in DESIGN_ICONS ? DESIGN_ICONS[name as keyof typeof DESIGN_ICONS] : null;
}

/**
 * Ikona dekoracyjna (domyślnie `aria-hidden`). Podaj `label`, gdy ikona niesie
 * znaczenie bez towarzyszącego tekstu.
 */
@Component({
  selector: 'kp-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'kp-icon',
    '[attr.aria-hidden]': 'label() ? null : "true"',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() ?? null',
    '[style.--kp-icon-size]': 'size() + "px"',
  },
  template: `
    <svg
      [attr.viewBox]="viewBox()"
      [attr.fill]="filled() ? 'currentColor' : 'none'"
      [attr.stroke]="filled() ? null : 'currentColor'"
      [attr.stroke-width]="filled() ? null : resolvedStrokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      width: var(--kp-icon-size, 20px);
      height: var(--kp-icon-size, 20px);
      line-height: 0;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  /** Grubość obrysu ikon liniowych; ikony z projektu mają własną. */
  readonly strokeWidth = input<number>();
  readonly label = input<string>();

  private readonly design = computed(() => designIcon(this.name()));
  protected readonly viewBox = computed(() => this.design()?.viewBox ?? LINE_VIEW_BOX);
  protected readonly filled = computed(() => this.design()?.fill === true);
  protected readonly resolvedStrokeWidth = computed(() => this.strokeWidth() ?? this.design()?.strokeWidth ?? 1.8);
  protected readonly paths = computed<readonly string[]>(
    () => this.design()?.paths ?? ICONS[this.name() as keyof typeof ICONS],
  );
}
