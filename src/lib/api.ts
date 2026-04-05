const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

type FetchOptions = RequestInit & { token?: string }

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...init } = options
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  get: <T>(path: string, opts?: FetchOptions) => apiFetch<T>(path, { method: 'GET', ...opts }),
  post: <T>(path: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  patch: <T>(path: string, body: unknown, opts?: FetchOptions) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  delete: <T>(path: string, opts?: FetchOptions) => apiFetch<T>(path, { method: 'DELETE', ...opts }),
}
