import { Directive, inject } from '@angular/core';
import { KP_FIELD } from './form-field.component';

/** Łączy natywną kontrolkę z `kp-field`: id, aria-describedby, aria-invalid, aria-required. */
@Directive({
  selector: '[kpControl]',
  host: {
    '[id]': 'field?.controlId',
    '[attr.aria-describedby]': 'field?.describedBy() ?? null',
    '[attr.aria-invalid]': 'field?.invalid() ? "true" : null',
    '[attr.aria-required]': 'field?.isRequired() ? "true" : null',
  },
})
export class ControlDirective {
  protected readonly field = inject(KP_FIELD, { optional: true });
}
