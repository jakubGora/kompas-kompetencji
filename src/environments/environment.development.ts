import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: '/api',
  useMockBackend: true,
  mockLatencyMs: [120, 320],
  mockAiLatencyMs: [700, 1300],
};
