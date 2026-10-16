// @vitest-environment jsdom
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearPrivateState } from '@/features/auth/private-state'

describe('clearPrivateState', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('removes private queries and keeps public ones', () => {
    const qc = new QueryClient()
    qc.setQueryData(['private', 'usr_ana', 'favorites'], ['x'])
    qc.setQueryData(['nfts', 'detail', 'a'], { id: 'a' })
    clearPrivateState(qc)
    expect(qc.getQueryData(['private', 'usr_ana', 'favorites'])).toBeUndefined()
    expect(qc.getQueryData(['nfts', 'detail', 'a'])).toEqual({ id: 'a' })
  })

  it('removes drafts of other users and keeps the current one', () => {
    sessionStorage.setItem('kurio:checkout-draft:usr_ana', '{}')
    sessionStorage.setItem('kurio:checkout-draft:usr_bruno', '{}')
    sessionStorage.setItem('kurio:checkout-attempt:usr_ana', '{}')
    localStorage.setItem('kurio:pending-order:usr_ana', '"o"')
    localStorage.setItem('kurio:guest-id', 'gst_1')
    clearPrivateState(new QueryClient(), 'usr_bruno')
    expect(sessionStorage.getItem('kurio:checkout-draft:usr_ana')).toBeNull()
    expect(sessionStorage.getItem('kurio:checkout-attempt:usr_ana')).toBeNull()
    expect(localStorage.getItem('kurio:pending-order:usr_ana')).toBeNull()
    expect(sessionStorage.getItem('kurio:checkout-draft:usr_bruno')).toBe('{}')
    expect(localStorage.getItem('kurio:guest-id')).toBe('gst_1')
  })
})
