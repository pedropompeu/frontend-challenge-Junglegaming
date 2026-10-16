import { QuoteRequestSchema, type Coupon, type Quote, type QuoteLine } from '@/contracts'
import { add, cmp, mul, pct, sub } from '@/shared/lib/money'
import { NETWORK_FEES } from '../fixtures/coupons'
import type { QuoteRecord } from '../db/schema'
import { getDb, mutate, nextId, now } from '../db/store'
import { apiError, json, route, unauthenticated } from '../route'
import { availabilityConflict, findEdition, ownerKey, ownerOf } from './cart'
import { parseBody } from './validate'

export const QUOTE_TTL_MS = 5 * 60_000
const MAX_QUOTES_PER_OWNER = 20

type CouponResult = { ok: true; coupon: Coupon | null } | { ok: false; response: Response }

export function resolveCoupon(code: string | undefined): CouponResult {
  if (!code) return { ok: true, coupon: null }
  const rec = getDb().coupons.find((c) => c.code === code.trim().toUpperCase())
  if (!rec) {
    return {
      ok: false,
      response: apiError(422, 'COUPON_INVALID', 'Cupom inválido', { fieldErrors: { couponCode: 'Cupom inválido' } }),
    }
  }
  if (Date.parse(rec.expiresAt) <= now().getTime()) {
    return {
      ok: false,
      response: apiError(422, 'COUPON_EXPIRED', 'Este cupom expirou', { fieldErrors: { couponCode: 'Este cupom expirou' } }),
    }
  }
  return { ok: true, coupon: { code: rec.code, percentOff: rec.percentOff } }
}

export const quoteHandlers = [
  route('POST /quotes', async (ctx) => {
    const owner = ownerOf(ctx)
    if (!owner) return unauthenticated()
    const body = await parseBody(ctx.request, QuoteRequestSchema)
    if (!body.ok) return body.response
    const db = getDb()
    const key = ownerKey(owner)
    const cart = db.carts[key]
    if (!cart || cart.items.length === 0) {
      return apiError(422, 'VALIDATION_ERROR', 'O carrinho está vazio')
    }

    const lines: QuoteLine[] = []
    for (const item of cart.items) {
      const found = findEdition(db, item.nftId, item.editionId)
      if (!found) return apiError(404, 'NOT_FOUND', 'Um item do carrinho não existe mais')
      if (item.quantity > found.edition.available) return availabilityConflict(found.edition, item.nftId)
      lines.push({
        cartItemId: item.id,
        nftId: item.nftId,
        editionId: item.editionId,
        name: found.nft.name,
        editionKind: found.edition.kind,
        quantity: item.quantity,
        unitPrice: found.edition.price,
        lineTotal: mul(found.edition.price, item.quantity),
      })
    }

    const coupon = resolveCoupon(body.data.couponCode)
    if (!coupon.ok) return coupon.response

    const subtotal = add(...lines.map((l) => l.lineTotal))
    const discount = coupon.coupon ? pct(subtotal, coupon.coupon.percentOff) : '0'
    const networkFee = NETWORK_FEES[body.data.network]
    const net = sub(subtotal, discount)
    const total = add(cmp(net, '0') < 0 ? '0' : net, networkFee)
    const createdAt = now()
    const quote: Quote = {
      id: nextId('qt'),
      cartVersion: cart.version,
      network: body.data.network,
      lines,
      subtotal,
      discount,
      coupon: coupon.coupon,
      networkFee,
      total,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + QUOTE_TTL_MS).toISOString(),
    }
    mutate((d) => {
      d.quotes.push({ ...quote, ownerKey: key } satisfies QuoteRecord)
      const mine = d.quotes.filter((q) => q.ownerKey === key)
      if (mine.length > MAX_QUOTES_PER_OWNER) {
        const drop = new Set(mine.slice(0, mine.length - MAX_QUOTES_PER_OWNER).map((q) => q.id))
        d.quotes = d.quotes.filter((q) => !drop.has(q.id))
      }
    })
    return json(quote, 201)
  }),
]
