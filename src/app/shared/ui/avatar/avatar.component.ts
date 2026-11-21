import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const TINTS = [
  ['#f4eefc', '#5821a6'],
  ['#eadbff', '#4a1d8c'],
  ['#eaf8f1', '#146c49'],
  ['#fdedef', '#9c2231'],
  ['#fff5dd', '#7a4f00'],
  ['#f8f4fd', '#6b2bc6'],
] as const;

function hash(value: string): number {
  let result = 0;
  for (const char of value) {
    result = (result * 31 + char.charCodeAt(0)) >>> 0;
  }
  return result;
}

/** Awatar dekoracyjny — imię i nazwisko zawsze stoją obok w tekście. */
@Component({
  selector: 'kp-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'kp-avatar',
    'aria-hidden': 'true',
    '[style.--_size]': 'size() + "px"',
    '[style.--_bg]': 'tint()[0]',
    '[style.--_fg]': 'tint()[1]',
  },
  template: `
    @if (src() && !failed()) {
      <img [src]="src()" alt="" [width]="size()" [height]="size()" (error)="failed.set(true)" />
    } @else {
      {{ initials() }}
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: var(--_size);
      height: var(--_size);
      overflow: hidden;
      border-radius: 50%;
      background: var(--_bg);
      color: var(--_fg);
      font-size: calc(var(--_size) * 0.36);
      font-weight: 600;
      letter-spacing: 0.02em;
      user-select: none;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input(40);
  readonly src = input<string | undefined>();

  protected readonly failed = signal(false);

  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase('pl') ?? '')
      .join(''),
  );

  protected readonly tint = computed(() => TINTS[hash(this.name()) % TINTS.length] ?? TINTS[0]);
}
