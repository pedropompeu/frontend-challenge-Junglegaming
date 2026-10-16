import { describe, expect, it } from 'vitest'
import type { Order } from '@/contracts'
import { formatOrderDate, shortHash } from '@/features/orders/format'
import { ORDER_REFETCH_MS, orderRefetchInterval } from '@/features/orders/queries'

describe('orderRefetchInterval', () => {
  it('polls only while the order is pending (safety net for a lost event)', () => {
    expect(ORDER_REFETCH_MS).toBe(15_000)
    expect(orderRefetchInterval(undefined)).toBe(false)
    expect(orderRefetchInterval({ status: 'pending' } as Order)).toBe(ORDER_REFETCH_MS)
    expect(orderRefetchInterval({ status: 'confirmed' } as Order)).toBe(false)
    expect(orderRefetchInterval({ status: 'declined' } as Order)).toBe(false)
  })
})

describe('receipt formatting', () => {
  it('shortens the transaction hash like the receipt frame', () => {
    expect(shortHash(`0xa91f${'0'.repeat(56)}e82c`)).toBe('0xA91F…E82C')
    expect(shortHash('0xabc')).toBe('0xABC')
  })

  it('formats the date as "29 Jul, 2026" with Portuguese months', () => {
    expect(formatOrderDate('2026-07-29T12:00:00.000Z')).toBe('29 Jul, 2026')
    expect(formatOrderDate('2026-02-03T12:00:00.000Z')).toBe('03 Fev, 2026')
    expect(formatOrderDate('2026-12-24T12:00:00.000Z')).toBe('24 Dez, 2026')
  })
})
