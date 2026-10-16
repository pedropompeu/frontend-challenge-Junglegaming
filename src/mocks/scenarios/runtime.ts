import type { ApiErrorCode } from '@/contracts'
import { mulberry32 } from '../db/prng'
import { isScenarioName, type ScenarioName } from './names'
import { SCENARIOS, type EndpointId, type ScenarioConfig } from './scenarios'

export const SCENARIO_STORAGE_KEY = 'kurio:mock-scenario'

export type FailureSpec = {
  status: number
  code: ApiErrorCode
  networkError: boolean
  remaining: number
}

type Latency = number | { min: number; max: number }

let current: ScenarioName | null = null
let latencyOverride: Latency | null = null
let rand = mulberry32(7)
const failures = new Map<EndpointId, FailureSpec>()
const hits = new Map<EndpointId, number>()
const hung = new Set<EndpointId>()

function readStorage(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Sem armazenamento: o cenário vale só para esta carga.
  }
}

/** Cenário ativo: `?scenario=` na carga (persistido) → `kurio:mock-scenario` → `default`. */
export function getScenario(): ScenarioName {
  if (current) return current
  const fromUrl = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('scenario')
  if (isScenarioName(fromUrl)) {
    writeStorage(SCENARIO_STORAGE_KEY, fromUrl)
    current = fromUrl
    return current
  }
  const stored = readStorage(SCENARIO_STORAGE_KEY)
  current = isScenarioName(stored) ? stored : 'default'
  return current
}

export function getScenarioConfig(): ScenarioConfig {
  return SCENARIOS[getScenario()]
}

/** Troca o cenário e zera o estado volátil (falhas, contadores e PRNG de latência). */
export function setScenario(name: ScenarioName): void {
  current = name
  writeStorage(SCENARIO_STORAGE_KEY, name)
  failures.clear()
  hits.clear()
  hung.clear()
  rand = mulberry32(7)
}

export function setLatencyOverride(v: Latency | null): void {
  latencyOverride = v
}

export function failNext(
  endpoint: EndpointId,
  opts: { status?: number; code?: ApiErrorCode; times?: number; networkError?: boolean } = {},
): void {
  failures.set(endpoint, {
    status: opts.status ?? 503,
    code: opts.code ?? 'TRANSIENT',
    networkError: opts.networkError ?? false,
    remaining: opts.times ?? 1,
  })
}

export function consumeFailure(endpoint: EndpointId): FailureSpec | null {
  const spec = failures.get(endpoint)
  if (!spec) return null
  spec.remaining -= 1
  if (spec.remaining <= 0) failures.delete(endpoint)
  return spec
}

/** Conta as chamadas a um endpoint desde a última troca de cenário (1 na primeira chamada). */
export function countHit(endpoint: EndpointId): number {
  const n = (hits.get(endpoint) ?? 0) + 1
  hits.set(endpoint, n)
  return n
}

/** `true` só na primeira chamada de um endpoint `hang-first` desde a troca de cenário. */
export function consumeHang(endpoint: EndpointId): boolean {
  if (hung.has(endpoint)) return false
  hung.add(endpoint)
  return true
}

export function sampleLatency(): number {
  const l = latencyOverride ?? getScenarioConfig().latency
  if (typeof l === 'number') return l
  if (l.max <= l.min) return l.min
  return Math.round(l.min + rand() * (l.max - l.min))
}

/** Limpa todo o estado em memória do runtime (usado pela API de controle e pelos testes). */
export function resetRuntime(): void {
  current = null
  latencyOverride = null
  failures.clear()
  hits.clear()
  hung.clear()
  rand = mulberry32(7)
}
