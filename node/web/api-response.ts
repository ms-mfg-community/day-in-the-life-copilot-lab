export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: { total: number; page?: number; limit?: number };
}

export interface ApiFailure {
  readonly success: false;
  readonly error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const ok = <T>(data: T, meta?: ApiSuccess<T>['meta']): ApiSuccess<T> =>
  meta ? { success: true, data, meta } : { success: true, data };

export const fail = (error: string): ApiFailure => ({ success: false, error });
