const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(data.message)) return data.message.join(', ')
    if (typeof data.message === 'string') return data.message
  } catch {
    // ignore
  }
  return `API request failed: ${response.status}`
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  return apiClient<T>(endpoint, { method: 'POST', body: formData })
}
