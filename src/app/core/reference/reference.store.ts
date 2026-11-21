import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { KnowledgeApi } from '@core/api/knowledge.api';
import type { Competency, Indicator } from '@core/domain/competency.model';

/** Model kompetencji (14 kompetencji, 49 wskaźników, 245 opisów zachowań) — wczytywany raz. */
@Injectable({ providedIn: 'root' })
export class ReferenceStore {
  private readonly api = inject(KnowledgeApi);

  private readonly modelResource = rxResource({ stream: () => this.api.competencyModel() });

  readonly model = computed(() => (this.modelResource.hasValue() ? this.modelResource.value() : null));
  readonly loading = this.modelResource.isLoading;
  readonly error = this.modelResource.error;

  private readonly competencies = computed(
    () => new Map((this.model()?.competencies ?? []).map((competency) => [competency.id, competency])),
  );

  private readonly indicators = computed(
    () =>
      new Map(
        (this.model()?.competencies ?? []).flatMap((competency) =>
          competency.indicators.map((indicator) => [indicator.id, indicator] as const),
        ),
      ),
  );

  competency(id: string): Competency | undefined {
    return this.competencies().get(id);
  }

  indicator(id: string): Indicator | undefined {
    return this.indicators().get(id);
  }

  indicatorsOf(competencyId: string): readonly Indicator[] {
    return this.competency(competencyId)?.indicators ?? [];
  }

  reload(): void {
    this.modelResource.reload();
  }
}
