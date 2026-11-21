import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CaseStore } from '../data/case.store';

/** `/oceny/:id` → bieżący krok procesu. */
@Component({
  selector: 'kp-case-redirect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class CaseRedirectComponent {
  constructor() {
    const store = inject(CaseStore);
    const router = inject(Router);
    const route = inject(ActivatedRoute);
    effect(() => {
      const stepId = store.currentStepId();
      if (stepId) {
        void router.navigate([stepId], { relativeTo: route.parent, replaceUrl: true });
      }
    });
  }
}
