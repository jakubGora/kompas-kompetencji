import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatDateValue } from '@shared/pipes/format.pipes';
import { IconComponent } from '../icon/icon.component';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface SaveState {
  readonly status: SaveStatus;
  readonly savedAt?: string;
}

@Component({
  selector: 'kp-save-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'kp-save-status', '[class]': '"kp-save-status--" + state().status' },
  template: `
    <span role="status" aria-live="polite" class="kp-save-status__text">
      @switch (state().status) {
        @case ('saving') {
          <span class="kp-save-status__spinner" aria-hidden="true"></span> Zapisywanie…
        }
        @case ('dirty') {
          <kp-icon name="pencil" [size]="14" /> Niezapisane zmiany
        }
        @case ('saved') {
          <kp-icon name="check" [size]="14" [strokeWidth]="2.2" /> Zapisano{{ state().savedAt ? ' ' + time() : '' }}
        }
        @case ('error') {
          <kp-icon name="alert-circle" [size]="14" /> Nie zapisano zmian
        }
        @default {
          <kp-icon name="check" [size]="14" /> Zmiany zapisują się automatycznie
        }
      }
    </span>
    @if (state().status === 'error') {
      <button type="button" class="kp-link-button" (click)="retry.emit()">Ponów</button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--kp-space-2);
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-xs);
    }
    :host(.kp-save-status--error) {
      color: var(--kp-color-danger);
    }
    :host(.kp-save-status--saved) {
      color: var(--kp-color-success);
    }
    .kp-save-status__text {
      display: inline-flex;
      align-items: center;
      gap: var(--kp-space-1);
    }
    .kp-save-status__spinner {
      width: 12px;
      height: 12px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: kp-spin 700ms linear infinite;
    }
    @keyframes kp-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class SaveStatusComponent {
  readonly state = input.required<SaveState>();
  readonly retry = output();

  protected readonly time = computed(() => formatDateValue(this.state().savedAt, 'time'));
}
