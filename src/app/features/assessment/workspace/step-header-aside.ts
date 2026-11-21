import { Directive, Injectable, type OnDestroy, TemplateRef, inject, signal } from '@angular/core';

/** Miejsce w nagłówku obszaru oceny, które wypełnia bieżący krok (np. status podpisu części I). */
@Injectable()
export class StepHeaderSlot {
  private readonly state = signal<TemplateRef<unknown> | null>(null);
  readonly template = this.state.asReadonly();

  set(template: TemplateRef<unknown>): void {
    this.state.set(template);
  }

  clear(template: TemplateRef<unknown>): void {
    if (this.state() === template) this.state.set(null);
  }
}

/** `<ng-template kpStepHeaderAside>…</ng-template>` — treść trafia na prawą stronę nagłówka kroku. */
@Directive({ selector: 'ng-template[kpStepHeaderAside]' })
export class StepHeaderAsideDirective implements OnDestroy {
  private readonly slot = inject(StepHeaderSlot);
  private readonly template = inject(TemplateRef);

  constructor() {
    this.slot.set(this.template);
  }

  ngOnDestroy(): void {
    this.slot.clear(this.template);
  }
}
