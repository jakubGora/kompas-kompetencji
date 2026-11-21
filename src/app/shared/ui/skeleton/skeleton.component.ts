import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'kp-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'kp-skeleton',
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
  template: ``,
  styles: `
    :host {
      display: block;
      background: linear-gradient(
        90deg,
        var(--kp-color-surface-tint) 0%,
        var(--kp-color-surface-tint-strong) 50%,
        var(--kp-color-surface-tint) 100%
      );
      background-size: 200% 100%;
      animation: kp-skeleton 1.4s ease-in-out infinite;
    }
    @keyframes kp-skeleton {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -100% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }
  `,
})
export class SkeletonComponent {
  readonly width = input('100%');
  readonly height = input('16px');
  readonly radius = input('var(--kp-radius-sm)');
}

/** Zastępczy układ ładowania strony z ogłoszeniem dla czytników ekranu. */
@Component({
  selector: 'kp-page-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent],
  host: { role: 'status', 'aria-live': 'polite' },
  template: `
    <span class="kp-visually-hidden">{{ label() }}</span>
    <div class="kp-page-skeleton">
      <kp-skeleton width="40%" height="28px" />
      <kp-skeleton width="60%" height="16px" />
      <div class="kp-page-skeleton__grid">
        @for (item of blocks; track item) {
          <kp-skeleton height="120px" radius="var(--kp-radius-lg)" />
        }
      </div>
      <kp-skeleton height="280px" radius="var(--kp-radius-lg)" />
    </div>
  `,
  styles: `
    .kp-page-skeleton {
      display: grid;
      gap: var(--kp-space-4);
    }
    .kp-page-skeleton__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--kp-space-4);
      margin-top: var(--kp-space-4);
    }
  `,
})
export class PageSkeletonComponent {
  readonly label = input('Wczytywanie…');
  protected readonly blocks = [1, 2, 3];
}
