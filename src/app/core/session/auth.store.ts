import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthApi } from '@core/api/auth.api';
import type { AuthAccountHint, LoginResult } from '@core/api/api.types';
import type { AppUser } from '@core/domain/people.model';
import { firstValueFrom } from 'rxjs';

const TOKEN_KEY = 'kompas.auth.token';
const USER_KEY = 'kompas.auth.user';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly tokenState = signal<string | null>(readToken());
  private readonly userState = signal<AppUser | null>(readUser());
  private readonly accountsState = signal<readonly AuthAccountHint[]>([]);

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly accounts = this.accountsState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));

  async loadAccounts(): Promise<void> {
    try {
      const { accounts } = await firstValueFrom(this.api.accounts());
      this.accountsState.set(accounts);
    } catch {
      this.accountsState.set([]);
    }
  }

  async login(login: string, password: string): Promise<LoginResult> {
    const result = await firstValueFrom(this.api.login(login, password));
    this.persist(result.token, result.user);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      /* i tak czyścimy lokalnie */
    }
    this.clear();
  }

  clear(): void {
    this.persist(null, null);
  }

  private persist(token: string | null, user: AppUser | null): void {
    this.tokenState.set(token);
    this.userState.set(user);
    const storage = typeof localStorage === 'undefined' ? null : localStorage;
    if (!storage) return;
    if (token && user) {
      storage.setItem(TOKEN_KEY, token);
      storage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      storage.removeItem(TOKEN_KEY);
      storage.removeItem(USER_KEY);
    }
  }
}

function readToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function readUser(): AppUser | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}
