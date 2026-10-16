import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/contracts'
import { getDb, now } from './db/store'
import {
  consumeFailure,
  consumeHang,
  countHit,
  getScenarioConfig,
  sampleLatency,
} from './scenarios/runtime'
import type { EndpointId } from './scenarios/scenarios'

export type RouteContext = {
  request: Request
  params: Record<string, string>
  userId: string | null
  guestId: string | null
  token: string | null
}

type Resolver = (ctx: RouteContext) => Promise<Response> | Response

export function json<T>(data: T, status = 200): Response {
  return HttpResponse.json(data as never, { status })
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: { fieldErrors?: Record<string, string>; details?: unknown },
): Response {
  const body: ApiErrorBody = { error: { code, message, ...extra } }
  return HttpResponse.json(body, { status })
}

export function unauthenticated(): Response {
  return apiError(401, 'UNAUTHENTICATED', 'Faça login para continuar')
}

const never = () => new Promise<never>(() => {})

/**
 * Registra um handler MSW com o pipeline comum: offline → falha injetada → override do cenário
 * → latência → autenticação → resolver.
 */
export function route(endpoint: EndpointId, resolver: Resolver): HttpHandler {
  const [method, path] = endpoint.split(' ') as [string, string]
  const register = http[method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete']

  return register(`/api${path}`, async ({ request, params }) => {
    const scenario = getScenarioConfig()
    if (scenario.offline) return HttpResponse.error()

    const failure = consumeFailure(endpoint)
    if (failure) {
      if (failure.networkError) return HttpResponse.error()
      return apiError(failure.status, failure.code, 'Falha simulada')
    }

    const override = scenario.overrides?.[endpoint]
    if (override && override !== 'hang-first') {
      await delay(sampleLatency())
      return apiError(override.status, override.code, override.message ?? 'Operação recusada', {
        ...(override.fieldErrors ? { fieldErrors: override.fieldErrors } : {}),
      })
    }

    if (scenario.restError && method === 'GET' && countHit(endpoint) <= 2) {
      await delay(sampleLatency())
      return apiError(
        scenario.restError.status,
        'TRANSIENT',
        'Serviço temporariamente indisponível',
      )
    }

    await delay(sampleLatency())

    let userId: string | null = null
    const auth = request.headers.get('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (token) {
      const session = getDb().sessions.find((s) => s.token === token)
      if (!session) return unauthenticated()
      if (Date.parse(session.expiresAt) <= now().getTime()) {
        return apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
      }
      userId = session.userId
    }
    const guestId = request.headers.get('X-Guest-Id')

    const ctx: RouteContext = {
      request,
      params: Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? (v[0] ?? '') : (v ?? '')]),
      ),
      userId,
      guestId,
      token,
    }

    if (override === 'hang-first' && consumeHang(endpoint)) {
      await resolver(ctx)
      return never()
    }
    return resolver(ctx)
  })
}
