import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionApi } from '@core/api/session.api';
import type { SessionInfo } from '@core/api/api.types';
import type { IsoDate } from '@core/domain/date';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from './auth.store';

function localToday(): IsoDate {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(SessionApi);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<SessionInfo | null>(null);

  readonly session = this.state.asReadonly();
  readonly loadFailed = signal(false);
  readonly isDemo = environment.demoMode;

  readonly user = computed(() => this.state()?.user ?? null);
  readonly orgUnit = computed(() => this.state()?.orgUnit ?? null);
  readonly office = computed(() => this.state()?.office ?? null);
  readonly today = computed<IsoDate>(() => this.state()?.today ?? localToday());
  readonly isHr = computed(() => this.user()?.roles.includes('hr') ?? false);
  readonly isManager = computed(() => this.user()?.roles.includes('manager') ?? false);
  readonly firstName = computed(() => this.user()?.fullName.split(' ')[0] ?? '');
  readonly homeUrl = computed(() => (this.isHr() ? '/procesy' : '/moje-oceny'));

  /** Wywoływane przed startem routingu — strażnicy tras korzystają z sesji synchronicznie. */
  async init(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.state.set(null);
      return;
    }
    try {
      this.state.set(await firstValueFrom(this.api.session()));
      this.loadFailed.set(false);
    } catch {
      this.loadFailed.set(true);
    }
  }

  async loadScenario(scenarioId: string): Promise<void> {
    const { landing } = await firstValueFrom(this.api.loadScenario(scenarioId));
    this.reloadAt(landing);
  }

  async resetDemo(): Promise<void> {
    const { landing } = await firstValueFrom(this.api.reset());
    this.reloadAt(landing);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.state.set(null);
    await this.router.navigateByUrl('/logowanie');
  }

  /** Pełne przeładowanie czyści pamięć podręczną wszystkich widoków po zmianie danych demo. */
  private reloadAt(url: string): void {
    this.document.location.assign(url);
  }
}
