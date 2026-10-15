import type { CouponRecord } from '../db/schema'

export const COUPONS: CouponRecord[] = [
  { code: 'KURIO10', percentOff: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'LAUNCH20', percentOff: 20, expiresAt: '2026-09-01T00:00:00.000Z' },
]

export const NETWORK_FEES = { ethereum: '0.012', polygon: '0.002', solana: '0.001' } as const
