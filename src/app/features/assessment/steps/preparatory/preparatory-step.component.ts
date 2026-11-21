import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, disabled, form, hidden, required } from '@angular/forms/signals';
import type { ExamExemption, ExamOutcome, PreparatoryService } from '@core/domain/assessment.model';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { autosave, optional } from '../../data/autosave';
import { CaseStore } from '../../data/case.store';
import { StepFrameComponent } from '../../workspace/step-frame.component';

interface PreparatoryForm {
  outcome: ExamOutcome | '';
  examDate: string;
  exemption: ExamExemption | '';
  note: string;
}

const OUTCOMES: readonly { readonly id: ExamOutcome; readonly label: string; readonly description: string }[] = [
  { id: 'zaliczony', label: 'Egzamin zaliczony', description: 'Warunek z § 10 ust. 1 pkt 1 jest spełniony.' },
  { id: 'niezaliczony', label: 'Egzamin niezaliczony', description: 'Pierwsza ocena będzie negatywna (§ 10 ust. 1 pkt 1).' },
  { id: 'nie-dotyczy', label: 'Nie dotyczy', description: 'Oceniany nie był obowiązany do egzaminu (§ 10 ust. 3).' },
];

const EXEMPTIONS: readonly { readonly id: ExamExemption; readonly label: string }[] = [
  { id: 'absolwent-ksap', label: 'Absolwent KSAP, który nie złożył wniosku o mianowanie' },
  { id: 'zastepstwo', label: 'Zatrudnienie w celu zastępstwa nieobecnego członka korpusu' },
  { id: 'wyzsze-stanowisko', label: 'Zatrudnienie na wyższym stanowisku w służbie cywilnej' },
];

@Component({
  selector: 'kp-preparatory-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepFrameComponent, FormField, FormFieldComponent, ControlDirective, CalloutComponent],
  template: `
    <kp-step-frame stepId="sluzba-przygotowawcza" completeLabel="Zapisz wynik">
      <section class="kp-card" aria-labelledby="kp-exam-title">
        <div class="kp-card__header">
          <div>
            <p class="kp-eyebrow">§ 2 pkt 2 rozporządzenia z 2015 r.</p>
            <h3 class="kp-card__title" id="kp-exam-title">Egzamin kończący służbę przygotowawczą</h3>
          </div>
        </div>
        <fieldset class="kp-fieldset kp-exam__outcomes" [disabled]="!editable()">
          <legend class="kp-visually-hidden">Wynik egzaminu</legend>
          @for (option of outcomes; track option.id) {
            <label class="kp-choice">
              <input type="radio" [value]="option.id" [formField]="f.outcome" />
              <span class="kp-choice__body">
                <span class="kp-choice__title">{{ option.label }}</span>
                <span class="kp-choice__description">{{ option.description }}</span>
              </span>
            </label>
          }
        </fieldset>

        <div class="kp-exam__details">
          @if (!f.examDate().hidden()) {
            <kp-field label="Data egzaminu" [field]="f.examDate">
              <input kpControl type="date" class="kp-input" [formField]="f.examDate" />
            </kp-field>
          }
          @if (!f.exemption().hidden()) {
            <kp-field label="Podstawa zwolnienia z warunku egzaminu" [field]="f.exemption">
              <select kpControl class="kp-select" [formField]="f.exemption">
                <option value="">Wybierz…</option>
                @for (option of exemptions; track option.id) {
                  <option [value]="option.id">{{ option.label }}</option>
                }
              </select>
            </kp-field>
          }
          <kp-field label="Uwagi" [optionalHint]="true" [field]="f.note">
            <textarea kpControl class="kp-textarea" rows="2" [formField]="f.note"></textarea>
          </kp-field>
        </div>

        @if (model().outcome === 'niezaliczony') {
          <kp-callout tone="warning" heading="Skutek dla wyniku">
            Niezaliczony egzamin przesądza o negatywnej pierwszej ocenie — niezależnie od ocen cząstkowych.
          </kp-callout>
        }
      </section>
    </kp-step-frame>
  `,
  styles: `
    .kp-exam__outcomes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
      gap: var(--kp-space-2);
    }
    .kp-exam__details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
      gap: var(--kp-space-4);
      margin: var(--kp-space-5) 0;
    }
  `,
})
export class PreparatoryStepComponent {
  private readonly store = inject(CaseStore);
  protected readonly outcomes = OUTCOMES;
  protected readonly exemptions = EXEMPTIONS;
  protected readonly editable = computed(() => this.store.isEditable('sluzba-przygotowawcza'));

  protected readonly model = signal<PreparatoryForm>(this.initial());

  protected readonly f = form(this.model, (p) => {
    disabled(p, () => !this.editable());
    hidden(p.examDate, ({ valueOf }) => valueOf(p.outcome) === 'nie-dotyczy' || valueOf(p.outcome) === '');
    hidden(p.exemption, ({ valueOf }) => valueOf(p.outcome) !== 'nie-dotyczy');
    required(p.examDate, { message: 'Podaj datę egzaminu.' });
    required(p.exemption, { message: 'Wskaż podstawę zwolnienia (§ 10 ust. 3).' });
  });

  constructor() {
    autosave(this.model, (value) => {
      const exempt = value.outcome === 'nie-dotyczy';
      const patch: Partial<PreparatoryService> = {
        outcome: value.outcome || undefined,
        examDate: exempt ? undefined : optional(value.examDate),
        exemption: exempt ? value.exemption || undefined : undefined,
        note: value.note,
      };
      this.store.patch({ preparatoryService: patch });
    });
  }

  private initial(): PreparatoryForm {
    const s = this.store.snapshot().preparatoryService;
    return { outcome: s.outcome ?? '', examDate: s.examDate ?? '', exemption: s.exemption ?? '', note: s.note };
  }
}
