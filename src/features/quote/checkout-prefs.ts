import { useCallback, useSyncExternalStore } from 'react'
import { NetworkSchema, type Network } from '@/contracts'
import { readJson, removeItem, writeJson } from '@/shared/lib/storage'

export type CheckoutPrefs = { couponCode: string | null; network: Network }

const DEFAULT_PREFS: CheckoutPrefs = { couponCode: null, network: 'ethereum' }
const keyOf = (ownerKey: string) => `kurio:checkout:${ownerKey}`
const listeners = new Set<() => void>()
// Snapshot estável por dono: `useSyncExternalStore` exige a mesma referência sem mudança.
const cache = new Map<string, CheckoutPrefs>()

function isPrefs(v: unknown): v is CheckoutPrefs {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    (p.couponCode === null || typeof p.couponCode === 'string') &&
    NetworkSchema.safeParse(p.network).success
  )
}

/** Cupom e rede escolhidos no carrinho/checkout (localStorage por dono do carrinho). */
export function getCheckoutPrefs(ownerKey: string): CheckoutPrefs {
  const cached = cache.get(ownerKey)
  if (cached) return cached
  const prefs = readJson('local', keyOf(ownerKey), isPrefs) ?? DEFAULT_PREFS
  cache.set(ownerKey, prefs)
  return prefs
}

export function setCheckoutPrefs(ownerKey: string, patch: Partial<CheckoutPrefs>): void {
  const next = { ...getCheckoutPrefs(ownerKey), ...patch }
  cache.set(ownerKey, next)
  writeJson('local', keyOf(ownerKey), next)
  for (const listener of listeners) listener()
}

/**
 * No login, o cupom aplicado como visitante passa ao usuário, junto com o carrinho mesclado.
 * Ele vale sobre um cupom antigo do usuário: é o que estava na tela antes de entrar.
 * A rede continua a do usuário (o visitante não chega ao checkout para escolher uma).
 */
export function moveGuestCoupon(guestKey: string, userKey: string): void {
  const guest = readJson('local', keyOf(guestKey), isPrefs)
  cache.delete(guestKey)
  removeItem('local', keyOf(guestKey))
  if (guest?.couponCode) setCheckoutPrefs(userKey, { couponCode: guest.couponCode })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCheckoutPrefs(ownerKey: string): CheckoutPrefs {
  const snapshot = useCallback(() => getCheckoutPrefs(ownerKey), [ownerKey])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
