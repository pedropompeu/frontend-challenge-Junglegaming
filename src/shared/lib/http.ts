import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { ZodType } from 'zod'
import { ApiErrorBodySchema } from '@/contracts'
import { ApiError } from './api-error'
import { getGuestId } from './guest'
import { emitSessionExpired, getStoredSession } from './session-store'

/** Instância Axios única do app. */
export const http = axios.create({ baseURL: '/api', timeout: 10_000 })

http.interceptors.request.use((config) => {
  const session = getStoredSession()
  if (session) config.headers.set('Authorization', `Bearer ${session.token}`)
  config.headers.set('X-Guest-Id', getGuestId())
  return config
})

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AxiosError) {
    if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
      return new ApiError({ status: null, code: 'TIMEOUT', message: 'Tempo de resposta esgotado' })
    }
    if (!error.response) {
      return new ApiError({ status: null, code: 'NETWORK', message: 'Falha de rede' })
    }
    const { status, data } = error.response
    const body = ApiErrorBodySchema.safeParse(data)
    if (body.success) {
      const { code, message, fieldErrors, details } = body.data.error
      return new ApiError({ status, code, message, fieldErrors, details })
    }
    return new ApiError({
      status,
      code: status >= 500 ? 'TRANSIENT' : 'UNKNOWN',
      message: error.message,
    })
  }
  return new ApiError({ status: null, code: 'UNKNOWN', message: 'Erro inesperado', details: error })
}

http.interceptors.response.use(undefined, (error: unknown) => {
  // Cancelamento (AbortSignal do TanStack Query) não é erro de API.
  if (axios.isCancel(error)) return Promise.reject(error)
  const apiError = toApiError(error)
  const expired =
    apiError.status === 401 &&
    (apiError.code === 'SESSION_EXPIRED' ||
      (apiError.code === 'UNAUTHENTICATED' && getStoredSession() !== null))
  if (expired) emitSessionExpired()
  return Promise.reject(apiError)
})

/** Executa a requisição e valida a resposta no contrato; resposta fora do contrato vira `UNKNOWN`. */
export async function request<T>(schema: ZodType<T>, config: AxiosRequestConfig): Promise<T> {
  const res = await http.request<unknown>(config)
  const parsed = schema.safeParse(res.data)
  if (!parsed.success) {
    throw new ApiError({
      status: res.status,
      code: 'UNKNOWN',
      message: 'Resposta inesperada do servidor',
      details: parsed.error.issues,
    })
  }
  return parsed.data
}

/** Para endpoints sem corpo de resposta (204). */
export async function send(config: AxiosRequestConfig): Promise<void> {
  await http.request(config)
}
