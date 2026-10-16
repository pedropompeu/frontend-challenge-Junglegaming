// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearStoredSession,
  getSessionSnapshot,
  setStoredSession,
  subscribeSession,
} from '@/shared/lib/session-store'

const session = { token: 'tok_1', userId: 'usr_ana', expiresAt: '2099-01-01T00:00:00.000Z' }

afterEach(() => localStorage.clear())

describe('session snapshot', () => {
  it('keeps the same reference while the stored value does not change', () => {
    setStoredSession(session)
    const first = getSessionSnapshot()
    expect(first).toEqual(session)
    expect(getSessionSnapshot()).toBe(first)
    clearStoredSession()
    expect(getSessionSnapshot()).toBeNull()
  })

  it('notifies subscribers on set, clear and changes from other tabs', () => {
    const fn = vi.fn()
    const unsubscribe = subscribeSession(fn)
    setStoredSession(session)
    clearStoredSession()
    window.dispatchEvent(new StorageEvent('storage', { key: 'kurio:session' }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'outra-chave' }))
    expect(fn).toHaveBeenCalledTimes(3)
    unsubscribe()
    setStoredSession(session)
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
