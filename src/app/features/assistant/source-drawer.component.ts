import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { KnowledgeApi } from '@core/api/knowledge.api';
import type { SourceKind } from '@core/domain/assistant.model';
import { BadgeComponent, type Tone } from '@shared/ui/badge/badge.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';

export interface SourceDrawerData {
  readonly fragmentId: string;
}

export const SOURCE_KIND_LABEL: Readonly<Record<SourceKind, string>> = {
  przepis: 'Przepis',
  poradnik: 'Poradnik',
  model: 'Model kompetencji',
  wzor: 'Wzór arkusza',
  'regula-narzedzia': 'Reguła narzędzia',
};

export const SOURCE_KIND_TONE: Readonly<Record<SourceKind, Tone>> = {
  przepis: 'primary',
  poradnik: 'info',
  model: 'success',
  wzor: 'neutral',
  'regula-narzedzia': 'warning',
};

@Component({
  selector: 'kp-source-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, BadgeComponent, CalloutComponent, SkeletonComponent],
  template: `
    <kp-dialog-shell
      [heading]="fragment()?.heading ?? 'Fragment źródła'"
      [eyebrow]="source()?.shortTitle ?? 'Źródło'"
      titleId="kp-source-title"
    >
      @if (fragment(); as item) {
        <div class="kp-stack">
          <div class="kp-cluster">
            @if (source(); as src) {
              <kp-badge [tone]="tone[src.kind]">{{ kindLabel[src.kind] }}</kp-badge>
            }
            <kp-badge>{{ item.locator }}</kp-badge>
          </div>
          <blockquote class="kp-source__text">{{ item.text }}</blockquote>
          @if (source(); as src) {
            <p class="kp-legal">{{ src.title }} — {{ src.reference }}</p>
            @if (src.kind === 'regula-narzedzia') {
              <kp-callout tone="warning" heading="To nie jest przepis">
                Reguła narzędzia porządkuje sugestię i można ją zmienić w konfiguracji. Decyzja o ocenie zawsze należy do oceniającego.
              </kp-callout>
            }
          }
        </div>
      } @else if (fragmentResource.error()) {
        <kp-callout tone="danger">Nie udało się wczytać fragmentu źródła.</kp-callout>
      } @else {
        <div class="kp-stack">
          <kp-skeleton width="50%" />
          <kp-skeleton height="160px" />
        </div>
      }
    </kp-dialog-shell>
  `,
  styles: `
    .kp-source__text {
      margin: 0;
      padding: var(--kp-space-4);
      border-left: 3px solid var(--kp-color-primary);
      border-radius: 0 var(--kp-radius-md) var(--kp-radius-md) 0;
      background: var(--kp-color-surface-muted);
      font-size: var(--kp-font-size-sm);
      line-height: 1.65;
      white-space: pre-line;
    }
  `,
})
export class SourceDrawerComponent {
  private readonly api = inject(KnowledgeApi);
  private readonly data = inject<SourceDrawerData>(DIALOG_DATA);

  protected readonly kindLabel = SOURCE_KIND_LABEL;
  protected readonly tone = SOURCE_KIND_TONE;

  protected readonly fragmentResource = rxResource({ stream: () => this.api.fragment(this.data.fragmentId) });
  private readonly sourcesResource = rxResource({ stream: () => this.api.sources() });

  protected readonly fragment = computed(() => (this.fragmentResource.hasValue() ? this.fragmentResource.value() : undefined));
  protected readonly source = computed(() => {
    const fragment = this.fragment();
    const sources = this.sourcesResource.hasValue() ? this.sourcesResource.value() : [];
    return fragment ? sources.find((source) => source.id === fragment.sourceId) : undefined;
  });
}
