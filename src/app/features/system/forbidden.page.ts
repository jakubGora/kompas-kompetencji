import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { SessionStore } from '@core/session/session.store';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'kp-forbidden-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, EmptyStateComponent],
  template: `
    <div class="kp-card">
      <kp-empty-state
        icon="lock"
        heading="Ten widok nie jest dostępny dla Twojej roli"
        description="Oceny widzą oceniający, kierujący komórką i kadry. Kadry nie widzą treści obserwacji ani notatek z rozmów — to zasada ochrony danych, nie błąd."
      >
        <a kpButton icon="arrow-left" [routerLink]="session.homeUrl()">Wróć do strony głównej</a>
      </kp-empty-state>
    </div>
  `,
})
export class ForbiddenPage {
  protected readonly session = inject(SessionStore);

  constructor() {
    inject(BreadcrumbStore).set([{ label: 'Brak dostępu' }]);
  }
}
