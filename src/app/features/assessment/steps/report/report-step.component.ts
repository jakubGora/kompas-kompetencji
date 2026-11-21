import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, disabled, form, hidden, required, validate } from '@angular/forms/signals';
import type { EmployeeReport } from '@core/domain/assessment.model';
import { addMonths, isAfter, isBefore } from '@core/domain/date';
import { reportOnTime } from '@core/domain/workflow';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { BadgeComponent } from '@shared/ui/badge/badge.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { autosave, optional } from '../../data/autosave';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';

interface ReportForm {
  status: 'zlozone' | 'niezlozone' | '';
  submittedAt: string;
  coverageFrom: string;
  coverageTo: string;
  tasks: string;
  problems: string;
  skills: string;
  improvements: string;
}

const SUMMARY_FIELDS: readonly { readonly key: 'tasks' | 'problems' | 'skills' | 'improvements'; readonly label: string }[] = [
  { key: 'tasks', label: 'Wykonywane zadania' },
  { key: 'problems', label: 'Napotkane problemy i sposób ich rozwiązania' },
  { key: 'skills', label: 'Zdobyta wiedza i umiejętności' },
  { key: 'improvements', label: 'Propozycje usprawnień' },
];

@Component({
  selector: 'kp-report-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepFrameComponent, FormField, FormFieldComponent, ControlDirective, BadgeComponent, KpDatePipe],
  template: `
    <kp-step-frame stepId="sprawozdanie" completeLabel="Zapisz sprawozdanie">
      <section class="kp-card" aria-labelledby="kp-report-title">
        <div class="kp-card__header">
          <div>
            <p class="kp-eyebrow">§ 4–6 rozporządzenia z 2015 r.</p>
            <h3 class="kp-card__title" id="kp-report-title">Sprawozdanie ocenianego</h3>
            @if (window(); as w) {
              <p class="kp-card__subtitle">Termin z rozmowy wstępnej: {{ w.from | kpDate }} – {{ w.to | kpDate }}</p>
            }
          </div>
          @switch (onTime()) {
            @case (true) {
              <kp-badge tone="success" icon="check-circle">Złożone w terminie</kp-badge>
            }
            @case (false) {
              <kp-badge tone="danger" icon="alert-circle">Poza terminem</kp-badge>
            }
          }
        </div>

        <fieldset class="kp-fieldset kp-report__status" [disabled]="!editable()">
          <legend class="kp-visually-hidden">Czy sprawozdanie złożono?</legend>
          <label class="kp-choice">
            <input type="radio" value="zlozone" [formField]="f.status" />
            <span class="kp-choice__body">
              <span class="kp-choice__title">Sprawozdanie złożone</span>
              <span class="kp-choice__description">Odnotuj datę wpływu i okres, którego dotyczy.</span>
            </span>
          </label>
          <label class="kp-choice">
            <input type="radio" value="niezlozone" [formField]="f.status" />
            <span class="kp-choice__body">
              <span class="kp-choice__title">Niezłożone w terminie</span>
              <span class="kp-choice__description">Warunek z § 10 ust. 1 pkt 2 nie będzie spełniony.</span>
            </span>
          </label>
        </fieldset>

        @if (model().status === 'zlozone') {
          <div class="kp-report__dates">
            <kp-field label="Data złożenia" [field]="f.submittedAt">
              <input kpControl type="date" class="kp-input" [formField]="f.submittedAt" />
            </kp-field>
            <kp-field label="Okres pracy od" [field]="f.coverageFrom">
              <input kpControl type="date" class="kp-input" [formField]="f.coverageFrom" />
            </kp-field>
            <kp-field label="Okres pracy do" [field]="f.coverageTo" hint="Co najmniej 7 miesięcy (§ 6 ust. 1).">
              <input kpControl type="date" class="kp-input" [formField]="f.coverageTo" />
            </kp-field>
          </div>

          <h4 class="kp-report__subhead">Treść sprawozdania — streszczenie</h4>
          <div class="kp-report__summary">
            @for (field of summaryFields; track field.key) {
              <kp-field [label]="field.label" [optionalHint]="true" [field]="f[field.key]">
                <textarea kpControl class="kp-textarea" rows="3" [formField]="f[field.key]"></textarea>
              </kp-field>
            }
          </div>
        }
      </section>
    </kp-step-frame>
  `,
  styles: `
    .kp-report__status {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
      gap: var(--kp-space-2);
    }
    .kp-report__dates {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
      gap: var(--kp-space-4);
      margin-top: var(--kp-space-5);
    }
    .kp-report__subhead {
      margin: var(--kp-space-5) 0 var(--kp-space-3);
      font-size: var(--kp-font-size-sm);
      font-weight: 600;
    }
    .kp-report__summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
      gap: var(--kp-space-4);
    }
  `,
})
export class ReportStepComponent {
  private readonly store = inject(CaseStore);
  private readonly session = inject(SessionStore);
  protected readonly summaryFields = SUMMARY_FIELDS;

  protected readonly editable = computed(() => this.store.isEditable('sprawozdanie'));
  protected readonly window = computed(() => {
    const w = this.store.snapshot().preliminary.reportWindow;
    return w?.from && w.to ? { from: w.from, to: w.to } : null;
  });
  protected readonly onTime = computed(() => reportOnTime(this.store.snapshot()));

  protected readonly model = signal<ReportForm>(this.initial());

  protected readonly f = form(this.model, (p) => {
    disabled(p, () => !this.editable());
    hidden(p.submittedAt, ({ valueOf }) => valueOf(p.status) !== 'zlozone');
    required(p.submittedAt, { message: 'Podaj datę złożenia sprawozdania.' });
    validate(p.submittedAt, ({ value }) =>
      value() && isAfter(value(), this.session.today())
        ? { kind: 'future', message: 'Data nie może być z przyszłości.' }
        : null,
    );
    validate(p.coverageTo, ({ value, valueOf }) => {
      const from = valueOf(p.coverageFrom);
      if (!value() || !from) return null;
      if (isBefore(value(), from)) return { kind: 'order', message: 'Koniec okresu nie może poprzedzać początku.' };
      return isBefore(value(), addMonths(from, 7))
        ? { kind: 'coverage', message: 'Sprawozdanie obejmuje mniej niż 7 miesięcy pracy.' }
        : null;
    });
  });

  constructor() {
    autosave(this.model, (value) => {
      const submitted = value.status === 'zlozone';
      const patch: Partial<EmployeeReport> = {
        status: value.status || undefined,
        submittedAt: submitted ? optional(value.submittedAt) : undefined,
        coverage: submitted ? { from: optional(value.coverageFrom), to: optional(value.coverageTo) } : undefined,
        summary: { tasks: value.tasks, problems: value.problems, skills: value.skills, improvements: value.improvements },
      };
      this.store.patch({ report: patch });
    });
  }

  private initial(): ReportForm {
    const r = this.store.snapshot().report;
    return {
      status: r.status ?? '',
      submittedAt: r.submittedAt ?? '',
      coverageFrom: r.coverage?.from ?? '',
      coverageTo: r.coverage?.to ?? '',
      ...r.summary,
    };
  }
}
