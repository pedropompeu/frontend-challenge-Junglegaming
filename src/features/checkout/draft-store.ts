import { readJson, removeItem, writeJson } from '@/shared/lib/storage'
import { EMPTY_CHECKOUT_FORM, type CheckoutFormValues } from './schemas'

/**
 * Rascunho do formulário de checkout (sessionStorage, por usuário). Sobrevive a recarga e à
 * expiração da sessão do mesmo usuário; é apagado quando o pedido é confirmado.
 */
export type CheckoutDraft = Partial<CheckoutFormValues>

export const DRAFT_DEBOUNCE_MS = 300

const keyOf = (userId: string) => `kurio:checkout-draft:${userId}`
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; values: CheckoutDraft }>()

/** Mantém só campos conhecidos com o tipo esperado: rascunho velho ou adulterado não quebra o form. */
function sanitize(v: unknown): CheckoutDraft | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
  const raw = v as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, empty] of Object.entries(EMPTY_CHECKOUT_FORM)) {
    if (key in raw && typeof raw[key] === typeof empty) out[key] = raw[key]
  }
  return out as CheckoutDraft
}

const isObject = (v: unknown): v is object => typeof v === 'object' && v !== null

export function loadDraft(userId: string): CheckoutDraft | null {
  const raw = readJson('session', keyOf(userId), isObject)
  return raw ? sanitize(raw) : null
}

/** Salva com debounce: digitar não grava no storage a cada tecla. */
export function saveDraft(userId: string, values: CheckoutDraft): void {
  const current = pending.get(userId)
  if (current) clearTimeout(current.timer)
  const timer = setTimeout(() => {
    pending.delete(userId)
    writeJson('session', keyOf(userId), values)
  }, DRAFT_DEBOUNCE_MS)
  pending.set(userId, { timer, values })
}

export function saveDraftNow(userId: string, values: CheckoutDraft): void {
  cancel(userId)
  writeJson('session', keyOf(userId), values)
}

/** Grava já o que estiver esperando o debounce (ao sair da página). */
export function flushDraft(userId: string): void {
  const current = pending.get(userId)
  if (current) saveDraftNow(userId, current.values)
}

export function clearDraft(userId: string): void {
  cancel(userId)
  removeItem('session', keyOf(userId))
}

function cancel(userId: string) {
  const current = pending.get(userId)
  if (!current) return
  clearTimeout(current.timer)
  pending.delete(userId)
}
