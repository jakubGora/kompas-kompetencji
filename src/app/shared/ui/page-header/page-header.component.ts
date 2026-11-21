import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** Nagłówek ekranu z projektu: tytuł 30 px, opis 13 px, informacja o ochronie danych, akcje po prawej. */
@Component({
  selector: 'kp-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'kp-page-header' },
  template: `
    <div class="kp-page-header__text">
      @if (eyebrow()) {
        <p class="kp-page-header__eyebrow">{{ eyebrow() }}</p>
      }
      <h1 class="kp-page-header__title">{{ heading() }}</h1>
      @if (description()) {
        <p class="kp-page-header__description" [class.kp-page-header__description--strong]="descriptionTone() === 'default'">
          {{ description() }}
        </p>
      }
      <ng-content select="[pageMeta]" />
      @if (privacyNote()) {
        <p class="kp-page-header__note"><kp-icon name="kp-lock" [size]="9" /> Twoje dane są chronione</p>
      }
    </div>
    <div class="kp-page-header__actions"><ng-content select="[pageActions]" /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--kp-space-4) var(--kp-space-6);
      margin-bottom: var(--kp-space-7);
    }
    .kp-page-header__text {
      display: grid;
      gap: 6px;
      min-width: min(100%, 320px);
      flex: 1 1 420px;
    }
    .kp-page-header__eyebrow {
      margin: 0 0 -4px;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-xs);
    }
    .kp-page-header__title {
      margin: 0;
      font-size: var(--kp-font-size-4xl);
      font-weight: 600;
      line-height: 1.5;
    }
    .kp-page-header__description {
      margin: 0;
      max-width: 80ch;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-sm);
    }
    .kp-page-header__description--strong {
      color: var(--kp-color-text);
    }
    .kp-page-header__note {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin: 0;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-3xs);
    }
    .kp-page-header__note kp-icon {
      color: var(--kp-color-icon);
    }
    .kp-page-header__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--kp-space-4);
    }
    .kp-page-header__actions:empty {
      display: none;
    }
  `,
})
export class PageHeaderComponent {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly eyebrow = input<string>();
  /** Opis w kolorze tekstu (ekrany kroków) albo wyciszony (listy). */
  readonly descriptionTone = input<'muted' | 'default'>('muted');
  readonly privacyNote = input(true);
}
