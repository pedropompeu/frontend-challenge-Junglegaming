import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/mocks/db/store'
import { resetRuntime, setLatencyOverride, setScenario } from '@/mocks/scenarios/runtime'
import type { ScenarioName } from '@/mocks/scenarios/names'

export const url = (p: string) => `${location.origin}${p}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiResult<T = any> = { status: number; body: T }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function call<T = any>(
  method: string,
  path: string,
  opts: { token?: string; guestId?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { ...opts.headers }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.guestId) headers['X-Guest-Id'] = opts.guestId
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const r = await fetch(url(path), {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  const text = await r.text()
  return { status: r.status, body: text ? JSON.parse(text) : null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const get = <T = any>(path: string, token?: string) => call<T>('GET', path, { token })

export async function login(email: string, password = 'Kurio@123'): Promise<string> {
  const r = await call('POST', '/api/auth/login', { body: { email, password } })
  if (r.status !== 200) throw new Error(`login falhou: ${r.status}`)
  return r.body.token as string
}

/** Sobe o MSW em node com os handlers reais e reseta banco + runtime a cada teste. */
export function setupMockApi(scenario: ScenarioName = 'default') {
  const server = setupServer(...handlers)
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  afterEach(() => server.resetHandlers())
  beforeEach(async () => {
    localStorage.clear()
    resetRuntime()
    setScenario(scenario)
    setLatencyOverride(0)
    await resetDb(scenario)
  })
  return server
}
