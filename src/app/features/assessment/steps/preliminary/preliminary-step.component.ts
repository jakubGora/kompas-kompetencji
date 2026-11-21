import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormField, disabled, form, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import type { AssessmentCase, PreliminaryMeeting, TopicStatus } from '@core/domain/assessment.model';
import { criterionName, criterionShortName, type CriterionId } from '@core/domain/criteria';
import { isAfter, isBefore } from '@core/domain/date';
import { preliminaryTopicsFor, type TopicDefinition } from '@core/domain/workflow';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { employeeNoun } from '@shared/presentation/person-forms';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { firstValueFrom } from 'rxjs';
import { autosave, optional } from '../../data/autosave';
import { CaseStore } from '../../data/case.store';
import { StepHeaderAsideDirective } from '../../workspace/step-header-aside';
import { StepFrameComponent } from '../../workspace/step-frame.component';
import { ExpectationDialogComponent, type ExpectationDialogData } from './expectation-dialog.component';
import { SignPartOneDialogComponent, type SignPartOneData, type SignPartOneResult } from './sign-part-one-dialog.component';
import { TopicDialogComponent, type TopicDialogData, type TopicDialogResult } from './topic-dialog.component';

interface PreliminaryForm {
  notes: string;
  assessmentDueDate: string;
  reportFrom: string;
  reportTo: string;
}

interface ExpectationRow {
  readonly id: CriterionId;
  readonly label: string;
  readonly text: string;
  /** Zaznaczone — oczekiwanie omówione i wpisane do części I; niezaznaczone — szkic asystenta albo brak opisu. */
  readonly agreed: boolean;
}

function toForm(c: AssessmentCase): PreliminaryForm {
  const p = c.preliminary;
  return {
    notes: p.notes,
    assessmentDueDate: p.assessmentDueDate ?? (c.path === 'periodic' ? c.deadlines.dueDate : ''),
    reportFrom: p.reportWindow?.from ?? '',
    reportTo: p.reportWindow?.to ?? '',
  };
}

function toPatch(value: PreliminaryForm, path: AssessmentCase['path']): Partial<PreliminaryMeeting> {
  return path === 'first'
    ? { notes: value.notes, reportWindow: { from: optional(value.reportFrom), to: optional(value.reportTo) } }
    : { notes: value.notes, assessmentDueDate: optional(value.assessmentDueDate) };
}

@Component({
  selector: 'kp-preliminary-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepFrameComponent, StepHeaderAsideDirective, FormField, ButtonComponent, KpDatePipe],
  templateUrl: './preliminary-step.component.html',
  styleUrl: './preliminary-step.component.scss',
})
export class PreliminaryStepComponent {
  protected readonly store = inject(CaseStore);
  private readonly dialogs = inject(DialogService);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly c = computed(() => this.store.snapshot());
  protected readonly isFirst = computed(() => this.c().path === 'first');
  protected readonly editable = computed(() => this.store.isEditable('rozmowa-wstepna'));
  protected readonly completedAt = computed(() => this.c().steps['rozmowa-wstepna']?.completedAt);
  protected readonly topics = computed(() => preliminaryTopicsFor(this.c().path));
  protected readonly deadlines = computed(() => this.c().deadlines);
  protected readonly noun = computed(() => employeeNoun(this.c().employee.firstName));
  protected readonly meetingOnTime = computed(() => {
    const meeting = this.c().preliminary.meetingDate;
    return !meeting || !isAfter(meeting, this.deadlines().preliminaryDueDate);
  });
  protected readonly goals = computed(() => this.c().preliminary.goals.filter((goal) => goal.text.trim()));

  private readonly drafts = signal<Partial<Record<CriterionId, string>>>({});
  protected readonly expectations = computed<readonly ExpectationRow[]>(() => {
    const saved = this.c().preliminary.expectations;
    return this.store.criteria().map((id) => {
      const text = saved.find((item) => item.criterionId === id)?.text.trim() ?? '';
      return { id, label: criterionShortName(id), text: text || (this.drafts()[id] ?? ''), agreed: Boolean(text) };
    });
  });

  private readonly model = signal<PreliminaryForm>(toForm(this.store.snapshot()));

  protected readonly f = form(this.model, (p) => {
    disabled(p, () => !this.editable());
    required(p.assessmentDueDate, { message: 'Podaj termin sporządzenia oceny.', when: () => !this.isFirst() });
    validate(p.assessmentDueDate, ({ value }) =>
      value() && isAfter(value(), this.deadlines().dueDate)
        ? { kind: 'max', message: 'Termin nie może być późniejszy niż termin ustawowy.' }
        : null,
    );
    required(p.reportFrom, { message: 'Podaj początek terminu.', when: () => this.isFirst() });
    required(p.reportTo, { message: 'Podaj koniec terminu.', when: () => this.isFirst() });
    validate(p.reportFrom, ({ value }) => {
      const start = this.deadlines().windowStart;
      return value() && start && isBefore(value(), start)
        ? { kind: 'min', message: 'Najwcześniej po 8 miesiącach od zatrudnienia (§ 4 ust. 1).' }
        : null;
    });
    validate(p.reportTo, ({ value, valueOf }) => {
      if (!value()) return null;
      if (valueOf(p.reportFrom) && isBefore(value(), valueOf(p.reportFrom))) {
        return { kind: 'order', message: 'Koniec terminu nie może poprzedzać początku.' };
      }
      return isAfter(value(), this.deadlines().dueDate)
        ? { kind: 'max', message: 'Ocena musi nastąpić najpóźniej miesiąc przed końcem umowy.' }
        : null;
    });
  });

