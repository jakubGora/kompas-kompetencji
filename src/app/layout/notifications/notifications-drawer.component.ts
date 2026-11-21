import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { AppNotification, NotificationKind } from '@core/domain/notification.model';
import { NotificationsStore } from '@core/notifications/notifications.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { ButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/dialog/dialog-shell.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import type { IconName } from '@shared/ui/icon/icons';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';

const KIND_ICON: Readonly<Record<NotificationKind, IconName>> = {
  termin: 'calendar',
  przypomnienie: 'bell-ring',
  proces: 'route',
  zapoznanie: 'file-check',
  system: 'info',
};

@Component({
  selector: 'kp-notifications-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShellComponent, ButtonComponent, EmptyStateComponent, IconComponent, SkeletonComponent, KpDatePipe],
  template: `
    <kp-dialog-shell heading="Powiadomienia" titleId="kp-notifications-title" description="Terminy, przypomnienia od kadr i zmiany w procesach.">
      @if (store.loading()) {
        <div class="kp-stack">
          @for (item of [1, 2, 3]; track item) {
            <kp-skeleton height="72px" radius="var(--kp-radius-md)" />
          }
        </div>
      } @else if (store.items().length === 0) {
        <kp-empty-state icon="bell" heading="Brak powiadomień" description="Gdy kadry wyślą przypomnienie albo zbliży się termin, zobaczysz to tutaj." />
      } @else {
        <ul class="kp-notifications">
          @for (item of store.items(); track item.id) {
            <li>
              <button type="button" class="kp-notification" [class.kp-notification--unread]="!item.readAt" (click)="open(item)">
                <span class="kp-notification__icon"><kp-icon [name]="icon[item.kind]" [size]="18" /></span>
                <span class="kp-notification__body">
                  <span class="kp-notification__title">
                    @if (!item.readAt) {
                      <span class="kp-visually-hidden">Nieprzeczytane:</span>
                    }
                    {{ item.title }}
                  </span>
                  <span class="kp-notification__text">{{ item.body }}</span>
                  <span class="kp-notification__meta">
                    {{ item.createdAt | kpDate: 'datetime' }}
                    @if (item.sender) {
                      · {{ item.sender.fullName }}
                    }
                  </span>
                </span>
                @if (item.link) {
                  <kp-icon class="kp-notification__chevron" name="chevron-right" [size]="16" />
                }
              </button>
            </li>
          }
        </ul>
      }
      <ng-container dialogFooter>
        <button type="button" kpButton="secondary" size="sm" icon="check" [disabled]="store.unreadCount() === 0" (click)="markAll()">
          Oznacz wszystkie jako przeczytane
        </button>
      </ng-container>
    </kp-dialog-shell>
  `,
  styles: `
    .kp-notifications {
      display: grid;
      gap: var(--kp-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .kp-notification {
      display: flex;
      align-items: flex-start;
      gap: var(--kp-space-3);
      width: 100%;
      padding: var(--kp-space-3);
      border: 1px solid var(--kp-color-border-subtle);
      border-radius: var(--kp-radius-md);
      background: var(--kp-color-surface);
      color: var(--kp-color-text);
      text-align: start;
      cursor: pointer;
    }
    .kp-notification:hover {
      border-color: var(--kp-color-primary-border);
    }
    .kp-notification:focus-visible {
      outline: 2px solid var(--kp-focus-outline-color);
      outline-offset: 2px;
    }
    .kp-notification--unread {
      border-color: var(--kp-color-primary-border);
      background: var(--kp-color-surface-tint);
    }
    .kp-notification__icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--kp-color-surface);
      color: var(--kp-color-primary);
      box-shadow: inset 0 0 0 1px var(--kp-color-border-subtle);
    }
    .kp-notification__body {
      display: grid;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }
    .kp-notification__title {
      font-size: var(--kp-font-size-sm);
      font-weight: 600;
    }
    .kp-notification__text {
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-xs);
      white-space: pre-line;
    }
    .kp-notification__meta {
      color: var(--kp-color-text-muted);
      font-size: var(--kp-font-size-2xs);
    }
    .kp-notification__chevron {
      align-self: center;
      color: var(--kp-color-text-muted);
    }
  `,
})
export class NotificationsDrawerComponent {
  protected readonly store = inject(NotificationsStore);
  private readonly ref = inject(DialogRef);
  private readonly router = inject(Router);
  protected readonly icon = KIND_ICON;

  protected async open(item: AppNotification): Promise<void> {
    void this.store.markRead(item);
    if (item.link) {
      this.ref.close();
      await this.router.navigateByUrl(item.link);
    }
  }

  protected markAll(): void {
    void this.store.markAllRead();
  }
}
