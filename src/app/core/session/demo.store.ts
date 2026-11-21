import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SessionApi } from '@core/api/session.api';
import { environment } from '@env/environment';
import { EMPTY } from 'rxjs';

/** Konta i scenariusze demonstracyjne — dostępne tylko z backendem mock. */
@Injectable({ providedIn: 'root' })
export class DemoStore {
  private readonly api = inject(SessionApi);
  private readonly resource = rxResource({
    stream: () => (environment.useMockBackend ? this.api.demo() : EMPTY),
  });

  readonly info = computed(() => this.resource.value() ?? null);
  readonly accounts = computed(() => this.info()?.accounts ?? []);
  readonly scenarios = computed(() => this.info()?.scenarios ?? []);
  readonly scenarioId = computed(() => this.info()?.scenarioId ?? 'demo');
}
