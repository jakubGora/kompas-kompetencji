import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbStore } from '@core/layout/breadcrumb.store';
import { NotificationsStore } from '@core/notifications/notifications.store';
import { SessionStore } from '@core/session/session.store';
import { DialogService } from '@shared/ui/dialog/dialog.service';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { NotificationsDrawerComponent } from '../notifications/notifications-drawer.component';

/** Wiersz nad nagłówkiem strony: okruszki „Obszar roboczy / …” i powiadomienia. */
@Component({
  selector: 'kp-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  protected readonly session = inject(SessionStore);
  protected readonly breadcrumbs = inject(BreadcrumbStore);
  protected readonly notifications = inject(NotificationsStore);
  private readonly dialogs = inject(DialogService);

  readonly navOpen = input(false);
  readonly toggleNav = output();

  protected openNotifications(): void {
    this.notifications.refresh();
    this.dialogs.drawer(NotificationsDrawerComponent, { width: '440px', labelledBy: 'kp-notifications-title' });
  }
}
