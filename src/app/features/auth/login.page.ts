import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { AuthAccountHint } from '@core/api/api.types';
import { AuthStore } from '@core/session/auth.store';
import { SessionStore } from '@core/session/session.store';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { ButtonComponent } from '@shared/ui/button/button.component';

@Component({
  selector: 'kp-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonComponent, AvatarComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly login = signal('');
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly accounts = this.auth.accounts;

  constructor() {
    void this.auth.loadAccounts();
  }

  protected pick(account: AuthAccountHint): void {
    this.login.set(account.login);
    this.password.set('');
    this.error.set(null);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.login().trim(), this.password());
      await this.session.init();
      await this.router.navigateByUrl(this.session.homeUrl());
    } catch (err) {
      const message =
        err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'message' in err.error
          ? String((err.error as { message: string }).message)
          : 'Nie udało się zalogować. Sprawdź login i hasło.';
      this.error.set(message);
    } finally {
      this.submitting.set(false);
    }
  }
}
