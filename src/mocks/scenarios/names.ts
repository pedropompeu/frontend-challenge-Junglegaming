export const SCENARIO_NAMES = [
  'default',
  'empty-catalog',
  'slow',
  'jitter',
  'offline',
  'server-errors',
  'session-expired',
  'signup-conflict',
  'coupon-invalid',
  'coupon-expired',
  'price-change-checkout',
  'sold-out-checkout',
  'order-timeout',
  'wallet-rejected',
  'payment-confirmed',
  'payment-declined',
] as const

export type ScenarioName = (typeof SCENARIO_NAMES)[number]

export function isScenarioName(v: unknown): v is ScenarioName {
  return typeof v === 'string' && (SCENARIO_NAMES as readonly string[]).includes(v)
}
