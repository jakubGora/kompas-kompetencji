import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, disabled, form, hidden, required, validate } from '@angular/forms/signals';
import type { CaseConclusion, HeadOfUnitRequest, PromotionRequest } from '@core/domain/assessment.model';
import { criterionName } from '@core/domain/criteria';
import { isAfter, isBefore } from '@core/domain/date';
import { nextAssessmentDueDate, objectionDeadline } from '@core/domain/deadlines';
import { scaleFor } from '@core/domain/scales';
import { caseOutcome, ratingFor } from '@core/domain/workflow';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe, KpScorePipe } from '@shared/pipes/format.pipes';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { autosave, optional } from '../../data/autosave';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';

interface SummaryForm {
  justification: string;
  developmentPlan: string;
  promotionRequest: PromotionRequest | '';
  promotionJustification: string;
  draftedAt: string;
  headOfUnitConfirmedAt: string;
  headOfUnitRequest: HeadOfUnitRequest | '';
}

const HEAD_OF_UNIT_REQUESTS: readonly { readonly id: HeadOfUnitRequest; readonly label: string; readonly forOutcome: 'pozytywna' | 'negatywna' }[] = [
  { id: 'umowa-na-czas-nieokreslony', label: 'Zawarcie umowy na czas nieokreślony', forOutcome: 'pozytywna' },
  { id: 'niezawieranie-umowy', label: 'Niezawieranie umowy na czas nieokreślony', forOutcome: 'negatywna' },
  { id: 'rozwiazanie-umowy', label: 'Rozwiązanie umowy o pracę', forOutcome: 'negatywna' },
];

@Component({
  selector: 'kp-summary-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StepFrameComponent,
    RouterLink,
    FormField,
    FormFieldComponent,
    ControlDirective,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    IconComponent,
    KpDatePipe,
    KpScorePipe,
    UpperCasePipe,
  ],
  templateUrl: './summary-step.component.html',
  styleUrl: './summary-step.component.scss',
})
export class SummaryStepComponent {
  protected readonly store = inject(CaseStore);
  private readonly session = inject(SessionStore);
  private readonly dialogs = inject(DialogService);
  private readonly toast = inject(ToastService);

  protected readonly c = computed(() => this.store.snapshot());
  protected readonly isFirst = computed(() => this.c().path === 'first');
  protected readonly k = computed(() => this.c().conclusion);
  protected readonly acknowledged = computed(() => Boolean(this.k().employeeAcknowledgedAt));
  protected readonly editable = computed(() => this.store.isEditable('podsumowanie') && !this.acknowledged());
  protected readonly outcome = computed(() => caseOutcome(this.c()));
  protected readonly periodic = computed(() => {
    const result = this.store.result();
    return result?.path === 'periodic' ? result.periodic : null;
  });
  protected readonly first = computed(() => {
    const result = this.store.result();
    return result?.path === 'first' ? result.first : null;
  });
  protected readonly showPromotion = computed(
    () => !this.isFirst() && this.c().employee.status === 'urzednik-sc' && this.outcome() === 'pozytywna',
  );
  protected readonly requests = computed(() =>
    HEAD_OF_UNIT_REQUESTS.filter((option) => !this.outcome() || option.forOutcome === this.outcome()),
  );
  protected readonly sheetKind = computed(() => (this.isFirst() ? 'arkusz-pierwszej-oceny' : 'arkusz-okresowy'));
  protected readonly sheet = computed(() => this.c().documents.find((doc) => doc.kind === this.sheetKind()));

  protected readonly scaleColumns = computed(() => scaleFor(this.c().path));
  protected readonly scores = computed(() => {
    const scale = scaleFor(this.c().path);
    return this.store.criteria().map((id) => {
      const points = ratingFor(this.c(), id)?.decision?.points ?? null;
      return { id, name: criterionName(id), points, label: scale.find((option) => option.points === points)?.label ?? '' };
    });
  });

  protected readonly objectionUntil = computed(() => {
    const ack = this.k().employeeAcknowledgedAt;
    return ack && !this.isFirst() ? objectionDeadline(ack) : null;
  });
  protected readonly nextDue = computed(() => {
    const { draftedAt, employeeAcknowledgedAt } = this.k();
    const outcome = this.outcome();
    return !this.isFirst() && outcome && draftedAt && employeeAcknowledgedAt
      ? nextAssessmentDueDate(outcome, draftedAt, employeeAcknowledgedAt)
      : null;
  });

  protected readonly ackDate = signal(this.session.today());
  protected readonly ackError = signal<string | null>(null);

  private readonly model = signal<SummaryForm>(this.initial());