  constructor() {
    autosave(this.model, (value) => this.store.patch({ preliminary: toPatch(value, this.c().path) }));
    // Domyślny termin oceny to termin ustawowy — oceniający może go skrócić.
    const initial = this.store.snapshot();
    if (this.editable() && !this.isFirst() && !initial.preliminary.assessmentDueDate) {
      this.store.patch({ preliminary: { assessmentDueDate: initial.deadlines.dueDate } });
    }

    // Asystent szkicuje oczekiwania do kryteriów bez opisu; szkic trafia do części I dopiero po zaznaczeniu.
    let requested = false;
    effect(() => {
      if (requested || !this.editable() || this.store.busy()) return;
      if (this.expectations().every((row) => row.text)) return;
      requested = true;
      untracked(() => void this.loadDrafts());
    });
  }

  private async loadDrafts(): Promise<void> {
    const drafts = await this.store.draftExpectations();
    if (!drafts) return;
    this.drafts.update((current) => ({
      ...Object.fromEntries(drafts.filter((draft) => draft.text.trim()).map((draft) => [draft.criterionId, draft.text])),
      ...current,
    }));
  }

  // — Tematy —

  protected topicStatus(topic: TopicDefinition): TopicStatus | null {
    return this.c().preliminary.topics[topic.id] ?? null;
  }

  protected toggleTopic(topic: TopicDefinition, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked && topic.id === 'cele' && this.goals().length === 0) {
      input.checked = false;
      void this.editTopic(topic);
      return;
    }
    this.setTopic(topic, input.checked ? 'omowiono' : null);
  }

  protected async editTopic(topic: TopicDefinition): Promise<void> {
    const ref = this.dialogs.open<TopicDialogResult, TopicDialogData, TopicDialogComponent>(TopicDialogComponent, {
      data: this.topicData(topic),
      width: '600px',
      labelledBy: 'kp-topic-title',
    });
    const result = await firstValueFrom(ref.closed);
    if (!result) return;
    if (result.goals) {
      this.store.patch({ preliminary: { goals: result.goals } });
    }
    this.setTopic(topic, result.status);
  }

  private setTopic(topic: TopicDefinition, status: TopicStatus | null): void {
    const topics: Record<string, TopicStatus> = { ...this.c().preliminary.topics };
    if (status) topics[topic.id] = status;
    else delete topics[topic.id];
    this.store.patch({ preliminary: { topics } });
  }

  private topicData(topic: TopicDefinition): TopicDialogData {
    const c = this.c();
    const base = { topic, status: this.topicStatus(topic), noun: this.noun() };
    switch (topic.id) {
      case 'obowiazki':
        return { ...base, items: { heading: `Zadania z OSP (${c.position.documentName})`, entries: c.position.tasks.map((task) => task.text) } };
      case 'kryteria':
        return { ...base, items: { heading: 'Kryteria w arkuszu', entries: this.store.criteria().map(criterionName) } };
      case 'cele':
        return { ...base, goals: c.preliminary.goals };
      case 'oczekiwania':
      case 'postawa':
        return { ...base, note: 'Oczekiwania do każdego kryterium opisujesz w karcie „Oczekiwania” — zaznacz je po omówieniu.' };
      case 'sprawozdanie':
        return { ...base, note: 'Termin złożenia sprawozdania wpisujesz pod listą tematów.' };
      default:
        return base;
    }
  }

  // — Oczekiwania —

  protected toggleExpectation(row: ExpectationRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      if (!row.text) {
        input.checked = false;
        void this.editExpectation(row);
        return;
      }
      this.saveExpectation(row.id, row.text);
      return;
    }
    this.drafts.update((current) => ({ ...current, [row.id]: row.text }));
    this.store.patch({
      preliminary: { expectations: this.c().preliminary.expectations.filter((item) => item.criterionId !== row.id) },
    });
  }

  protected async editExpectation(row: ExpectationRow): Promise<void> {
    const ref = this.dialogs.open<string, ExpectationDialogData, ExpectationDialogComponent>(ExpectationDialogComponent, {
      data: { criterionName: criterionName(row.id), text: row.text, drafted: !row.agreed && Boolean(row.text) },
      width: '600px',
      labelledBy: 'kp-expectation-title',
    });
    const text = await firstValueFrom(ref.closed);
    if (text) this.saveExpectation(row.id, text);
  }

  private saveExpectation(id: CriterionId, text: string): void {
    const others = this.c().preliminary.expectations.filter((item) => item.criterionId !== id);
    this.store.patch({ preliminary: { expectations: [...others, { criterionId: id, text }] } });
  }

  // — Podpis części I i dokument —

  protected readonly sign = async (): Promise<boolean> => {
    const p = this.c().preliminary;
    const ref = this.dialogs.open<SignPartOneResult, SignPartOneData, SignPartOneDialogComponent>(SignPartOneDialogComponent, {
      data: {
        path: this.c().path,
        today: this.session.today(),
        dueDate: this.deadlines().preliminaryDueDate,
        noun: this.noun(),
        ...(p.meetingDate ? { meetingDate: p.meetingDate } : {}),
        ...(p.employeeAcknowledgedAt ? { acknowledgedAt: p.employeeAcknowledgedAt } : {}),
      },
      width: '520px',
      labelledBy: 'kp-sign-title',
    });
    const result = await firstValueFrom(ref.closed);
    if (!result) return false;
    this.store.patch({ preliminary: { meetingDate: result.meetingDate, employeeAcknowledgedAt: result.acknowledgedAt } });
    return true;
  };

  protected async downloadPartOne(): Promise<void> {
    if (this.editable()) {
      const error = await this.store.generateDocument('czesc-i');
      if (error) return;
    }
    await this.router.navigate([this.store.baseUrl(), 'arkusz']);
  }
}
