import { apiConfig } from '../core/config'
import type { ProblemDetail } from './types'

/**
 * Flutter `ApiService`(Dio) 대응. fetch 기반이며 `X-User-Key` 헤더를 모듈 상태로 보관한다.
 * 실패 응답은 RFC 9457 Problem Details 를 파싱해 `ApiError` 로 던진다.
 */
export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetail | null

  constructor(status: number, problem: ProblemDetail | null, fallbackMessage: string) {
    super(problem?.detail ?? problem?.title ?? fallbackMessage)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }

  get code(): string | undefined {
    return this.problem?.code
  }
}

export class NetworkError extends Error {
  constructor(message = '서버에 연결할 수 없습니다.') {
    super(message)
    this.name = 'NetworkError'
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

let currentUserKey: string | null = null

export function setUserKey(userKey: string): void {
  currentUserKey = userKey
}

export function clearUserKey(): void {
  currentUserKey = null
}

export function getUserKey(): string | null {
  return currentUserKey
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8'
  }
  if (currentUserKey) {
    headers['X-User-Key'] = currentUserKey
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), apiConfig.timeoutMs)

  let response: Response
  try {
    response = await fetch(`${apiConfig.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[ICELINK API] ${method} ${path} network error`, error)
    }
    throw new NetworkError(
      error instanceof DOMException && error.name === 'AbortError'
        ? '서버 응답이 없습니다. (시간 초과)'
        : '서버에 연결할 수 없습니다.',
    )
  } finally {
    window.clearTimeout(timer)
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (import.meta.env.DEV) {
    console.debug(`[ICELINK API] ${response.status} ${method} ${path}`, redact(data))
  }

  if (!response.ok) {
    const problem = isRecord(data) ? (data as ProblemDetail) : null
    throw new ApiError(response.status, problem, `요청에 실패했습니다. (${response.status})`)
  }

  return data as T
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Flutter `_safeLogData` 와 동일: 키·답변 원문은 로그에 남기지 않는다. */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact)
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value)) {
      const lower = key.toLowerCase()
      if (lower === 'userkey' || lower === 'x-user-key' || lower === 'authorization') {
        out[key] = '[redacted]'
      } else if (lower === 'answertext') {
        out[key] = '[redacted-answer-text]'
      } else {
        out[key] = redact(v)
      }
    }
    return out
  }
  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}... [truncated]`
  }
  return value
}

/** 에러를 사용자에게 보여줄 한국어 문장으로 바꾼다. */
export function describeError(error: unknown, fallback = '서버 요청에 실패했습니다.'): string {
  if (error instanceof ApiError) {
    if (error.problem?.errors?.length) {
      return error.problem.errors.map((e) => e.message).join('\n')
    }
    return error.problem?.detail ?? fallback
  }
  if (error instanceof NetworkError) {
    return error.message
  }
  return fallback
}
