import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { StepId } from '@core/domain/assessment.model';
import { stepDefinition } from '@core/domain/workflow';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { SaveStatusComponent } from '@shared/ui/save-status/save-status.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { CaseStore } from '../data/case.store';

/**
 * Wspólna rama kroku: stan (zakończony / zablokowany / tylko odczyt) i pasek akcji
 * z autozapisem oraz walidacją przed przejściem dalej. Tytuł kroku pokazuje nagłówek obszaru oceny.
 */
@Component({
  selector: 'kp-step-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CalloutComponent, EmptyStateComponent, SaveStatusComponent, KpDatePipe],
  templateUrl: './step-frame.component.html',
  styleUrl: './step-frame.component.scss',
})
export class StepFrameComponent {
  protected readonly store = inject(CaseStore);
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly stepId = input.required<StepId>();
  readonly completeLabel = input('Zapisz i przejdź dalej');
  /** Fałsz — krok kończy się w innym widoku (np. przegląd ocen cząstkowych). */
  readonly completable = input(true);
  /** Fałsz — krok sam pokazuje status zakończenia (np. podpis części I w nagłówku). */
  readonly completedNote = input(true);
  /** Przycisk „Zapisz szkic” — jawny zapis obok autozapisu. */
  readonly draftable = input(false);
  /** Etykieta przejścia do następnego kroku, gdy ten jest już zakończony. */
  readonly nextLabel = input<string>();
  /**
   * Dialog przed zakończeniem kroku (np. podpis części I). Fałsz przerywa zamykanie;
   * braki z polem `field` uzupełnia ten dialog, więc nie liczą się do „Do uzupełnienia”.
   */
  readonly confirmComplete = input<(() => Promise<boolean>) | null>(null);

  protected readonly serverIssues = signal<readonly string[]>([]);

  protected readonly definition = computed(() => stepDefinition(this.store.path(), this.stepId()));
  protected readonly reachable = computed(() => this.store.isReachable(this.stepId()));
  protected readonly record = computed(() => this.store.case()?.steps[this.stepId()]);
  protected readonly editable = computed(() => this.store.isEditable(this.stepId()));
  protected readonly warnings = computed(() =>
    this.store.issues(this.stepId()).filter((issue) => issue.severity === 'warning'),
  );
  protected readonly openErrors = computed(
    () =>
      this.store
        .issues(this.stepId())
        .filter((issue) => issue.severity === 'error' && !(this.confirmComplete() && issue.field)).length,
  );

  protected readonly blockedBy = computed(() => {
    const c = this.store.case();
    if (!c) return null;
    const blocking = this.store.steps().find((step) => !c.steps[step.id]?.completedAt);
    return blocking && blocking.id !== this.stepId() ? blocking : null;
  });

  protected readonly previousLink = computed(() => {
    const previous = this.store.previousStepId(this.stepId());
    return previous ? `${this.store.baseUrl()}/${previous}` : null;
  });

  protected readonly next = computed(() => {
    const next = this.store.nextStepId(this.stepId());
    return next && this.store.isReachable(next)
      ? { label: this.store.stepLabel(next), link: `${this.store.baseUrl()}/${next}` }
      : null;
  });

  protected async saveDraft(): Promise<void> {
    if (await this.store.flushAll()) {
      this.toast.success('Zapisano szkic', 'Możesz wrócić do tego kroku w dowolnym momencie.');
    }
  }

  /** Zakończenie kroku z zewnątrz (np. przycisk w treści kroku). */
  async complete(): Promise<boolean> {
    this.serverIssues.set([]);
    const stepId = this.stepId();
    const confirm = this.confirmComplete();
    if (confirm) {
      const missing = this.store.issues(stepId).filter((issue) => issue.severity === 'error' && !issue.field);
      if (missing.length > 0) {
        this.serverIssues.set(missing.map((issue) => issue.message));
        return false;
      }
      if (!(await confirm())) return false;
    }
    const result = await this.store.completeStep(stepId);
    if (!result.ok) {
      this.serverIssues.set(result.issues);
      return false;
    }
    const nextStep = this.store.nextStepId(stepId);
    if (nextStep) {
      this.toast.success(`Zakończono: ${this.store.stepLabel(stepId)}`, `Następny krok: ${this.store.stepLabel(nextStep)}.`);
      await this.router.navigateByUrl(`${this.store.baseUrl()}/${nextStep}`);
    } else {
      this.toast.success('Ocena zakończona', 'Arkusz trafia do akt osobowych. Kadry otrzymały powiadomienie.');
    }
    return true;
  }
}
