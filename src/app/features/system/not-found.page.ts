import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { SessionStore } from '@core/session/session.store';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'kp-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, EmptyStateComponent],
  template: `
    <div class="kp-card">
      <kp-empty-state
        icon="compass"
        heading="Nie znaleźliśmy tej strony"
        description="Adres mógł się zmienić albo link jest niepełny."
      >
        <a kpButton icon="arrow-left" [routerLink]="session.homeUrl()">Wróć do strony głównej</a>
        <a kpButton="secondary" icon="book" routerLink="/baza-wiedzy">Baza wiedzy</a>
      </kp-empty-state>
    </div>
  `,
})
export class NotFoundPage {
  protected readonly session = inject(SessionStore);

  constructor() {
    inject(BreadcrumbStore).set([{ label: 'Nie znaleziono strony' }]);
  }
}
