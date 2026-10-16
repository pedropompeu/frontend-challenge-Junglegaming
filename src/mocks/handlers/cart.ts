import {
  AddCartItemBodySchema,
  UpdateCartItemBodySchema,
  type Cart,
  type CartItem,
  type CartOwner,
  type Edition,
  type Nft,
} from '@/contracts'
import type { CartRecord, MockDbState } from '../db/schema'
import { getDb, mutate, nextId, now } from '../db/store'
import { apiError, json, route, unauthenticated, type RouteContext } from '../route'
import { parseBody } from './validate'

export function ownerOf(ctx: Pick<RouteContext, 'userId' | 'guestId'>): CartOwner | null {
  if (ctx.userId) return { type: 'user', id: ctx.userId }
  if (ctx.guestId) return { type: 'guest', id: ctx.guestId }
  return null
}

export const ownerKey = (o: CartOwner) => `${o.type}:${o.id}`

export function findEdition(db: MockDbState, nftId: string, editionId: string): { nft: Nft; edition: Edition } | null {
  const nft = db.nfts.find((n) => n.id === nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

function ensureCart(owner: CartOwner): CartRecord {
  const key = ownerKey(owner)
  const existing = getDb().carts[key]
  if (existing) return existing
  return mutate((db) => {
    const cart: CartRecord = { id: nextId('cart'), owner, items: [], version: 0, updatedAt: now().toISOString() }
    db.carts[key] = cart
    return cart
  })
}

/** Expande o carrinho com os dados atuais de cada NFT (itens de NFTs removidos somem). */
export function expandCart(cart: CartRecord): Cart {
  const db = getDb()
  const items: CartItem[] = []
  for (const item of cart.items) {
    const found = findEdition(db, item.nftId, item.editionId)
    if (!found) continue
    items.push({
      id: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      editionKind: found.edition.kind,
      name: found.nft.name,
      image: found.nft.images[0]!,
      network: found.nft.network,
      unitPrice: found.edition.price,
      available: found.edition.available,
      quantity: item.quantity,
      nftVersion: found.nft.version,
    })
  }
  return { id: cart.id, owner: cart.owner, items, version: cart.version, updatedAt: cart.updatedAt }
}

function touch(cart: CartRecord): void {
  cart.version += 1
  cart.updatedAt = now().toISOString()
}

export function availabilityConflict(edition: Edition, nftId: string): Response {
  return apiError(409, 'AVAILABILITY_CONFLICT', 'Quantidade indisponível para esta edição', {
    details: { nftId, editionId: edition.id, available: edition.available },
  })
}

const notFound = (what: string) => apiError(404, 'NOT_FOUND', `${what} não encontrado`)

export const cartHandlers = [
  route('GET /cart', (ctx) => {
    const owner = ownerOf(ctx)
    return owner ? json(expandCart(ensureCart(owner))) : unauthenticated()
  }),

  route('POST /cart/items', async (ctx) => {
    const owner = ownerOf(ctx)
    if (!owner) return unauthenticated()
    const body = await parseBody(ctx.request, AddCartItemBodySchema)
    if (!body.ok) return body.response
    const { nftId, editionId, quantity } = body.data
    const found = findEdition(getDb(), nftId, editionId)
    if (!found) return notFound(getDb().nfts.some((n) => n.id === nftId) ? 'Edição' : 'NFT')
    const cart = ensureCart(owner)
    const existing = cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)
    if ((existing?.quantity ?? 0) + quantity > found.edition.available) {
      return availabilityConflict(found.edition, nftId)
    }
    mutate(() => {
      if (existing) existing.quantity += quantity
      else cart.items.push({ id: nextId('ci'), nftId, editionId, quantity })
      touch(cart)
    })
    return json(expandCart(cart))
  }),

  route('PATCH /cart/items/:itemId', async (ctx) => {
    const owner = ownerOf(ctx)
    if (!owner) return unauthenticated()
    const body = await parseBody(ctx.request, UpdateCartItemBodySchema)
    if (!body.ok) return body.response
    const cart = ensureCart(owner)
    const item = cart.items.find((i) => i.id === ctx.params.itemId)
    if (!item) return notFound('Item')
    const found = findEdition(getDb(), item.nftId, item.editionId)
    if (!found) return notFound('Edição')
    if (body.data.quantity > found.edition.available) return availabilityConflict(found.edition, item.nftId)
    mutate(() => {
      item.quantity = body.data.quantity
      touch(cart)
    })
    return json(expandCart(cart))
  }),

  route('DELETE /cart/items/:itemId', (ctx) => {
    const owner = ownerOf(ctx)
    if (!owner) return unauthenticated()
    const cart = ensureCart(owner)
    if (!cart.items.some((i) => i.id === ctx.params.itemId)) return notFound('Item')
    mutate(() => {
      cart.items = cart.items.filter((i) => i.id !== ctx.params.itemId)
      touch(cart)
    })
    return json(expandCart(cart))
  }),

  route('POST /cart/merge', ({ userId, guestId }) => {
    if (!userId) return unauthenticated()
    const cart = ensureCart({ type: 'user', id: userId })
    const guestKey = guestId ? `guest:${guestId}` : null
    const guest = guestKey ? getDb().carts[guestKey] : undefined
    if (!guest || guest.items.length === 0) {
      if (guestKey) mutate((db) => void delete db.carts[guestKey])
      return json(expandCart(cart))
    }
    mutate((db) => {
      for (const g of guest.items) {
        const found = findEdition(db, g.nftId, g.editionId)
        if (!found || found.edition.available === 0) continue
        const mine = cart.items.find((i) => i.nftId === g.nftId && i.editionId === g.editionId)
        if (mine) mine.quantity = Math.min(mine.quantity + g.quantity, found.edition.available)
        else
          cart.items.push({
            id: nextId('ci'),
            nftId: g.nftId,
            editionId: g.editionId,
            quantity: Math.min(g.quantity, found.edition.available),
          })
      }
      touch(cart)
      delete db.carts[guestKey!]
    })
    return json(expandCart(cart))
  }),
]
