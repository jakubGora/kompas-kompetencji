import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Goal, TopicStatus } from '@core/domain/assessment.model';
import type { TopicDefinition } from '@core/domain/workflow';
import type { EmployeeNoun } from '@shared/presentation/person-forms';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

export interface TopicDialogData {
  readonly topic: TopicDefinition;
  readonly status: TopicStatus | null;
  readonly noun: EmployeeNoun;
  /** Lista do omówienia (zadania z OSP, kryteria) — tylko do wglądu. */
  readonly items?: { readonly heading: string; readonly entries: readonly string[] };
  readonly note?: string;
  /** Cele na okres oceny — edytowane w tym dialogu. */
  readonly goals?: readonly Goal[];
}

export interface TopicDialogResult {
  readonly status: TopicStatus | null;
  readonly goals?: readonly Goal[];
}

type StatusChoice = TopicStatus | 'brak';

@Component({
  selector: 'kp-topic-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ButtonComponent, FormFieldComponent, ControlDirective],
  template: `
    <kp-dialog-shell [heading]="data.topic.shortLabel" [description]="data.topic.label + ' (' + data.topic.legalRef + ').'" titleId="kp-topic-title">
      <div class="kp-topic">
        @if (data.items; as items) {
          <section class="kp-topic__section" aria-labelledby="kp-topic-items">
            <h3 class="kp-topic__heading" id="kp-topic-items">{{ items.heading }}</h3>
            <ol class="kp-topic__list">
              @for (entry of items.entries; track $index) {
                <li>{{ entry }}</li>
              }
            </ol>
          </section>
        }
        @if (data.note) {
          <p class="kp-topic__note">{{ data.note }}</p>
        }

        @if (data.goals) {
          <section class="kp-topic__section" aria-labelledby="kp-topic-goals">
            <h3 class="kp-topic__heading" id="kp-topic-goals">Cele na okres oceny</h3>
            @for (goal of goals(); track goal.id; let i = $index) {
              <div class="kp-topic__goal">
                <kp-field [label]="'Cel ' + (i + 1)">
                  <input
                    kpControl
                    class="kp-input"
                    [value]="goal.text"
                    placeholder="Np. usprawnić kompletność raportów podczas dyżurów"
                    (input)="setGoal(i, 'text', $event)"
                  />
                </kp-field>
                <kp-field label="Miernik">
                  <input
                    kpControl
                    class="kp-input"
                    [value]="goal.measure"
                    placeholder="Np. 100% raportów kompletnych przy pierwszym przekazaniu"
                    (input)="setGoal(i, 'measure', $event)"
                  />
                </kp-field>
                <button type="button" class="kp-text-link kp-text-link--sm kp-text-link--plain kp-topic__remove" (click)="removeGoal(i)">
                  Usuń cel {{ i + 1 }}
                </button>
              </div>
            } @empty {
              <p class="kp-topic__note">Brak celów. Wyznacz je, jeżeli jest to uzasadnione charakterem pracy na stanowisku.</p>
            }
            <button type="button" kpButton="secondary" size="sm" icon="plus" class="kp-topic__add" (click)="addGoal()">Dodaj cel</button>
          </section>
        }

        <fieldset class="kp-fieldset kp-topic__status">
          <legend class="kp-topic__heading">Status tematu</legend>
          <label class="kp-choice kp-choice--compact">
            <input type="radio" name="kp-topic-status" [checked]="choice() === 'omowiono'" (change)="choice.set('omowiono')" />
            <span class="kp-choice__body"><span class="kp-choice__title">Omówiono z {{ data.noun.instrumental }}</span></span>
          </label>
          @if (data.topic.optional) {
            <label class="kp-choice kp-choice--compact">
              <input type="radio" name="kp-topic-status" [checked]="choice() === 'nie-dotyczy'" (change)="choice.set('nie-dotyczy')" />
              <span class="kp-choice__body">
                <span class="kp-choice__title">Nie dotyczy</span>
                <span class="kp-choice__description">Określenie celów nie jest uzasadnione na tym stanowisku.</span>
              </span>
            </label>
          }
          <label class="kp-choice kp-choice--compact">
            <input type="radio" name="kp-topic-status" [checked]="choice() === 'brak'" (change)="choice.set('brak')" />
            <span class="kp-choice__body"><span class="kp-choice__title">Jeszcze nie omówiono</span></span>
          </label>
        </fieldset>

        @if (missingGoals()) {
          <p class="kp-topic__warning" role="status">Dodaj co najmniej jeden cel albo oznacz temat jako „Nie dotyczy”.</p>
        }
      </div>

      <ng-container dialogFooter>
        <button type="button" kpButton="secondary" (click)="ref.close()">Anuluj</button>
        <button type="button" kpButton [disabled]="missingGoals()" (click)="save()">Zapisz</button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-topic {
      display: grid;
      gap: var(--kp-space-5);
    }
    .kp-topic__section {
      display: grid;
      gap: var(--kp-space-3);
    }
    .kp-topic__heading {
      margin: 0;
      padding: 0;
      font-size: var(--kp-font-size-sm);
      font-weight: var(--kp-font-weight-medium);
    }
    .kp-topic__list {
      display: grid;
      gap: var(--kp-space-2);
      margin: 0;
      padding: var(--kp-space-4) var(--kp-space-4) var(--kp-space-4) var(--kp-space-8);
      border-radius: var(--kp-radius-md);
      background: var(--kp-color-surface-lilac);
      font-size: var(--kp-font-size-xs);
    }
    .kp-topic__note {
      margin: 0;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-xs);
    }
    .kp-topic__goal {
      display: grid;
      gap: var(--kp-space-3);
      padding: var(--kp-space-4);
      border-radius: var(--kp-radius-md);
      background: var(--kp-color-surface-lilac);
    }
    .kp-topic__remove {
      justify-self: start;
    }
    .kp-topic__add {
      justify-self: start;
    }
    .kp-topic__status {
      display: grid;
      gap: var(--kp-space-2);
    }
    .kp-topic__status legend {
      margin-bottom: var(--kp-space-3);
    }
    .kp-topic__warning {
      margin: 0;
      color: var(--kp-color-warning);
      font-size: var(--kp-font-size-xs);
      font-weight: var(--kp-font-weight-medium);
    }
  `,
})
export class TopicDialogComponent {
  protected readonly data = inject<TopicDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<TopicDialogResult>>(DialogRef);

  protected readonly choice = signal<StatusChoice>(this.data.status ?? 'omowiono');
  protected readonly goals = signal<readonly Goal[]>(this.data.goals ?? []);
  protected readonly missingGoals = computed(
    () => Boolean(this.data.goals) && this.choice() === 'omowiono' && !this.goals().some((goal) => goal.text.trim()),
  );

  protected addGoal(): void {
    this.goals.update((list) => [...list, { id: `goal-${Date.now().toString(36)}`, text: '', measure: '' }]);
  }

  protected removeGoal(index: number): void {
    this.goals.update((list) => list.filter((_, i) => i !== index));
  }

  protected setGoal(index: number, key: 'text' | 'measure', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.goals.update((list) => list.map((goal, i) => (i === index ? { ...goal, [key]: value } : goal)));
  }

  protected save(): void {
    const choice = this.choice();
    const status = choice === 'brak' ? null : choice;
    const goals = this.goals().filter((goal) => goal.text.trim() || goal.measure.trim());
    this.ref.close(this.data.goals ? { status, goals: choice === 'nie-dotyczy' ? [] : goals } : { status });
  }
}
