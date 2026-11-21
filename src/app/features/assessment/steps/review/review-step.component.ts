import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, disabled, form, required, validate } from '@angular/forms/signals';
import { criterionName } from '@core/domain/criteria';
import { isAfter } from '@core/domain/date';
import { reviewTopicsFor } from '@core/domain/workflow';
import { SessionStore } from '@core/session/session.store';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { autosave, optional } from '../../data/autosave';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';
import { applyTopicChange, type TopicChange } from '../shared/topic-checklist.component';

interface ReviewForm {
  meetingDate: string;
  notes: string;
  employeePerspective: string;
  developmentNeeds: string;
  headOfUnitPresent: boolean;
}

@Component({
  selector: 'kp-review-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StepFrameComponent,
    FormField,
    FormFieldComponent,
    ControlDirective,
    ButtonComponent,
    CalloutComponent,
    IconComponent,
  ],
  templateUrl: './review-step.component.html',
  styleUrl: './review-step.component.scss',
})
export class ReviewStepComponent {
  protected readonly store = inject(CaseStore);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  protected readonly c = computed(() => this.store.snapshot());
  protected readonly isFirst = computed(() => this.c().path === 'first');
  protected readonly editable = computed(() => this.store.isEditable('rozmowa-oceniajaca'));
  protected readonly topics = computed(() => reviewTopicsFor(this.c().path));
  protected readonly plan = this.store.plan;
  protected readonly employeeFirst = computed(() => this.c().employee.firstName);
  protected readonly agendaRef = computed(() => (this.isFirst() ? '§ 7 rozporządzenia z 2015 r.' : '§ 10 rozporządzenia z 2016 r.'));
  protected readonly questionCards = computed(() => {
    const plan = this.plan();
    if (!plan) return [];
    return plan.items
      .filter((item) => item.questions.length > 0)
      .map((item) => ({
        id: item.criterionId,
        name: criterionName(item.criterionId),
        questions: item.questions,
        facts: item.facts.length,
        gaps: item.gaps.length,
      }));
  });

  private readonly model = signal<ReviewForm>(this.initial());

  protected readonly f = form(this.model, (p) => {
    disabled(p, () => !this.editable());
    required(p.meetingDate, { message: 'Podaj datę rozmowy.' });
    validate(p.meetingDate, ({ value }) =>
      value() && isAfter(value(), this.session.today())
        ? { kind: 'future', message: 'Data rozmowy nie może być z przyszłości.' }
        : null,
    );
    required(p.notes, { message: 'Zapisz wnioski z rozmowy.' });
  });

  constructor() {
    autosave(this.model, (value) =>
      this.store.patch({
        review: {
          meetingDate: optional(value.meetingDate),
          notes: value.notes,
          employeePerspective: value.employeePerspective,
          developmentNeeds: value.developmentNeeds,
          ...(this.isFirst() ? { headOfUnitPresent: value.headOfUnitPresent } : {}),
        },
      }),
    );
  }

  protected topicChecked(id: string): boolean {
    return this.c().review.topics[id] != null;
  }

  protected toggleTopic(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const change: TopicChange = { id, status: checked ? 'omowiono' : null };
    this.store.patch({ review: { topics: applyTopicChange(this.c().review.topics, change) } });
  }

  protected async prepare(): Promise<void> {
    const plan = await this.store.conversationPlan();
    if (plan) {
      this.toast.success('Plan rozmowy gotowy', 'Pytania powstały z obserwacji i oczekiwań — możesz je wykorzystać podczas rozmowy.');
    }
  }

  protected async downloadCard(): Promise<void> {
    if (!this.plan()) {
      await this.prepare();
    }
    const error = await this.store.generateDocument('plan-rozmowy');
    if (error) {
      this.toast.error('Nie udało się przygotować karty', error.message);
      return;
    }
    this.toast.success('Karta rozmowy gotowa', 'Możesz ją wydrukować albo zapisać jako PDF.');
    window.print();
  }

  protected setToday(): void {
    this.f.meetingDate().value.set(this.session.today());
  }

  private initial(): ReviewForm {
    const r = this.store.snapshot().review;
    return {
      meetingDate: r.meetingDate ?? '',
      notes: r.notes,
      employeePerspective: r.employeePerspective,
      developmentNeeds: r.developmentNeeds,
      headOfUnitPresent: r.headOfUnitPresent ?? false,
    };
  }
}
