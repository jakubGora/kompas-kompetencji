import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CasesApi } from '@core/api/cases.api';
import { formatDateLongPl, pluralPl } from '@core/domain/date';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe, KpScorePipe } from '@shared/pipes/format.pipes';
import { OUTCOME_TONE, byUrgency, caseKindLabel } from '@shared/presentation/case-presentation';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DueChipComponent } from '@shared/ui/due-chip/due-chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { CaseCardComponent } from './case-card.component';

@Component({
  selector: 'kp-my-assessments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    CaseCardComponent,
    DueChipComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    KpDatePipe,
    KpScorePipe,
  ],
  templateUrl: './my-assessments.page.html',
  styleUrl: './my-assessments.page.scss',
})
export class MyAssessmentsPage {
  private readonly api = inject(CasesApi);
  protected readonly session = inject(SessionStore);
  protected readonly outcomeTone = OUTCOME_TONE;
  protected readonly kindLabel = caseKindLabel;

  protected readonly cases = rxResource({ stream: () => this.api.list('mine') });

  private readonly all = computed(() => (this.cases.hasValue() ? this.cases.value() : []));
  private readonly asEvaluator = computed(() => this.all().filter((c) => c.evaluator.id === this.session.user()?.id));

  protected readonly active = computed(() =>
    this.asEvaluator()
      .filter((c) => c.status === 'w-toku')
      .sort(byUrgency),
  );
  protected readonly focus = computed(() => this.active()[0] ?? null);
  protected readonly others = computed(() => this.active().slice(1));
  protected readonly attentionCount = computed(() => this.active().filter((c) => c.attention.length > 0).length);
  protected readonly completed = computed(() =>
    this.asEvaluator()
      .filter((c) => c.status === 'zakonczona')
      .sort((a, b) => (b.completedAt ?? b.dueDate).localeCompare(a.completedAt ?? a.dueDate)),
  );
  protected readonly asHeadOfUnit = computed(() =>
    this.all()
      .filter((c) => c.evaluator.id !== this.session.user()?.id)
      .sort(byUrgency),
  );

  protected readonly todayLabel = computed(() => formatDateLongPl(this.session.today()));
  protected readonly greeting = computed(() => {
    const name = this.session.firstName();
    return name ? `Dzień dobry, ${name}` : 'Dzień dobry';
  });
  protected readonly summary = computed(() => {
    const count = this.active().length;
    if (count === 0) return 'Nie masz ocen w toku. Zakończone oceny i terminy kolejnych znajdziesz poniżej.';
    const cases = `${count} ${pluralPl(count, ['ocenę', 'oceny', 'ocen'])}`;
    const attention = this.attentionCount();
    return attention > 0
      ? `Prowadzisz ${cases} — ${attention} ${pluralPl(attention, ['wymaga', 'wymagają', 'wymaga'])} uwagi.`
      : `Prowadzisz ${cases}. Żaden termin nie jest zagrożony.`;
  });

  constructor() {
    inject(BreadcrumbStore).set([{ label: 'Moje oceny' }]);
  }
}
