import { HttpErrorResponse } from '@angular/common/http';
import type { ApiErrorBody } from '@core/api/api.types';

export interface ApiError {
  readonly status: number;
  readonly message: string;
  readonly issues: readonly string[];
}

const FALLBACK_MESSAGE = 'Coś poszło nie tak. Spróbuj ponownie za chwilę.';

export function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = (typeof error.error === 'object' ? error.error : null) as Partial<ApiErrorBody> | null;
    return {
      status: error.status,
      message: body?.message ?? (error.status === 0 ? 'Brak połączenia z serwerem.' : FALLBACK_MESSAGE),
      issues: body?.issues ?? [],
    };
  }
  return { status: -1, message: FALLBACK_MESSAGE, issues: [] };
}
