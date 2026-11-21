import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TopicStatus } from '@core/domain/assessment.model';
import type { TopicDefinition } from '@core/domain/workflow';

export interface TopicChange {
  readonly id: string;
  readonly status: TopicStatus | null;
}

/** Lista tematów rozmowy z podstawą prawną: „omówiono” albo — dla tematów opcjonalnych — „nie dotyczy”. */
@Component({
  selector: 'kp-topic-checklist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="kp-fieldset kp-topics" [disabled]="disabled()">
      <legend class="kp-visually-hidden">{{ legend() }}</legend>
      @for (topic of topics(); track topic.id) {
        <div class="kp-topics__row" [class.kp-topics__row--done]="!!statuses()[topic.id]">
          <label class="kp-checkbox kp-topics__main">
            <input
              type="checkbox"
              [checked]="statuses()[topic.id] === 'omowiono'"
              (change)="toggle(topic.id, 'omowiono', $event)"
            />
            <span>
              <span class="kp-topics__label">{{ topic.label }}</span>
              <span class="kp-topics__ref">{{ topic.legalRef }}</span>
            </span>
          </label>
          @if (topic.optional) {
            <label class="kp-checkbox kp-topics__na">
              <input
                type="checkbox"
                [checked]="statuses()[topic.id] === 'nie-dotyczy'"
                (change)="toggle(topic.id, 'nie-dotyczy', $event)"
              />
              <span>Nie dotyczy</span>
            </label>
          }
        </div>
      }
    </fieldset>
  `,
  styles: `
    .kp-topics {
      display: grid;
      gap: var(--kp-space-2);
    }
    .kp-topics__row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--kp-space-2) var(--kp-space-4);
      padding: var(--kp-space-3) var(--kp-space-4);
      border: 1px solid var(--kp-color-border-subtle);
      border-radius: var(--kp-radius-md);
      background: var(--kp-color-surface);
      transition: background-color var(--kp-duration-fast) ease;
    }
    .kp-topics__row--done {
      background: var(--kp-color-surface-muted);
    }
    .kp-topics__main {
      flex: 1 1 320px;
    }
    .kp-topics__label {
      display: block;
      font-size: var(--kp-font-size-sm);
    }
    .kp-topics__ref {
      display: block;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-topics__na {
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-xs);
    }
  `,
})
export class TopicChecklistComponent {
  readonly topics = input.required<readonly TopicDefinition[]>();
  readonly statuses = input.required<Readonly<Record<string, TopicStatus>>>();
  readonly disabled = input(false);
  readonly legend = input('Tematy rozmowy');
  readonly changed = output<TopicChange>();

  protected toggle(id: string, status: TopicStatus, event: Event): void {
    this.changed.emit({ id, status: (event.target as HTMLInputElement).checked ? status : null });
  }
}

export function applyTopicChange(
  statuses: Readonly<Record<string, TopicStatus>>,
  change: TopicChange,
): Record<string, TopicStatus> {
  const next: Record<string, TopicStatus> = { ...statuses };
  if (change.status) next[change.id] = change.status;
  else delete next[change.id];
  return next;
}
