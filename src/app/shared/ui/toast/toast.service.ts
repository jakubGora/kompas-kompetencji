import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';

export interface Toast {
  readonly id: number;
  readonly tone: ToastTone;
  readonly title: string;
  readonly message?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly state = signal<readonly Toast[]>([]);
  readonly toasts = this.state.asReadonly();

  show(tone: ToastTone, title: string, message?: string, timeoutMs = DEFAULT_TIMEOUT_MS): void {
    const toast: Toast = { id: ++this.nextId, tone, title, ...(message ? { message } : {}) };
    this.state.update((items) => [...items.slice(-3), toast]);
    if (timeoutMs > 0) {
      setTimeout(() => this.dismiss(toast.id), timeoutMs);
    }
  }

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  error(title: string, message?: string): void {
    this.show('danger', title, message, 8000);
  }

  dismiss(id: number): void {
    this.state.update((items) => items.filter((item) => item.id !== id));
  }
}
