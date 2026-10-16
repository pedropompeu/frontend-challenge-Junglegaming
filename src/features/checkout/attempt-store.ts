import { CreateOrderBodySchema, QuoteSchema, type CreateOrderBody, type Quote } from '@/contracts'
import { readJson, removeItem, writeJson } from '@/shared/lib/storage'

/**
 * Tentativa de compra: a chave de idempotência, o payload que ela protege (o corpo e a
 * cotação mostrada na revisão) e, depois que o servidor respondeu, o pedido que ela criou.
 */
export type CheckoutAttempt = {
  idempotencyKey: string
  quoteId: string
  payloadHash: string
  body?: CreateOrderBody
  quote?: Quote
  orderId?: string
}

/** Envio sem resposta: o que basta para reenviar o MESMO corpo com a MESMA chave. */
export type ResumableAttempt = { idempotencyKey: string; body: CreateOrderBody; quote: Quote }

const keyOf = (userId: string) => `kurio:checkout-attempt:${userId}`

function isAttempt(v: unknown): v is CheckoutAttempt {
  if (typeof v !== 'object' || v === null) return false
  const a = v as Record<string, unknown>
  return (
    typeof a.idempotencyKey === 'string' &&
    typeof a.quoteId === 'string' &&
    typeof a.payloadHash === 'string' &&
    (a.orderId === undefined || typeof a.orderId === 'string')
  )
}

/** JSON com chaves ordenadas (e sem `undefined`): o mesmo payload dá o mesmo texto. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (typeof v === 'object' && v !== null) {
    const entries = Object.entries(v)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${canonical(x)}`).join(',')}}`
  }
  return JSON.stringify(v) ?? 'null'
}

/**
 * Hash síncrono (cyrb53, 53 bits) do payload canônico. Só compara tentativas locais: quem
 * garante a idempotência é o servidor, que recalcula o próprio hash do corpo.
 */
export function hashPayload(payload: CreateOrderBody): string {
  const text = canonical(payload)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)
}

/**
 * Tentativa do envio, persistida ANTES do POST (sessionStorage, por usuário) com a chave, o
 * corpo e a cotação: repetir o envio — duplo clique, timeout, recarga, volta ao checkout —
 * reaproveita a chave enquanto cotação e payload forem os mesmos; qualquer mudança neles é
 * uma compra nova, com chave nova.
 */
export function getOrCreateAttempt(
  userId: string,
  quoteId: string,
  payload: CreateOrderBody,
  quote?: Quote,
): CheckoutAttempt {
  const payloadHash = hashPayload(payload)
  const current = peekAttempt(userId)
  if (current && current.quoteId === quoteId && current.payloadHash === payloadHash) return current
  const attempt: CheckoutAttempt = {
    idempotencyKey: crypto.randomUUID(),
    quoteId,
    payloadHash,
    body: payload,
    quote,
  }
  writeJson('session', keyOf(userId), attempt)
  return attempt
}

/**
 * Envio que ficou sem resposta (recarga, saída do checkout, timeout): devolve chave, corpo e
 * cotação para reenviar. Tentativa já respondida, ou sem corpo salvo, não se retoma.
 */
export function resumableAttempt(userId: string): ResumableAttempt | null {
  const current = peekAttempt(userId)
  if (!current || current.orderId) return null
  const body = CreateOrderBodySchema.safeParse(current.body)
  const quote = QuoteSchema.safeParse(current.quote)
  if (!body.success || !quote.success) return null
  return { idempotencyKey: current.idempotencyKey, body: body.data, quote: quote.data }
}

/**
 * Registra o pedido que a chave criou. Só uma tentativa com resposta pode ser encerrada pela
 * liquidação: sem resposta (timeout), o retry precisa da mesma chave para reencontrar o pedido.
 */
export function bindAttempt(userId: string, orderId: string): void {
  const current = peekAttempt(userId)
  if (current) writeJson('session', keyOf(userId), { ...current, orderId })
}

export function peekAttempt(userId: string): CheckoutAttempt | null {
  return readJson('session', keyOf(userId), isAttempt)
}

export function clearAttempt(userId: string): void {
  removeItem('session', keyOf(userId))
}
