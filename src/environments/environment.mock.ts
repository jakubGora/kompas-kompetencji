import type { AppEnvironment } from './environment.model';

/** Demo bez serwera: backend demonstracyjny w przeglądarce (`ng serve -c mock`, `ng build -c mock`). */
export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: '/api',
  useMockBackend: true,
  demoMode: true,
  mockLatencyMs: [120, 320],
  mockAiLatencyMs: [700, 1300],
};
