import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CaseDocument, HistoryEvent, HistoryKind } from '@core/domain/assessment.model';
import { historySummaryForHr } from '@core/domain/hr-view';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { BadgeComponent, type Tone } from '@shared/ui/badge/badge.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import type { IconName } from '@shared/ui/icon/icons';
import { CaseStore } from '../data/case.store';

const KIND: Readonly<Record<HistoryKind, { readonly icon: IconName; readonly label: string }>> = {
  utworzenie: { icon: 'play', label: 'Utworzenie' },
  krok: { icon: 'check-circle', label: 'Krok' },
  obserwacja: { icon: 'notebook', label: 'Obserwacja' },
  decyzja: { icon: 'target', label: 'Decyzja' },
  odstepstwo: { icon: 'alert', label: 'Odstępstwo od sugestii' },
  dokument: { icon: 'file', label: 'Dokument' },
  przypomnienie: { icon: 'bell', label: 'Przypomnienie' },
  zapoznanie: { icon: 'pencil', label: 'Zapoznanie' },
  termin: { icon: 'calendar', label: 'Termin' },
};

const DOC_STATUS: Readonly<Record<CaseDocument['status'], { readonly label: string; readonly tone: Tone }>> = {
  szkic: { label: 'szkic', tone: 'warning' },
  wygenerowany: { label: 'do podpisu', tone: 'info' },
  podpisany: { label: 'podpisany', tone: 'success' },
};

@Component({
  selector: 'kp-case-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BadgeComponent, EmptyStateComponent, IconComponent, KpDatePipe],
  template: `
    <div class="kp-history">
      <section class="kp-card" aria-labelledby="kp-timeline-title">
        <div class="kp-card__header">
          <div>
            <p class="kp-eyebrow">Ślad audytowy</p>
            <h2 class="kp-card__title" id="kp-timeline-title">Historia oceny</h2>
            <p class="kp-card__subtitle">
              @if (store.redacted()) {
                Przebieg procesu. Tytuły obserwacji i uzasadnienia odstępstw zostają u oceniającego.
              } @else {
                Kto, kiedy i co zmienił — w tym odstępstwa od sugestii narzędzia.
              }
            </p>
          </div>
        </div>
        @if (events().length === 0) {
          <kp-empty-state [compact]="true" icon="history" heading="Brak zdarzeń" />
        } @else {
          <ol class="kp-timeline">
            @for (event of events(); track event.id) {
              <li class="kp-timeline__item" [attr.data-kind]="event.kind">
                <span class="kp-timeline__icon" aria-hidden="true"><kp-icon [name]="kind[event.kind].icon" [size]="16" /></span>
                <div class="kp-timeline__body">
                  <p class="kp-timeline__summary">{{ summary(event) }}</p>
                  <p class="kp-timeline__meta">
                    {{ event.at | kpDate: 'datetime' }} · {{ event.actor.fullName }}
                    @if (event.stepId) {
                      · {{ store.stepLabel(event.stepId) }}
                    }
                  </p>
                </div>
                @if (event.kind === 'odstepstwo') {
                  <kp-badge tone="warning">{{ kind[event.kind].label }}</kp-badge>
                }
              </li>
            }
          </ol>
        }
      </section>

      <section class="kp-card" aria-labelledby="kp-documents-title">
        <div class="kp-card__header">
          <div>
            <p class="kp-eyebrow">Akta</p>
            <h2 class="kp-card__title" id="kp-documents-title">Dokumenty</h2>
          </div>
        </div>
        @if (documents().length === 0) {
          <kp-empty-state [compact]="true" icon="file" heading="Jeszcze nie ma dokumentów" description="Część I i arkusz powstaną w kolejnych krokach." />
        } @else {
          <ul class="kp-documents">
            @for (doc of documents(); track doc.id) {
              <li class="kp-documents__item">
                <kp-icon name="file" [size]="20" />
                <div class="kp-documents__body">
                  <p class="kp-documents__title">{{ doc.title }}</p>
                  <p class="kp-documents__meta">wersja {{ doc.version }} · {{ doc.createdAt | kpDate: 'datetime' }}</p>
                </div>
                <kp-badge [tone]="docStatus[doc.status].tone">{{ docStatus[doc.status].label }}</kp-badge>
                @if (doc.kind !== 'plan-rozmowy' && doc.kind !== 'zawiadomienie-o-terminie') {
                  <a class="kp-documents__link" [routerLink]="[store.baseUrl(), 'arkusz']" [attr.aria-label]="'Podgląd: ' + doc.title">
                    <kp-icon name="eye" [size]="16" />
                  </a>
                }
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styles: `
    .kp-history {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
      gap: var(--kp-space-5);
      align-items: start;
    }
    @media (max-width: 1100px) {
      .kp-history {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .kp-timeline {
      position: relative;
      display: grid;
      gap: var(--kp-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .kp-timeline::before {
      content: '';
      position: absolute;
      top: 8px;
      bottom: 8px;
      left: 15px;
      width: 2px;
      background: var(--kp-color-border-subtle);
    }
    .kp-timeline__item {
      position: relative;
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--kp-space-3);
    }
    .kp-timeline__icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 2px solid var(--kp-color-surface);
      border-radius: 50%;
      background: var(--kp-color-surface-tint);
      color: var(--kp-color-primary-strong);
    }
    .kp-timeline__item[data-kind='odstepstwo'] .kp-timeline__icon {
      background: var(--kp-color-warning-bg);
      color: var(--kp-color-warning);
    }
    .kp-timeline__item[data-kind='zapoznanie'] .kp-timeline__icon,
    .kp-timeline__item[data-kind='krok'] .kp-timeline__icon {
      background: var(--kp-color-success-bg);
      color: var(--kp-color-success);
    }
    .kp-timeline__summary {
      font-size: var(--kp-font-size-sm);
      line-height: var(--kp-line-height-base);
    }
    .kp-timeline__meta {
      margin-top: 2px;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-documents {
      display: grid;
      gap: var(--kp-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .kp-documents__item {
      display: flex;
      align-items: center;
      gap: var(--kp-space-3);
      padding: var(--kp-space-3);
      border: 1px solid var(--kp-color-border-subtle);
      border-radius: var(--kp-radius-md);
    }
    .kp-documents__item > kp-icon {
      color: var(--kp-color-primary);
    }
    .kp-documents__body {
      flex: 1;
      min-width: 0;
    }
    .kp-documents__title {
      font-size: var(--kp-font-size-sm);
      font-weight: 500;
    }
    .kp-documents__meta {
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-documents__link {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: var(--kp-radius-sm);
      color: var(--kp-color-text-muted);
    }
    .kp-documents__link:hover {
      background: var(--kp-color-surface-hover);
      color: var(--kp-color-primary);
    }
  `,
})
export class CaseHistoryComponent {
  protected readonly store = inject(CaseStore);
  protected readonly kind = KIND;
  protected readonly docStatus = DOC_STATUS;

  protected readonly events = computed(() => [...(this.store.case()?.history ?? [])].reverse());
  protected readonly documents = computed(() => this.store.case()?.documents ?? []);

  protected summary(event: HistoryEvent): string {
    return this.store.redacted() ? historySummaryForHr(event) : event.summary;
  }

  constructor() {
    void this.store.refresh();
  }
}
