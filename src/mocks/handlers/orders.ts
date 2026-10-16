import { CreateOrderBodySchema, type Quote } from '@/contracts'
import { sha256 } from '../db/crypto'
import { adjustStock } from '../db/nfts'
import type { OrderRecord } from '../db/schema'
import { getDb, mutate, nextId, now } from '../db/store'
import { apiError, json, route, unauthenticated } from '../route'
import { scheduleSettlement, toOrder } from '../socket/settlement'
import { availabilityConflict } from './cart'
import { createQuote } from './quotes'
import { parseBody } from './validate'

const notFound = () => apiError(404, 'NOT_FOUND', 'Pedido não encontrado')

/** A cotação ainda vale? Compara preço, estoque, cupom e taxa com o estado atual. */
function revalidate(quote: Quote, key: string): Response | null {
  const db = getDb()
  for (const line of quote.lines) {
    const edition = db.nfts
      .find((n) => n.id === line.nftId)
      ?.editions.find((e) => e.id === line.editionId)
    if (!edition) return apiError(404, 'NOT_FOUND', 'Um item da cotação não existe mais')
    if (line.quantity > edition.available) return availabilityConflict(edition, line.nftId)
  }
  const expired = Date.parse(quote.expiresAt) <= now().getTime()
  const priceChanged = quote.lines.some((line) => {
    const edition = db.nfts
      .find((n) => n.id === line.nftId)!
      .editions.find((e) => e.id === line.editionId)!
    return edition.price !== line.unitPrice
  })
  const coupon = quote.coupon ? db.coupons.find((c) => c.code === quote.coupon!.code) : null
  const couponChanged =
    quote.coupon !== null &&
    (!coupon ||
      coupon.percentOff !== quote.coupon.percentOff ||
      Date.parse(coupon.expiresAt) <= now().getTime())
  if (!expired && !priceChanged && !couponChanged) return null

  const fresh = createQuote(key, quote.network, couponChanged ? undefined : quote.coupon?.code)
  if (!fresh.ok) return fresh.response
  return apiError(409, 'QUOTE_STALE', 'Os valores mudaram desde a cotação. Revise o pedido.', {
    details: { quote: fresh.value },
  })
}

export const orderHandlers = [
  route('POST /orders', async ({ request, userId }) => {
    if (!userId) return unauthenticated()
    const idemKey = request.headers.get('Idempotency-Key')?.trim()
    if (!idemKey) return apiError(422, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório')
    const body = await parseBody(request, CreateOrderBodySchema)
    if (!body.ok) return body.response

    const { quoteId, walletSessionId, buyer } = body.data
    const payloadHash = await sha256(JSON.stringify({ quoteId, walletSessionId, buyer }))
    const scopedKey = `${userId}:${idemKey}`
    const db = getDb()
    const previous = db.idempotency[scopedKey]
    if (previous) {
      if (previous.payloadHash !== payloadHash) {
        return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave já foi usada com outro pedido')
      }
      const existing = db.orders.find((o) => o.id === previous.orderId)
      if (existing) return json(toOrder(existing), 200)
    }

    const key = `user:${userId}`
    const quote = db.quotes.find((q) => q.id === quoteId && q.ownerKey === key)
    if (!quote) return apiError(404, 'NOT_FOUND', 'Cotação não encontrada. Atualize o checkout.')

    const session = db.walletSessions.find((s) => s.id === walletSessionId && s.userId === userId)
    if (!session || !session.connected) {
      return apiError(
        409,
        'WALLET_REJECTED',
        'Carteira desconectada. Conecte novamente para continuar.',
      )
    }

    const invalid = revalidate(quote, key)
    if (invalid) return invalid

    const wallet = (db.wallets[userId] ?? []).find((w) => w.id === session.walletId)
    const order: OrderRecord = {
      id: nextId('ord'),
      userId,
      status: 'pending',
      quoteId: quote.id,
      lines: structuredClone(quote.lines),
      subtotal: quote.subtotal,
      discount: quote.discount,
      coupon: quote.coupon,
      networkFee: quote.networkFee,
      total: quote.total,
      network: quote.network,
      wallet: {
        label: wallet?.nickname ?? 'Carteira',
        address: session.address,
        provider: session.provider,
      },
      buyer,
      txHash: null,
      explorerUrl: null,
      declineReason: null,
      createdAt: now().toISOString(),
      settledAt: null,
      version: 1,
      idempotencyKey: idemKey,
      settleAt: null,
      scheduledStatus: null,
    }
    mutate((d) => {
      d.orders.push(order)
      d.idempotency[scopedKey] = { payloadHash, orderId: order.id }
    })
    adjustStock(
      order.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, delta: -l.quantity })),
    )
    scheduleSettlement(order)
    return json(toOrder(order), 202)
  }),

  route('GET /orders/by-tx/:hash', ({ userId, params }) => {
    if (!userId) return unauthenticated()
    const order = getDb().orders.find((o) => o.txHash === params.hash && o.userId === userId)
    return order ? json(toOrder(order)) : notFound()
  }),

  route('GET /orders/:id', ({ userId, params }) => {
    if (!userId) return unauthenticated()
    const order = getDb().orders.find((o) => o.id === params.id && o.userId === userId)
    return order ? json(toOrder(order)) : notFound()
  }),
]
