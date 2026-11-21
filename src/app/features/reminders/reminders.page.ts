import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RemindersApi } from '@core/api/notifications.api';
import { pluralPl } from '@core/domain/date';
import type { ReminderCandidate, ReminderRule } from '@core/domain/notification.model';
import { toApiError } from '@core/http/api-error';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { KpDatePipe, KpPluralPipe } from '@shared/pipes/format.pipes';
import { BadgeComponent, type Tone } from '@shared/ui/badge/badge.component';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { CalloutComponent } from '@shared/ui/callout/callout.component';
import { DueChipComponent } from '@shared/ui/due-chip/due-chip.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { firstValueFrom } from 'rxjs';

const SEVERITY: Readonly<Record<ReminderCandidate['severity'], { readonly label: string; readonly tone: Tone }>> = {
  pilne: { label: 'pilne', tone: 'danger' },
  wkrotce: { label: 'wkrótce', tone: 'warning' },
  informacja: { label: 'informacja', tone: 'info' },
};

const NOTE_LIMIT = 400;

@Component({
  selector: 'kp-reminders-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Tabs,
    TabList,
    Tab,
    TabPanel,
    TabContent,
    BadgeComponent,
    ButtonComponent,
    CalloutComponent,
    DueChipComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    SkeletonComponent,
    KpDatePipe,
    KpPluralPipe,
  ],
  templateUrl: './reminders.page.html',
  styleUrl: './reminders.page.scss',
})
export class RemindersPage {
  private readonly api = inject(RemindersApi);
  private readonly toast = inject(ToastService);

  /** `?sprawa=` — przejście z panelu kadr z zaznaczonymi przypomnieniami dla jednej oceny. */
  readonly sprawa = input<string>();

  protected readonly severity = SEVERITY;
  protected readonly noteLimit = NOTE_LIMIT;
  protected readonly tab = signal('do-wyslania');

  protected readonly candidates = rxResource({ stream: () => this.api.candidates() });
  protected readonly rules = rxResource({ stream: () => this.api.rules() });
  protected readonly log = rxResource({ stream: () => this.api.log() });

  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly note = signal('');
  protected readonly sending = signal(false);
  protected readonly savingRule = signal<string | null>(null);

  protected readonly candidateList = computed(() => (this.candidates.hasValue() ? this.candidates.value() : []));
  protected readonly ruleList = computed(() => (this.rules.hasValue() ? this.rules.value() : []));
  protected readonly logList = computed(() => (this.log.hasValue() ? this.log.value() : []));
  protected readonly ruleNames = computed(() => new Map(this.ruleList().map((rule) => [rule.id, rule.name])));
  protected readonly allSelected = computed(() => this.candidateList().length > 0 && this.candidateList().every((c) => this.selected().has(c.id)));
  protected readonly unreadCount = computed(() => this.logList().filter((entry) => !entry.readAt).length);
  protected readonly urgentCount = computed(() => this.candidateList().filter((c) => c.severity === 'pilne').length);

  constructor() {
    inject(BreadcrumbStore).set([{ label: 'Przypomnienia' }]);

    effect(() => {
      const caseId = this.sprawa();
      const list = this.candidateList();
      if (!caseId || list.length === 0) return;
      untracked(() => this.selected.set(new Set(list.filter((c) => c.caseId === caseId).map((c) => c.id))));
    });
  }

  protected toggle(id: string, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(id);
    else next.delete(id);
    this.selected.set(next);
  }

  protected toggleAll(checked: boolean): void {
    this.selected.set(checked ? new Set(this.candidateList().map((c) => c.id)) : new Set());
  }

  protected selectUrgent(): void {
    this.selected.set(new Set(this.candidateList().filter((c) => c.severity === 'pilne').map((c) => c.id)));
  }

  protected async send(): Promise<void> {
    const ids = [...this.selected()];
    if (ids.length === 0 || this.sending()) return;
    this.sending.set(true);
    try {
      const { sent } = await firstValueFrom(this.api.send(ids, this.note()));
      this.toast.success(`Wysłano ${sent} ${pluralPl(sent, ['przypomnienie', 'przypomnienia', 'przypomnień'])}`, 'Trafiły do skrzynki powiadomień oceniających.');
      this.selected.set(new Set());
      this.note.set('');
      this.candidates.reload();
      this.log.reload();
    } catch (error) {
      this.toast.error('Nie wysłano przypomnień', toApiError(error).message);
    } finally {
      this.sending.set(false);
    }
  }

  protected async setRule(rule: ReminderRule, enabled: boolean): Promise<void> {
    this.savingRule.set(rule.id);
    try {
      const updated = await firstValueFrom(this.api.updateRule(rule.id, { enabled }));
      this.rules.update((list) => list?.map((item) => (item.id === updated.id ? updated : item)));
      this.candidates.reload();
      this.toast.info(enabled ? 'Reguła włączona' : 'Reguła wyłączona', updated.name);
    } catch (error) {
      this.toast.error('Nie zapisano reguły', toApiError(error).message);
      this.rules.reload();
    } finally {
      this.savingRule.set(null);
    }
  }
}
