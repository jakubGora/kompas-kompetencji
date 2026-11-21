import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { criterionName, mandatoryCriteriaFor } from '@core/domain/criteria';
import { objectionDeadline } from '@core/domain/deadlines';
import { scaleFor } from '@core/domain/scales';
import { caseOutcome, ratingFor } from '@core/domain/workflow';
import { KpDatePipe, KpScorePipe } from '@shared/pipes/format.pipes';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { CaseStore } from '../data/case.store';

const EXAM_LABEL: Readonly<Record<string, string>> = {
  zaliczony: 'zaliczony',
  niezaliczony: 'niezaliczony',
  'nie-dotyczy': 'nie dotyczy (§ 10 ust. 3)',
};

@Component({
  selector: 'kp-sheet-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CalloutComponent, IconComponent, KpDatePipe, KpScorePipe, UpperCasePipe],
  templateUrl: './sheet-preview.component.html',
  styleUrl: './sheet-preview.component.scss',
})
export class SheetPreviewComponent {
  protected readonly store = inject(CaseStore);

  protected readonly c = computed(() => this.store.snapshot());
  protected readonly isFirst = computed(() => this.c().path === 'first');
  protected readonly variant = computed(() => this.c().positionReview.confirmedVariant);
  protected readonly generated = computed(() => Boolean(this.c().conclusion.sheetGeneratedAt));
  protected readonly outcome = computed(() => caseOutcome(this.c()));
  protected readonly examText = computed(() => {
    const outcome = this.c().preparatoryService.outcome;
    return outcome ? EXAM_LABEL[outcome] : '—';
  });
  protected readonly periodic = computed(() => {
    const result = this.store.result();
    return result?.path === 'periodic' ? result.periodic : null;
  });
  protected readonly first = computed(() => {
    const result = this.store.result();
    return result?.path === 'first' ? result.first : null;
  });
  protected readonly scaleColumns = computed(() => scaleFor(this.c().path));
  protected readonly objectionUntil = computed(() => {
    const ack = this.c().conclusion.employeeAcknowledgedAt;
    return ack && !this.isFirst() ? objectionDeadline(ack) : null;
  });
  protected readonly recentHistory = computed(() => [...(this.c().history ?? [])].slice(-5).reverse());
  protected readonly showPartThree = computed(() => !this.isFirst() && this.c().employee.status === 'urzednik-sc');

  protected readonly rows = computed(() => {
    const c = this.c();
    const mandatory = new Set<string>(mandatoryCriteriaFor(c.path, c.positionReview.confirmedVariant));
    const scale = scaleFor(c.path);
    return this.store.criteria().map((id, index) => {
      const points = ratingFor(c, id)?.decision?.points ?? null;
      return {
        no: index + 1,
        id,
        name: criterionName(id),
        mandatory: mandatory.has(id),
        expectation: c.preliminary.expectations.find((item) => item.criterionId === id)?.text ?? '',
        points,
        label: scale.find((option) => option.points === points)?.label ?? '',
      };
    });
  });

  protected print(): void {
    window.print();
  }
}
