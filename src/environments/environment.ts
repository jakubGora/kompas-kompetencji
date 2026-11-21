import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: '/api',
  useMockBackend: false,
  demoMode: true,
  mockLatencyMs: [120, 320],
  mockAiLatencyMs: [700, 1300],
};
