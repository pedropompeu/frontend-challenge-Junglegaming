import { readJson, removeItem, writeJson } from './storage'

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
}

export function clearStoredSession(): void {
  removeItem('local', SESSION_KEY)
}

type Listener = () => void
const listeners = new Set<Listener>()

export function onSessionExpired(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitSessionExpired(): void {
  for (const fn of [...listeners]) fn()
}
