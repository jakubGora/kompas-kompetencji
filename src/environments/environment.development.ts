import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  // `ng serve` przekazuje /api do backendu na :8000 (proxy.conf.json).
  apiBaseUrl: '/api',
  useMockBackend: false,
  demoMode: true,
  mockLatencyMs: [120, 320],
  mockAiLatencyMs: [700, 1300],
};
