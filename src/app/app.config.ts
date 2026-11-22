import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localePl from '@angular/common/locales/pl';
import {
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  type ApplicationConfig,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { authInterceptor } from '@core/http/auth.interceptor';
import { mockBackendInterceptor } from '@core/http/mock-backend.interceptor';
import { workspaceInterceptor } from '@core/http/workspace.interceptor';
import { PageTitleStrategy } from '@core/layout/page-title.strategy';
import { AuthStore } from '@core/session/auth.store';
import { SessionStore } from '@core/session/session.store';
import { routes } from './app.routes';

registerLocaleData(localePl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([workspaceInterceptor, authInterceptor, mockBackendInterceptor]),
    ),
    { provide: LOCALE_ID, useValue: 'pl' },
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideAppInitializer(async () => {
      const auth = inject(AuthStore);
      if (auth.isAuthenticated()) {
        await inject(SessionStore).init();
      }
    }),
  ],
};
