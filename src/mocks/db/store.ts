import type { ScenarioName } from '../scenarios/names'
import type { MockDbState } from './schema'
import { buildSeed } from './seed'

// v2: o NFT ganhou `category`; bancos v1 salvos não passariam no contrato.
export const DB_STORAGE_KEY = 'kurio:mockdb:v2'
const LEGACY_KEYS = ['kurio:mockdb:v1']
const META_KEY = 'kurio:mockdb:scenario'

let state: MockDbState | null = null

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function persist(): void {
  try {
    storage()?.setItem(DB_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Armazenamento cheio ou bloqueado: o banco segue em memória.
  }
}

export function getDb(): MockDbState {
  if (!state) throw new Error('Mock DB não inicializado: chame loadOrSeed() ou resetDb().')
  return state
}

/** Aplica uma mutação no banco simulado e persiste em localStorage. */
export function mutate<T>(fn: (db: MockDbState) => T): T {
  const result = fn(getDb())
  persist()
  return result
}

export async function resetDb(scenario: ScenarioName): Promise<void> {
  state = await buildSeed(scenario)
  storage()?.setItem(META_KEY, scenario)
  persist()
}

/** Restaura o banco persistido; recria do seed se não houver ou se o cenário mudou. */
export async function loadOrSeed(scenario: ScenarioName): Promise<void> {
  const s = storage()
  for (const key of LEGACY_KEYS) s?.removeItem(key)
  const raw = s?.getItem(DB_STORAGE_KEY)
  if (raw && s?.getItem(META_KEY) === scenario) {
    try {
      state = JSON.parse(raw) as MockDbState
      return
    } catch {
      // Banco corrompido: recria.
    }
  }
  await resetDb(scenario)
}

export function nextId(prefix: string): string {
  return mutate((db) => {
    db.seq += 1
    return `${prefix}_${db.seq.toString(36).padStart(5, '0')}`
  })
}

/** Relógio do backend simulado (respeita page.clock nos testes E2E). */
export function now(): Date {
  return new Date(Date.now())
}
