import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: '/api',
  // Do czasu wdrożenia backendu także build produkcyjny korzysta z mocka (demo offline).
  useMockBackend: true,
  mockLatencyMs: [120, 320],
  mockAiLatencyMs: [700, 1300],
};
