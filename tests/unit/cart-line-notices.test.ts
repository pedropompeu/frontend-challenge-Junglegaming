import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearCartLineNotice,
  clearCartLineNotices,
  getCartLineNotices,
  markCartLineNotice,
  subscribeCartLineNotices,
} from '@/features/cart/line-notices'

afterEach(() => clearCartLineNotices())

describe('cart line notices', () => {
  it('keeps one notice per kind until the line is touched', () => {
    markCartLineNotice('ci_1', 'price')
    markCartLineNotice('ci_1', 'price')
    markCartLineNotice('ci_1', 'availability')
    markCartLineNotice('ci_2', 'price')
    expect(getCartLineNotices('ci_1')).toEqual(['price', 'availability'])

    clearCartLineNotice('ci_1')
    expect(getCartLineNotices('ci_1')).toEqual([])
    expect(getCartLineNotices('ci_2')).toEqual(['price'])
  })

  it('returns a stable snapshot and notifies only on change', () => {
    const listener = vi.fn()
    const off = subscribeCartLineNotices(listener)
    expect(getCartLineNotices('ci_1')).toBe(getCartLineNotices('ci_1'))
    markCartLineNotice('ci_1', 'price')
    const snapshot = getCartLineNotices('ci_1')
    markCartLineNotice('ci_1', 'price')
    expect(getCartLineNotices('ci_1')).toBe(snapshot)
    clearCartLineNotice('ci_9')
    expect(listener).toHaveBeenCalledTimes(1)
    clearCartLineNotices()
    expect(listener).toHaveBeenCalledTimes(2)
    off()
  })
})
