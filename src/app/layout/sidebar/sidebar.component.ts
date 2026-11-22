import { CdkMenu, CdkMenuItem, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import type { AppUser, UserRole } from '@core/domain/people.model';
import { DemoStore } from '@core/session/demo.store';
import { SessionStore } from '@core/session/session.store';
import { KpDatePipe } from '@shared/pipes/format.pipes';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import type { IconName } from '@shared/ui/icon/icons';
import { filter, map } from 'rxjs';

interface NavItem {
  readonly label: string;
  readonly link: string;
  readonly icon: IconName;
  /** Ikony z projektu mają różne siatki — rozmiar wyrównuje je optycznie. */
  readonly iconSize: number;
  readonly roles: readonly UserRole[];
  /** Dodatkowe ścieżki, na których pozycja jest aktywna (np. sprawa otwarta z listy). */
  readonly alsoActiveOn?: readonly string[];
}

const NAV: readonly NavItem[] = [
  { label: 'Procesy ocen', link: '/procesy', icon: 'kp-calendar', iconSize: 22, roles: ['hr'], alsoActiveOn: ['/oceny'] },
  { label: 'Moje oceny', link: '/moje-oceny', icon: 'kp-documents', iconSize: 19, roles: ['manager'], alsoActiveOn: ['/oceny'] },
  { label: 'Pracownicy', link: '/pracownicy', icon: 'kp-people', iconSize: 24, roles: ['manager', 'hr'] },
  { label: 'Rekrutacje', link: '/rekrutacje', icon: 'kp-people', iconSize: 24, roles: ['manager', 'hr'] },
  { label: 'Przypomnienia', link: '/przypomnienia', icon: 'kp-bell', iconSize: 20, roles: ['hr'] },
  { label: 'Baza wiedzy', link: '/baza-wiedzy', icon: 'kp-documents', iconSize: 19, roles: ['manager', 'hr'] },
];

function startsWithPath(url: string, path: string): boolean {
  return url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`);
}

@Component({
  selector: 'kp-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CdkMenuTrigger, CdkMenu, CdkMenuItem, CdkMenuItemRadio, AvatarComponent, IconComponent, KpDatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly router = inject(Router);
  protected readonly session = inject(SessionStore);
  protected readonly demo = inject(DemoStore);

  readonly user = input.required<AppUser>();

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly nav = computed(() => NAV.filter((item) => item.roles.some((role) => this.user().roles.includes(role))));
  protected readonly roleLabel = computed(() => this.user().jobTitle);

  protected isActive(item: NavItem): boolean {
    const url = this.url();
    return [item.link, ...(item.alsoActiveOn ?? [])].some((path) => startsWithPath(url, path));
  }

  protected loadScenario(id: string): void {
    void this.session.loadScenario(id);
  }

  protected reset(): void {
    void this.session.resetDemo();
  }

  protected logout(): void {
    void this.session.logout();
  }
}
