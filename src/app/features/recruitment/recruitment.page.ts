import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { RecruitmentApi } from '@core/api/recruitment.api';
import { criterionName } from '@core/domain/criteria';
import { RECRUITMENT_STAGES } from '@core/domain/recruitment.model';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { KpDatePipe, KpPluralPipe } from '@shared/pipes/format.pipes';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DueChipComponent } from '@shared/ui/due-chip/due-chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { FORMAL_STATUS, formalStatus, ratedCount } from './recruitment-presentation';

@Component({
  selector: 'kp-recruitment-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    DueChipComponent,
    EmptyStateComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    KpDatePipe,
    KpPluralPipe,
  ],
  templateUrl: './recruitment.page.html',
  styleUrl: './recruitment.page.scss',
})
export class RecruitmentPage {
  private readonly api = inject(RecruitmentApi);
  private readonly router = inject(Router);

  /** `?nabor=` — wybrany nabór; domyślnie pierwszy otwarty. */
  readonly nabor = input<string>();

  protected readonly stages = RECRUITMENT_STAGES;
  protected readonly formalInfo = FORMAL_STATUS;
  protected readonly formalOf = formalStatus;
  protected readonly ratedOf = ratedCount;
  protected readonly competencyName = criterionName;

  protected readonly recruitments = rxResource({ stream: () => this.api.list() });
  protected readonly list = computed(() => (this.recruitments.hasValue() ? this.recruitments.value() : []));
  protected readonly selectedId = computed(() => {
    const requested = this.nabor();
    const list = this.list();
    return list.find((item) => item.id === requested)?.id ?? list.find((item) => item.status === 'otwarta')?.id ?? list[0]?.id ?? null;
  });

  protected readonly detail = rxResource({
    params: () => this.selectedId() ?? undefined,
    stream: ({ params }) => this.api.get(params),
  });
  protected readonly recruitment = computed(() => (this.detail.hasValue() ? this.detail.value().recruitment : null));
  protected readonly columns = computed(() => {
    const candidates = this.detail.hasValue() ? this.detail.value().candidates : [];
    return this.stages.map((stage) => ({ ...stage, candidates: candidates.filter((candidate) => candidate.stage === stage.id) }));
  });

  constructor() {
    inject(BreadcrumbStore).set([{ label: 'Rekrutacje' }]);
  }

  protected select(id: string): void {
    void this.router.navigate([], { queryParams: { nabor: id }, replaceUrl: true });
  }
}
