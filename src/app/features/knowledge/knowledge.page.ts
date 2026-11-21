import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { KnowledgeApi } from '@core/api/knowledge.api';
import type { SourceFragment } from '@core/domain/assistant.model';
import { CRITERIA, type CriterionId } from '@core/domain/criteria';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { ReferenceStore } from '@core/reference/reference.store';
import { KpPluralPipe } from '@shared/pipes/format.pipes';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { debounceTime } from 'rxjs';
import { AssistantPanelComponent } from '../assistant/assistant-panel.component';
import { SOURCE_KIND_LABEL, SOURCE_KIND_TONE, SourceDrawerComponent, type SourceDrawerData } from '../assistant/source-drawer.component';

const SEARCH_DEBOUNCE_MS = 250;

@Component({
  selector: 'kp-knowledge-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Tabs,
    TabList,
    Tab,
    TabPanel,
    TabContent,
    AssistantPanelComponent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    KpPluralPipe,
  ],
  templateUrl: './knowledge.page.html',
  styleUrl: './knowledge.page.scss',
})
export class KnowledgePage {
  private readonly api = inject(KnowledgeApi);
  private readonly dialogs = inject(DialogService);
  protected readonly reference = inject(ReferenceStore);

  protected readonly kindLabel = SOURCE_KIND_LABEL;
  protected readonly kindTone = SOURCE_KIND_TONE;
  protected readonly tab = signal('asystent');

  protected readonly sources = rxResource({ stream: () => this.api.sources() });
  protected readonly sourceList = computed(() => (this.sources.hasValue() ? this.sources.value() : []));
  protected readonly sourceNames = computed(() => new Map(this.sourceList().map((source) => [source.id, source.shortTitle])));

  protected readonly sourceId = signal<string | null>(null);
  protected readonly query = signal('');
  private readonly debouncedQuery = toSignal(toObservable(this.query).pipe(debounceTime(SEARCH_DEBOUNCE_MS)), { initialValue: '' });
  protected readonly fragments = rxResource({
    params: () => ({ sourceId: this.sourceId() ?? undefined, q: this.debouncedQuery().trim() || undefined }),
    stream: ({ params }) => this.api.fragments(params),
  });
  protected readonly fragmentList = computed(() => (this.fragments.hasValue() ? this.fragments.value() : []));
  protected readonly selectedSource = computed(() => this.sourceList().find((source) => source.id === this.sourceId()) ?? null);

  protected readonly modelQuery = signal('');
  protected readonly competencies = computed(() => {
    const model = this.reference.model();
    if (!model) return [];
    const query = this.modelQuery().trim().toLocaleLowerCase('pl');
    return model.competencies
      .map((competency) => ({
        competency,
        name: CRITERIA[competency.id as CriterionId]?.name ?? competency.name,
        indicators: query
          ? competency.indicators.filter((indicator) =>
              `${indicator.text} ${indicator.behaviors.map((b) => b.description).join(' ')}`.toLocaleLowerCase('pl').includes(query),
            )
          : competency.indicators,
      }))
      .filter((item) => !query || item.name.toLocaleLowerCase('pl').includes(query) || item.indicators.length > 0);
  });
  protected readonly modelStats = computed(() => {
    const competencies = this.reference.model()?.competencies ?? [];
    const indicators = competencies.flatMap((competency) => competency.indicators);
    return {
      competencies: competencies.length,
      indicators: indicators.length,
      behaviors: indicators.reduce((sum, indicator) => sum + indicator.behaviors.length, 0),
    };
  });

  constructor() {
    inject(BreadcrumbStore).set([{ label: 'Baza wiedzy' }]);
  }

  protected selectSource(id: string | null): void {
    this.sourceId.set(this.sourceId() === id ? null : id);
  }

  protected openFragment(fragment: SourceFragment): void {
    this.dialogs.drawer<void, SourceDrawerData>(SourceDrawerComponent, {
      data: { fragmentId: fragment.id },
      labelledBy: 'kp-source-title',
      width: '560px',
    });
  }

  protected clearSearch(): void {
    this.query.set('');
    this.sourceId.set(null);
  }
}
