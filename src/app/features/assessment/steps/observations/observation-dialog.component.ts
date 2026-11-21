import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import type { ObservationInput } from '@core/api/api.types';
import type { IndicatorMatch, ObservationAnalysis, ObservationCoaching } from '@core/domain/assistant.model';
import type { Observation } from '@core/domain/assessment.model';
import { criterionShortName, type CriterionId } from '@core/domain/criteria';
import { isAfter } from '@core/domain/date';
import { ReferenceStore } from '@core/reference/reference.store';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { ControlDirective } from '@shared/ui/form-field/control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CaseStore } from '../../data/case.store';

export interface ObservationDialogData {
  readonly store: CaseStore;
  readonly observation?: Observation;
}

type Stage = 'opis' | 'powiazania';

interface ObservationForm {
  date: string;
  description: string;
  title: string;
  positionTaskId: string;
}

interface LinkRow {
  readonly indicatorId: string;
  readonly criterionId: CriterionId;
  readonly match: IndicatorMatch | null;
}

const DESCRIPTION_LIMIT = 1200;
const WIDTH: Readonly<Record<Stage, string>> = { opis: '344px', powiazania: '560px' };

const QUALITY: Readonly<Record<ObservationCoaching['quality'], string>> = {
  konkretna: 'Konkretna notatka',
  'do-uzupelnienia': 'Notatkę warto uzupełnić',
  'ocena-zamiast-faktu': 'To raczej opinia niż fakt',
};

const CONFIDENCE: Readonly<Record<IndicatorMatch['confidence'], string>> = {
  wysoka: 'Wysokie dopasowanie',
  srednia: 'Średnie dopasowanie',
  niska: 'Niskie dopasowanie',
};

/** Kryterium, do którego należy wskaźnik (`c04-i02` → `c04`). */
function criterionOf(indicatorId: string): CriterionId {
  return indicatorId.split('-')[0] as CriterionId;
}

function manualCriteriaOf(observation: Observation | undefined): CriterionId[] {
  if (!observation) return [];
  const linked = new Set(observation.indicatorIds.map(criterionOf));
  return observation.criterionIds.filter((id) => !linked.has(id));
}

/**
 * Projekt „Dodaj obserwację”: data i jeden opis zadania i zachowania. Po zapisie asystent proponuje tytuł,
 * zadanie z OSP i wskaźniki — oceniający zatwierdza powiązania w drugim kroku.
 */
@Component({
  selector: 'kp-observation-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, FormField, FormFieldComponent, ControlDirective, ButtonComponent, CalloutComponent, IconComponent, KpDatePipe],
  templateUrl: './observation-dialog.component.html',
  styleUrl: './observation-dialog.component.scss',
})
export class ObservationDialogComponent {
  private readonly data = inject<ObservationDialogData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly dialogs = inject(DialogService);
  private readonly reference = inject(ReferenceStore);
  private readonly store = this.data.store;

  protected readonly editing = this.data.observation;
  protected readonly today = inject(SessionStore).today();
  protected readonly tasks = this.store.snapshot().position.tasks;
  protected readonly criteria = this.store.criteria;
  protected readonly quality = QUALITY;
  protected readonly confidence = CONFIDENCE;

  protected readonly stage = signal<Stage>('opis');
  protected readonly analysis = signal<ObservationAnalysis | null>(null);
  protected readonly analysisFailed = signal(false);
  protected readonly analyzing = signal(false);
  protected readonly saving = signal(false);
  protected readonly attempted = signal(false);
  protected readonly serverIssues = signal<readonly string[]>([]);

  protected readonly indicatorIds = signal<readonly string[]>(this.editing?.indicatorIds ?? []);
  /** Kryteria wskazane ręcznie — bez konkretnego wskaźnika. */
  private readonly manualCriteria = signal<readonly CriterionId[]>(manualCriteriaOf(this.editing));
  /** Po pierwszej ręcznej zmianie powiązań asystent już ich nie nadpisuje. */
  private linksEdited = Boolean(this.editing);

  private readonly model = signal<ObservationForm>({
    date: this.editing?.date ?? this.today,
    description: this.editing?.description ?? '',
    title: this.editing?.title ?? '',
    positionTaskId: this.editing?.positionTaskId ?? '',
  });

  protected readonly f = form(this.model, (p) => {
    required(p.date, { message: 'Podaj datę zdarzenia.' });
    validate(p.date, ({ value }) =>
      value() && isAfter(value(), this.today) ? { kind: 'future', message: 'Obserwacja dotyczy przeszłości — data nie może być z przyszłości.' } : null,
    );
    required(p.description, { message: 'Opisz, co się wydarzyło i jak zachowała się osoba oceniana.' });
    maxLength(p.description, DESCRIPTION_LIMIT, { message: `Opis może mieć najwyżej ${DESCRIPTION_LIMIT} znaków.` });
    required(p.title, { message: 'Nadaj obserwacji krótki tytuł.', when: () => this.stage() === 'powiazania' });
    maxLength(p.title, 120, { message: 'Tytuł może mieć najwyżej 120 znaków.' });
  });

