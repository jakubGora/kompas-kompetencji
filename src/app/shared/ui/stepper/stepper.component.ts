import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

export type StepState = 'done' | 'current' | 'upcoming';

export interface StepperItem {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
  /** `null` — krok jeszcze niedostępny. */
  readonly link: string | null;
}

/** Pasek kroków z projektu: kółka 32 px połączone linią, etykiety 14 px pod spodem. */
@Component({
  selector: 'kp-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, IconComponent],
  host: { class: 'kp-stepper', '[style.--_count]': 'items().length' },
  template: `
    <nav [attr.aria-label]="label()">
      <ol class="kp-stepper__list">
        @for (item of items(); track item.id; let index = $index) {
          <li class="kp-stepper__item" [class]="'kp-stepper__item--' + item.state">
            @if (item.link; as link) {
              <a
                class="kp-stepper__step"
                [routerLink]="link"
                routerLinkActive="kp-stepper__step--viewed"
                ariaCurrentWhenActive="step"
                [attr.aria-label]="ariaLabel(item, index)"
              >
                <ng-container *ngTemplateOutlet="marker; context: { $implicit: item, index }" />
              </a>
            } @else {
              <span class="kp-stepper__step kp-stepper__step--locked" [attr.aria-label]="ariaLabel(item, index)">
                <ng-container *ngTemplateOutlet="marker; context: { $implicit: item, index }" />
              </span>
            }
          </li>
        }
      </ol>
    </nav>

    <ng-template #marker let-item let-index="index">
      <span class="kp-stepper__marker" aria-hidden="true">
        @if (item.state === 'done') {
          <kp-icon name="check" [size]="14" [strokeWidth]="2.2" />
        } @else {
          {{ index + 1 }}
        }
      </span>
      <span class="kp-stepper__label" aria-hidden="true">{{ item.label }}</span>
    </ng-template>
  `,
  styleUrl: './stepper.component.scss',
})
export class StepperComponent {
  readonly items = input.required<readonly StepperItem[]>();
  readonly label = input('Etapy oceny');

  protected ariaLabel(item: StepperItem, index: number): string {
    const state = item.state === 'done' ? 'zakończony' : item.state === 'current' ? 'bieżący' : 'do wykonania';
    const locked = item.link ? '' : ', niedostępny';
    return `Krok ${index + 1}: ${item.label} — ${state}${locked}`;
  }
}
