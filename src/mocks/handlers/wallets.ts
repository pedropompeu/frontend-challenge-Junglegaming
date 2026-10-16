import { UpsertWalletBodySchema, WalletSlotSchema, type Wallet } from '@/contracts'
import { getDb, mutate } from '../db/store'
import { apiError, json, route, unauthenticated } from '../route'
import { parseBody } from './validate'

export const walletHandlers = [
  route('GET /wallets', ({ userId }) =>
    userId ? json(getDb().wallets[userId] ?? []) : unauthenticated(),
  ),

  route('PUT /wallets/:slot', async ({ request, userId, params }) => {
    if (!userId) return unauthenticated()
    const slot = WalletSlotSchema.safeParse(params.slot)
    if (!slot.success) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada')
    const body = await parseBody(request, UpsertWalletBodySchema)
    if (!body.ok) return body.response
    const wallet = mutate((db) => {
      const list = (db.wallets[userId] ??= [])
      const existing = list.find((w) => w.slot === slot.data)
      const next: Wallet = {
        id: existing?.id ?? `wal_${userId}_${slot.data}`,
        slot: slot.data,
        ...body.data,
      }
      if (existing) Object.assign(existing, next)
      else list.push(next)
      list.sort((a, b) => (a.slot === b.slot ? 0 : a.slot === 'primary' ? -1 : 1))
      return existing ?? next
    })
    return json(wallet)
  }),
]