  protected readonly selectedCriteria = computed<readonly CriterionId[]>(() => [
    ...new Set([...this.manualCriteria(), ...this.indicatorIds().map(criterionOf)]),
  ]);

  /** Propozycje asystenta i wskaźniki już powiązane (przy edycji) — każdy można odznaczyć. */
  protected readonly rows = computed<readonly LinkRow[]>(() => {
    const rows = new Map<string, LinkRow>();
    for (const match of this.analysis()?.matches ?? []) {
      rows.set(match.indicatorId, { indicatorId: match.indicatorId, criterionId: match.criterionId, match });
    }
    for (const indicatorId of this.indicatorIds()) {
      if (!rows.has(indicatorId)) rows.set(indicatorId, { indicatorId, criterionId: criterionOf(indicatorId), match: null });
    }
    return [...rows.values()];
  });

  protected shortName(id: CriterionId): string {
    return criterionShortName(id);
  }

  protected indicatorText(indicatorId: string): string {
    return this.reference.indicator(indicatorId)?.text ?? indicatorId;
  }

  protected hasIndicator(indicatorId: string): boolean {
    return this.indicatorIds().includes(indicatorId);
  }

  protected hasCriterion(id: CriterionId): boolean {
    return this.selectedCriteria().includes(id);
  }

  protected toggleIndicator(indicatorId: string): void {
    this.linksEdited = true;
    this.indicatorIds.update((ids) => (ids.includes(indicatorId) ? ids.filter((id) => id !== indicatorId) : [...ids, indicatorId]));
  }

  /** Odznaczenie kryterium usuwa też jego wskaźniki — inaczej zostałoby zaznaczone. */
  protected toggleCriterion(id: CriterionId): void {
    this.linksEdited = true;
    if (this.hasCriterion(id)) {
      this.manualCriteria.update((ids) => ids.filter((item) => item !== id));
      this.indicatorIds.update((ids) => ids.filter((indicatorId) => criterionOf(indicatorId) !== id));
    } else {
      this.manualCriteria.update((ids) => [...ids, id]);
    }
  }

  protected async describe(): Promise<void> {
    await submit(this.f, {
      action: async () => {
        await this.analyze();
        this.setStage('powiazania');
        return undefined;
      },
    });
  }

  protected back(): void {
    this.setStage('opis');
  }

  protected async save(): Promise<void> {
    this.serverIssues.set([]);
    this.attempted.set(true);
    await submit(this.f, {
      action: async () => {
        if (this.selectedCriteria().length === 0) return undefined;
        this.saving.set(true);
        const value = this.model();
        const input: ObservationInput = {
          date: value.date,
          title: value.title.trim(),
          ...(value.positionTaskId ? { positionTaskId: value.positionTaskId } : {}),
          description: value.description.trim(),
          criterionIds: [...this.selectedCriteria()],
          indicatorIds: [...this.indicatorIds()],
        };
        const error = this.editing ? await this.store.updateObservation(this.editing.id, input) : await this.store.addObservation(input);
        this.saving.set(false);
        if (error) {
          this.serverIssues.set(error.issues.length > 0 ? error.issues : [error.message]);
        } else {
          this.ref.close(true);
        }
        return undefined;
      },
    });
  }

  protected async remove(): Promise<void> {
    const observation = this.editing;
    if (!observation) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Usunąć obserwację?',
      message: `„${observation.title}” zniknie z listy i z powiązań z ocenami cząstkowymi. Zmiana zostanie zapisana w historii.`,
      confirmLabel: 'Usuń',
      destructive: true,
    });
    if (confirmed && !(await this.store.deleteObservation(observation.id))) this.ref.close(true);
  }

  private async analyze(): Promise<void> {
    const value = this.model();
    this.analyzing.set(true);
    try {
      const result = await this.store.analyzeObservation({ date: value.date, title: value.title, description: value.description });
      this.analysis.set(result);
      this.analysisFailed.set(false);
      this.model.update((current) => ({
        ...current,
        title: current.title.trim() ? current.title : result.suggestedTitle,
        positionTaskId: current.positionTaskId || (result.suggestedTaskId ?? ''),
      }));
      if (!this.linksEdited) {
        const strong = result.matches.filter((match) => match.confidence !== 'niska');
        this.indicatorIds.set(strong.map((match) => match.indicatorId));
      }
    } catch {
      this.analysis.set(null);
      this.analysisFailed.set(true);
    } finally {
      this.analyzing.set(false);
    }
  }

  private setStage(stage: Stage): void {
    this.stage.set(stage);
    this.ref.updateSize(WIDTH[stage]);
  }
}
