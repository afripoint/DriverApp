const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    super(`Request failed (${status})`);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown; token?: string };

/** Response types must match your backend contract. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!baseUrl) throw new Error('Set EXPO_PUBLIC_API_URL in your .env file.');
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('API paths must begin with a single /.');
  const { body, token, headers: suppliedHeaders, ...init } = options;
  const headers = new Headers(suppliedHeaders);
  headers.set('Accept', 'application/json');
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: init.signal ?? AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let data: unknown = text || undefined;
  if (text && response.headers.get('content-type')?.includes('json')) {
    try { data = JSON.parse(text); } catch {
      if (response.ok) throw new Error('The API returned invalid JSON.');
    }
  }
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}
