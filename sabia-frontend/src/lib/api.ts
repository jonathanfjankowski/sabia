import { useAuthStore } from '@/stores/auth'

const RAW_BASE = import.meta.env.VITE_API_URL ?? ''
const BASE = (RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE.replace(/\/+$/, '')}/api`).replace(/\/+$/, '')

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const contentType = res.headers.get('Content-Type') ?? ''
  if (!res.ok) {
    const body = contentType.includes('application/json') ? await res.json() : await res.text()
    throw new ApiError(
      (body as { message?: string })?.message ?? `Erro ${res.status}`,
      res.status,
      body
    )
  }
  if (contentType.includes('application/json')) return (await res.json()) as T
  return (await res.text()) as unknown as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  raw: (path: string, options?: RequestInit) => {
    const token = useAuthStore.getState().token
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> | undefined),
    }
    if (token) headers.Authorization = `Bearer ${token}`
    if (options?.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
    return fetch(`${BASE}${path}`, { ...options, headers })
  },
}
