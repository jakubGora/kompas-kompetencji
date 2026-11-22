import type { ApiErrorBody } from '@core/api/api.types';

export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

export const notFound = (what: string) =>
  new MockHttpError(404, { code: 'not-found', message: `Nie znaleziono: ${what}.` });

export const forbidden = (message = 'Nie masz dostępu do tego zasobu.') =>
  new MockHttpError(403, { code: 'forbidden', message });

export const badRequest = (message: string) => new MockHttpError(400, { code: 'bad-request', message });

export const conflict = (message: string) => new MockHttpError(409, { code: 'conflict', message });

export const unprocessable = (message: string, issues: readonly string[] = []) =>
  new MockHttpError(422, { code: 'validation', message, issues });

export const unauthorized = (message = 'Wymagane logowanie.') =>
  new MockHttpError(401, { code: 'unauthorized', message });
