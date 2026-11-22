import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { criterionName, mandatoryCriteriaFor } from '@core/domain/criteria';
import { objectionDeadline } from '@core/domain/deadlines';
import { OVERALL_LEVELS, scaleFor } from '@core/domain/scales';
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

function splitName(fullName: string): { readonly first: string; readonly last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '—', last: '—' };
  if (parts.length === 1) return { first: parts[0]!, last: '—' };
  return { first: parts.slice(0, -1).join(' '), last: parts.at(-1)! };
}

@Component({
  selector: 'kp-sheet-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CalloutComponent, IconComponent, KpDatePipe, KpScorePipe],
  templateUrl: './sheet-preview.component.html',
  styleUrl: './sheet-preview.component.scss',
})
export class SheetPreviewComponent {
  protected readonly store = inject(CaseStore);

  protected readonly c = computed(() => this.store.snapshot());
  protected readonly isFirst = computed(() => this.c().path === 'first');
  protected readonly variant = computed(() => this.c().positionReview.confirmedVariant);
  protected readonly generated = computed(() => Boolean(this.c().conclusion.sheetGeneratedAt));
  /** Narracja końcowego arkusza jest w aktach dopiero po zapoznaniu ocenianego. */
  protected readonly sheetInFile = computed(() => !this.store.redacted() || Boolean(this.c().conclusion.employeeAcknowledgedAt));
  /** Oczekiwania z części I są w aktach po podpisie tej części. */
  protected readonly partOneInFile = computed(() => !this.store.redacted() || Boolean(this.c().preliminary.employeeAcknowledgedAt));
  protected readonly hrBanner = computed(() => {
    if (!this.store.redacted()) return null;
    if (this.c().conclusion.employeeAcknowledgedAt) {
      return 'Odpis arkusza z akt. Obserwacje i notatki z rozmów zostają u oceniającego.';
    }
    if (this.c().preliminary.employeeAcknowledgedAt) {
      return 'Część I jest w aktach. Uzasadnienie i wnioski końcowe pojawią się po zapoznaniu ocenianego z oceną.';
    }
    return 'Oczekiwania, uzasadnienie i wnioski są u oceniającego. Do kadr trafiają wraz z podpisanym dokumentem.';
  });
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
  protected readonly showPartThree = computed(
    () => !this.isFirst() && this.c().employee.status === 'urzednik-sc' && this.c().conclusion.promotionRequest === 'tak',
  );
  protected readonly partThreeNote = computed(() => {
    if (this.isFirst()) return 'Część III dotyczy wyłącznie urzędników służby cywilnej w ocenie okresowej.';
    if (this.c().employee.status !== 'urzednik-sc') {
      return 'NIE DOTYCZY (oceniany jest pracownikiem służby cywilnej).';
    }
    if (this.c().conclusion.promotionRequest !== 'tak') {
      return 'Wniosek o kolejny stopień nie został dołączony do arkusza.';
    }
    return null;
  });

  protected readonly annexLabel = computed(() => {
    if (this.isFirst()) return 'Załącznik nr 2';
    return this.variant() === 'B' ? 'Załącznik nr 3' : 'Załącznik nr 4';
  });

  protected readonly formHeading = computed(() => {
    if (this.isFirst()) return 'ARKUSZ PIERWSZEJ OCENY W SŁUŻBIE CYWILNEJ';
    return this.variant() === 'B' ? 'ARKUSZ B' : 'ARKUSZ C';
  });

  protected readonly formSubtitle = computed(() => {
    if (this.isFirst()) return null;
    return 'OCENA OKRESOWA URZĘDNIKA SŁUŻBY CYWILNEJ LUB PRACOWNIKA SŁUŻBY CYWILNEJ';
  });

  protected readonly toolbarTitle = computed(() => {
    if (this.isFirst()) return 'Arkusz pierwszej oceny';
    const variant = this.variant();
    return variant ? `Arkusz ${variant} — ocena okresowa` : 'Arkusz oceny okresowej';
  });

  protected readonly employeeName = computed(() => ({
    first: this.c().employee.firstName,
    last: this.c().employee.lastName,
  }));

  protected readonly evaluatorName = computed(() => splitName(this.c().evaluator.fullName));
  protected readonly headName = computed(() => {
    const head = this.c().headOfUnit;
    return head ? splitName(head.fullName) : null;
  });

  protected readonly previousLevelLabel = computed(() => {
    const prev = this.c().employee.previousAssessment;
    if (!prev) return '—';
    return OVERALL_LEVELS.find((level) => level.id === prev.level)?.label ?? prev.level;
  });

  protected readonly formLink = computed(() => {
    const step = this.store.currentStepId();
    return step ? [this.store.baseUrl(), step] : [this.store.baseUrl()];
  });

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
        expectation: this.partOneInFile()
          ? (c.preliminary.expectations.find((item) => item.criterionId === id)?.text ?? '')
          : '',
        points,
        label: scale.find((option) => option.points === points)?.label ?? '',
      };
    });
  });

  protected readonly mandatoryRows = computed(() => this.rows().filter((row) => row.mandatory));
  protected readonly additionalRows = computed(() => this.rows().filter((row) => !row.mandatory));

  protected print(): void {
    window.print();
  }
}
