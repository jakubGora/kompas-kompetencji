import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/icons';
import { ToastService, type ToastTone } from './toast.service';

const ICON: Readonly<Record<ToastTone, IconName>> = {
  success: 'check-circle',
  info: 'info',
  warning: 'alert',
  danger: 'alert-circle',
};

@Component({
  selector: 'kp-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'kp-toast-host kp-no-print' },
  template: `
    <div class="kp-toast-host__region" role="status" aria-live="polite" aria-atomic="false">
      @for (toast of service.toasts(); track toast.id) {
        <div class="kp-toast" [class]="'kp-toast--' + toast.tone">
          <kp-icon class="kp-toast__icon" [name]="icon[toast.tone]" [size]="20" />
          <div class="kp-toast__body">
            <p class="kp-toast__title">{{ toast.title }}</p>
            @if (toast.message) {
              <p class="kp-toast__message">{{ toast.message }}</p>
            }
          </div>
          <button type="button" class="kp-toast__close" (click)="service.dismiss(toast.id)" aria-label="Zamknij komunikat">
            <kp-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .kp-toast-host__region {
      position: fixed;
      right: var(--kp-space-6);
      bottom: var(--kp-space-6);
      z-index: calc(var(--kp-z-overlay) + 10);
      display: grid;
      gap: var(--kp-space-2);
      width: min(400px, calc(100vw - 2 * var(--kp-space-4)));
      pointer-events: none;
    }
    .kp-toast {
      --_accent: var(--kp-color-info);
      display: flex;
      align-items: flex-start;
      gap: var(--kp-space-3);
      padding: var(--kp-space-3) var(--kp-space-3) var(--kp-space-3) var(--kp-space-4);
      border: 1px solid var(--kp-color-border-subtle);
      border-left: 4px solid var(--_accent);
      border-radius: var(--kp-radius-md);
      background: var(--kp-color-surface);
      box-shadow: var(--kp-shadow-lg);
      pointer-events: auto;
      animation: kp-toast-in var(--kp-duration-slow) var(--kp-ease-emphasized);
    }
    .kp-toast--success {
      --_accent: var(--kp-color-success);
    }
    .kp-toast--warning {
      --_accent: var(--kp-color-warning);
    }
    .kp-toast--danger {
      --_accent: var(--kp-color-danger);
    }
    .kp-toast__icon {
      color: var(--_accent);
      margin-top: 1px;
    }
    .kp-toast__body {
      flex: 1;
      min-width: 0;
    }
    .kp-toast__title {
      margin: 0;
      font-weight: 600;
      font-size: var(--kp-font-size-sm);
    }
    .kp-toast__message {
      margin: 2px 0 0;
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-xs);
    }
    .kp-toast__close {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: var(--kp-radius-xs);
      background: transparent;
      color: var(--kp-color-text-muted);
      cursor: pointer;
    }
    .kp-toast__close:hover {
      background: var(--kp-color-surface-hover);
    }
    @keyframes kp-toast-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  `,
})
export class ToastHostComponent {
  protected readonly service = inject(ToastService);
  protected readonly icon = ICON;
}