  protected readonly f = form(this.model, (p) => {
    disabled(p, () => !this.editable());
    required(p.justification, {
      message: 'Ocena negatywna wymaga uzasadnienia.',
      when: () => this.outcome() === 'negatywna',
    });
    required(p.developmentPlan, {
      message: 'Wpisz wnioski do indywidualnego programu rozwoju zawodowego.',
      when: () => !this.isFirst(),
    });
    hidden(p.promotionRequest, () => !this.showPromotion());
    required(p.promotionRequest, { message: 'Zdecyduj o wniosku (część III).' });
    hidden(p.promotionJustification, ({ valueOf }) => valueOf(p.promotionRequest) !== 'tak');
    required(p.promotionJustification, { message: 'Wniosek wymaga uzasadnienia.' });
    required(p.draftedAt, { message: 'Podaj datę sporządzenia oceny.' });
    validate(p.draftedAt, ({ value }) =>
      value() && isAfter(value(), this.session.today())
        ? { kind: 'future', message: 'Data nie może być z przyszłości.' }
        : null,
    );
    hidden(p.headOfUnitConfirmedAt, () => !this.isFirst());
    required(p.headOfUnitConfirmedAt, { message: 'Odnotuj potwierdzenie kierującego komórką.' });
    hidden(p.headOfUnitRequest, () => !this.isFirst());
  });

  constructor() {
    autosave(this.model, (value) => {
      const patch: Partial<CaseConclusion> = {
        justification: value.justification,
        developmentPlan: value.developmentPlan,
        promotionJustification: value.promotionJustification,
        draftedAt: optional(value.draftedAt),
        ...(this.showPromotion() ? { promotionRequest: value.promotionRequest || undefined } : {}),
        ...(this.isFirst()
          ? {
              headOfUnitConfirmedAt: optional(value.headOfUnitConfirmedAt),
              headOfUnitRequest: value.headOfUnitRequest || undefined,
            }
          : {}),
      };
      this.store.patch({ conclusion: patch });
    });
  }

  protected async draftJustification(): Promise<void> {
    if (this.model().justification.trim() && !(await this.confirmOverwrite('uzasadnienie'))) return;
    const draft = await this.store.draftJustification();
    if (!draft) return;
    this.model.update((value) => ({ ...value, justification: draft.text }));
    this.store.patch({ conclusion: { justificationAiDraft: true } });
    this.toast.info('Szkic uzasadnienia gotowy', `Na podstawie: ${draft.basedOn.join(', ')}. Sprawdź i popraw przed podpisem.`);
  }

  protected async draftDevelopmentPlan(): Promise<void> {
    if (this.model().developmentPlan.trim() && !(await this.confirmOverwrite('wnioski IPRZ'))) return;
    const draft = await this.store.draftDevelopmentPlan();
    if (!draft) return;
    this.model.update((value) => ({ ...value, developmentPlan: draft.text }));
    this.toast.info('Szkic wniosków rozwojowych gotowy', 'Uzgodnij je z ocenianym — to podstawa IPRZ.');
  }

  protected async generateSheet(): Promise<void> {
    const error = await this.store.generateDocument(this.sheetKind());
    if (error) return;
    const draftedAt = this.store.snapshot().conclusion.draftedAt ?? '';
    this.model.update((value) => ({ ...value, draftedAt }));
    this.toast.success('Arkusz gotowy do podpisu', 'Wydrukuj go albo zapisz jako PDF z podglądu.');
  }

  protected onAckDate(event: Event): void {
    this.ackDate.set((event.target as HTMLInputElement).value);
    this.ackError.set(null);
  }

  protected async acknowledge(): Promise<void> {
    const date = this.ackDate();
    const drafted = this.k().draftedAt;
    if (!date) return this.ackError.set('Podaj datę zapoznania.');
    if (isAfter(date, this.session.today())) return this.ackError.set('Data nie może być z przyszłości.');
    if (drafted && isBefore(date, drafted)) return this.ackError.set('Zapoznanie nie może poprzedzać sporządzenia oceny.');
    const error = await this.store.acknowledge(date);
    if (error) this.ackError.set(error.issues[0] ?? error.message);
  }

  protected setToday(): void {
    this.f.draftedAt().value.set(this.session.today());
  }

  protected shortLabel(points: number): string {
    switch (points) {
      case 1:
        return 'Znacznie poniżej';
      case 3:
        return 'Poniżej';
      case 5:
        return 'Na poziomie';
      case 7:
        return 'Powyżej';
      case 9:
        return 'Znacznie powyżej';
      default:
        return String(points);
    }
  }

  private confirmOverwrite(what: string): Promise<boolean> {
    return this.dialogs.confirm({
      title: 'Zastąpić obecny tekst?',
      message: `Asystent przygotuje nowy szkic i zastąpi ${what}. Twojej wersji nie da się przywrócić.`,
      confirmLabel: 'Zastąp szkicem',
    });
  }

  private initial(): SummaryForm {
    const k = this.store.snapshot().conclusion;
    return {
      justification: k.justification,
      developmentPlan: k.developmentPlan,
      promotionRequest: k.promotionRequest ?? '',
      promotionJustification: k.promotionJustification,
      draftedAt: k.draftedAt ?? '',
      headOfUnitConfirmedAt: k.headOfUnitConfirmedAt ?? '',
      headOfUnitRequest: k.headOfUnitRequest ?? '',
    };
  }
}
