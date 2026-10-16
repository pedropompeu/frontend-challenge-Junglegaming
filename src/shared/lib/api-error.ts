import type { ApiErrorCode } from '@/contracts'

export type ClientErrorCode = ApiErrorCode | 'NETWORK' | 'TIMEOUT' | 'UNKNOWN'

type ApiErrorInit = {
  status: number | null
  code: ClientErrorCode
  message: string
  fieldErrors?: Record<string, string>
  details?: unknown
}

/** Erro único da camada HTTP: envelope do backend, falha de rede, timeout ou resposta inválida. */
export class ApiError extends Error {
  readonly status: number | null
  readonly code: ClientErrorCode
  readonly fieldErrors?: Record<string, string>
  readonly details?: unknown

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    if (init.fieldErrors) this.fieldErrors = init.fieldErrors
    if (init.details !== undefined) this.details = init.details
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

/** Só falhas transitórias merecem nova tentativa; erros de negócio (4xx) são definitivos. */
export function isRetryable(e: unknown): boolean {
  if (!isApiError(e)) return false
  if (e.code === 'NETWORK' || e.code === 'TIMEOUT' || e.code === 'TRANSIENT') return true
  return e.status !== null && e.status >= 500
}

/** Mensagem segura para exibir ao usuário. */
export function errorMessage(e: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (!isApiError(e)) return fallback
  if (e.code === 'NETWORK') return 'Sem conexão com o servidor. Verifique sua internet.'
  if (e.code === 'TIMEOUT') return 'O servidor demorou para responder. Tente novamente.'
  if (e.code === 'UNKNOWN') return fallback
  return e.message || fallback
}
