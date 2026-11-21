import { Injectable, computed, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationsApi } from '@core/api/notifications.api';
import type { AppNotification } from '@core/domain/notification.model';
import { firstValueFrom, interval } from 'rxjs';

const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly api = inject(NotificationsApi);
  private readonly resource = rxResource({ stream: () => this.api.list() });

  readonly items = computed<readonly AppNotification[]>(() => this.resource.value() ?? []);
  readonly loading = computed(() => this.resource.isLoading() && !this.resource.hasValue());
  readonly unreadCount = computed(() => this.items().filter((item) => !item.readAt).length);

  constructor() {
    interval(POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.refresh());
  }

  refresh(): void {
    this.resource.reload();
  }

  async markRead(notification: AppNotification): Promise<void> {
    if (notification.readAt) return;
    const updated = await firstValueFrom(this.api.markRead(notification.id));
    this.resource.update((items) => items?.map((item) => (item.id === updated.id ? updated : item)));
  }

  async markAllRead(): Promise<void> {
    await firstValueFrom(this.api.markAllRead());
    this.resource.reload();
  }
}
