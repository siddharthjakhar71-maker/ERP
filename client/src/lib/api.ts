export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  details?: unknown;
}

export class ApiClientError extends Error {
  constructor(message: string, public statusCode: number, public details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !body.success) {
    throw new ApiClientError(body.message || `Request failed: ${response.status}`, response.status, body.details);
  }

  return body.data;
}
