import { ChangeDetectionStrategy, Component, InjectionToken, computed, input } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';
import { IconComponent } from '../icon/icon.component';

let nextId = 0;

export interface FieldContext {
  readonly controlId: string;
  readonly describedBy: () => string | null;
  readonly invalid: () => boolean;
  readonly isRequired: () => boolean;
}

export const KP_FIELD = new InjectionToken<FieldContext>('KP_FIELD');

/**
 * Etykieta, podpowiedź i komunikat błędu dla kontrolki oznaczonej `kpControl`.
 * Z polem Signal Forms (`[field]`) błąd pojawia się po opuszczeniu pola.
 */
@Component({
  selector: 'kp-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  providers: [{ provide: KP_FIELD, useExisting: FormFieldComponent }],
  host: { class: 'kp-field', '[class.kp-field--invalid]': 'invalid()' },
  template: `
    <div class="kp-field__label-row">
      <label class="kp-field__label" [attr.for]="controlId">
        {{ label() }}
        @if (isRequired()) {
          <span class="kp-field__required" aria-hidden="true">*</span>
        } @else if (optionalHint()) {
          <span class="kp-field__optional">(opcjonalnie)</span>
        }
      </label>
      <ng-content select="[fieldAside]" />
    </div>
    @if (hint()) {
      <p class="kp-field__hint" [id]="hintId">{{ hint() }}</p>
    }
    <ng-content />
    @if (errorMessage(); as message) {
      <p class="kp-field__error" [id]="errorId">
        <kp-icon name="alert-circle" [size]="16" />
        {{ message }}
      </p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--kp-space-1-5);
      min-width: 0;
    }
    .kp-field__label-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--kp-space-2);
    }
    .kp-field__label {
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-field__required {
      margin-left: 2px;
      color: var(--kp-color-danger);
    }
    .kp-field__optional {
      margin-left: var(--kp-space-1);
      color: var(--kp-color-text-muted);
    }
    .kp-field__hint {
      margin: 0;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-field__error {
      display: flex;
      align-items: center;
      gap: var(--kp-space-1);
      margin: 0;
      color: var(--kp-color-danger);
      font-size: var(--kp-font-size-2xs);
      font-weight: 500;
    }
  `,
})
export class FormFieldComponent implements FieldContext {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly required = input(false);
  /** Pokaż „(opcjonalnie)” przy polach niewymaganych. */
  readonly optionalHint = input(false);
  /** Błąd podany wprost (np. z walidacji serwera). */
  readonly error = input<string | null>(null);
  readonly field = input<FieldTree<unknown>>();

  readonly controlId = `kp-field-${++nextId}`;
  protected readonly hintId = `${this.controlId}-hint`;
  protected readonly errorId = `${this.controlId}-error`;

  readonly isRequired = computed(() => this.required() || (this.field()?.().required() ?? false));

  protected readonly errorMessage = computed(() => {
    const explicit = this.error();
    if (explicit) return explicit;
    const state = this.field()?.();
    if (!state || !state.touched() || !state.invalid()) return null;
    return state.errors()[0]?.message ?? 'Uzupełnij to pole.';
  });

  readonly invalid = computed(() => this.errorMessage() !== null);

  readonly describedBy = computed(() => {
    const ids = [this.hint() ? this.hintId : null, this.errorMessage() ? this.errorId : null].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : null;
  });
}
