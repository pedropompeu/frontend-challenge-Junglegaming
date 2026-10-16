import { readItem, readJson, removeItem, writeJson } from './storage'

export const SESSION_KEY = 'kurio:session'

export type StoredSession = { token: string; userId: string; expiresAt: string }

function isStoredSession(v: unknown): v is StoredSession {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.token === 'string' && typeof s.userId === 'string' && typeof s.expiresAt === 'string'
  )
}

export function getStoredSession(): StoredSession | null {
  return readJson('local', SESSION_KEY, isStoredSession)
}

export function setStoredSession(s: StoredSession): void {
  writeJson('local', SESSION_KEY, { token: s.token, userId: s.userId, expiresAt: s.expiresAt })
  notifyChange()
}

export function clearStoredSession(): void {
  removeItem('local', SESSION_KEY)
  notifyChange()
}

type Listener = () => void

const changeListeners = new Set<Listener>()
let snapshotRaw: string | null | undefined
let snapshot: StoredSession | null = null

function notifyChange(): void {
  for (const fn of [...changeListeners]) fn()
}

/** Snapshot estável (mesma referência enquanto o valor salvo não muda) para `useSyncExternalStore`. */
export function getSessionSnapshot(): StoredSession | null {
  const raw = readItem('local', SESSION_KEY)
  if (raw !== snapshotRaw) {
    snapshotRaw = raw
    snapshot = getStoredSession()
  }
  return snapshot
}

/** Avisa quando a sessão salva muda nesta aba ou em outra (evento `storage`). */
export function subscribeSession(fn: Listener): () => void {
  changeListeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SESSION_KEY) fn()
  }
  globalThis.addEventListener?.('storage', onStorage)
  return () => {
    changeListeners.delete(fn)
    globalThis.removeEventListener?.('storage', onStorage)
  }
}
const listeners = new Set<Listener>()

export function onSessionExpired(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitSessionExpired(): void {
  for (const fn of [...listeners]) fn()
}
