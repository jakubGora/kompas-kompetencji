import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { CandidateDetail, CandidatePatch } from '@core/api/api.types';
import { RecruitmentApi } from '@core/api/recruitment.api';
import { criterionName, type CriterionId } from '@core/domain/criteria';
import { RECRUITMENT_STAGES, type CommitteeRating, type RecruitmentStage } from '@core/domain/recruitment.model';
import { toApiError } from '@core/http/api-error';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { SaveStatusComponent, type SaveState } from '@shared/ui/save-status/save-status.component';
import { PageSkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { firstValueFrom } from 'rxjs';
import { COMMITTEE_RATINGS, FORMAL_STATUS, RATING_INFO, formalStatus } from './recruitment-presentation';

const NOTE_LIMIT = 2000;
const NOTE_DEBOUNCE_MS = 800;

@Component({
  selector: 'kp-candidate-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    EmptyStateComponent,
    IconComponent,
    PageSkeletonComponent,
    SaveStatusComponent,
    KpDatePipe,
  ],
  templateUrl: './candidate.page.html',
  styleUrl: './candidate.page.scss',
})
export class CandidatePage {
  private readonly api = inject(RecruitmentApi);
  private readonly toast = inject(ToastService);
  private readonly breadcrumbs = inject(BreadcrumbStore);

  readonly candidateId = input.required<string>();

  protected readonly stages = RECRUITMENT_STAGES;
  protected readonly ratings = COMMITTEE_RATINGS;
  protected readonly ratingInfo = RATING_INFO;
  protected readonly formalInfo = FORMAL_STATUS;
  protected readonly noteLimit = NOTE_LIMIT;

  protected readonly detail = rxResource({
    params: () => this.candidateId(),
    stream: ({ params }) => this.api.candidate(params),
  });
  private readonly current = linkedSignal<CandidateDetail | null>(() => (this.detail.hasValue() ? this.detail.value() : null));
  protected readonly data = this.current.asReadonly();
  protected readonly errorStatus = computed(() => (this.detail.error() ? toApiError(this.detail.error()).status : null));

  protected readonly formal = computed(() => {
    const candidate = this.data()?.candidate;
    return candidate ? formalStatus(candidate) : null;
  });
  protected readonly competencies = computed(() => {
    const d = this.data();
    if (!d) return [];
    return d.recruitment.competencyIds.map((id) => {
      const evidence = d.candidate.evidence.filter((item) => item.competencyId === id);
      return {
        id,
        name: criterionName(id),
        evidence,
        rating: evidence.find((item) => item.rating)?.rating ?? null,
        questions: evidence.map((item) => item.followUpQuestion).filter((question): question is string => Boolean(question)),
      };
    });
  });
  protected readonly withoutEvidence = computed(() => this.competencies().filter((item) => item.evidence.length === 0).length);

  protected readonly note = linkedSignal(() => this.data()?.candidate.committeeNote ?? '');
  protected readonly noteState = signal<SaveState>({ status: 'idle' });
  protected readonly savingStage = signal(false);
  private noteTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const d = this.data();
      this.breadcrumbs.set([
        { label: 'Rekrutacje', link: '/rekrutacje' },
        ...(d ? [{ label: d.recruitment.reference, link: '/rekrutacje' }, { label: d.candidate.fullName }] : [{ label: 'Kandydat' }]),
      ]);
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.noteTimer) {
        clearTimeout(this.noteTimer);
        void this.saveNote();
      }
    });
  }

  protected async changeStage(stage: string): Promise<void> {
    const target = RECRUITMENT_STAGES.find((item) => item.id === stage);
    if (!target) return;
    this.savingStage.set(true);
    const saved = await this.patch({ stage: target.id as RecruitmentStage });
    this.savingStage.set(false);
    if (saved) this.toast.success('Zmieniono etap', target.label);
  }

  protected rate(competencyId: CriterionId, rating: CommitteeRating | null): void {
    void this.patch({ ratings: [{ competencyId, rating }] });
  }

  protected onNote(value: string): void {
    this.note.set(value.slice(0, NOTE_LIMIT));
    this.noteState.set({ status: 'dirty' });
    clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => void this.saveNote(), NOTE_DEBOUNCE_MS);
  }

  protected retryNote(): void {
    void this.saveNote();
  }

  private async saveNote(): Promise<void> {
    this.noteTimer = undefined;
    this.noteState.set({ status: 'saving' });
    const saved = await this.patch({ committeeNote: this.note() });
    this.noteState.set({ status: saved ? 'saved' : 'error' });
  }

  private async patch(patch: CandidatePatch): Promise<boolean> {
    const d = this.data();
    if (!d) return false;
    try {
      const candidate = await firstValueFrom(this.api.updateCandidate(d.candidate.id, patch));
      this.current.set({ ...d, candidate: { ...candidate, committeeNote: this.note() } });
      return true;
    } catch (error) {
      this.toast.error('Nie zapisano zmian', toApiError(error).message);
      return false;
    }
  }
}
