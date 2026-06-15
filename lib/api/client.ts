/**
 * Custom mutator for Orval-generated hooks.
 *
 * Calling convention matches what the generated code emits:
 *   customInstance<T>(url: string, init?: RequestInit): Promise<T>
 *
 * Base URL is the same-origin BFF proxy (/api/gada). Generated spec paths
 * already include /v1, so the join is:
 *   /api/gada + /v1/admin/events  →  /api/gada/v1/admin/events
 *   which the proxy forwards to  →  API_ORIGIN/v1/admin/events
 *
 * Auth is handled server-side by the BFF proxy reading the httpOnly cookie;
 * this client does NOT inject any Authorization header.
 *
 * The server always wraps responses in { success, data }; this client unwraps
 * that envelope so generated hook types see only the inner data.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/gada';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Envelope — what the server always sends back
// ---------------------------------------------------------------------------

interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  // Pagination meta lives at the envelope level, not inside data
  meta?: PaginationMeta;
  message?: string;
}

// ---------------------------------------------------------------------------
// Core fetch — Orval custom-mutator contract (url, init) form
// ---------------------------------------------------------------------------

export const customInstance = async <TResponse>(
  url: string,
  init?: RequestInit,
): Promise<TResponse> => {
  const fullUrl = `${BASE_URL}${url}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, init);
  } catch (err) {
    throw new ApiError(0, (err as Error).message ?? 'Network error');
  }

  let body: ApiEnvelope<TResponse> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<TResponse>;
  } catch {
    throw new ApiError(response.status, 'Failed to parse response body');
  }

  if (!response.ok || !body?.success) {
    throw new ApiError(
      response.status,
      body?.message ?? response.statusText ?? 'Request failed',
    );
  }

  // When the server includes top-level pagination meta, surface it alongside data
  // so paginated list hooks can access { data, meta } rather than just the array.
  if (body.meta !== undefined) {
    return { data: body.data, meta: body.meta } as unknown as TResponse;
  }

  return body.data;
};
