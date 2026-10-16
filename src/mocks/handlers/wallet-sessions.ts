import { HttpResponse } from 'msw'
import { CreateWalletSessionBodySchema, type WalletSession } from '@/contracts'
import { getDb, mutate, nextId } from '../db/store'
import { apiError, json, route, unauthenticated } from '../route'
import { maybeScheduleCheckoutMutation } from './checkout-mutation'
import { parseBody } from './validate'

/** Desconecta todas as sessões de carteira do usuário (API de controle). */
export function disconnectAllWalletSessions(userId?: string): void {
  mutate((db) => {
    for (const s of db.walletSessions) if (!userId || s.userId === userId) s.connected = false
  })
}

export const walletSessionHandlers = [
  route('POST /wallet-sessions', async ({ request, userId }) => {
    if (!userId) return unauthenticated()
    const body = await parseBody(request, CreateWalletSessionBodySchema)
    if (!body.ok) return body.response
    const { walletId, customWallet, provider, network } = body.data
    let address: string
    if (customWallet) {
      address = customWallet.address
    } else {
      const wallet = (getDb().wallets[userId] ?? []).find((w) => w.id === walletId)
      if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada')
      address = wallet.address
    }
    const session: WalletSession = {
      id: nextId('wss'),
      walletId: walletId ?? null,
      provider,
      network,
      address,
      status: 'connected',
    }
    mutate((db) => {
      for (const s of db.walletSessions) if (s.userId === userId) s.connected = false
      db.walletSessions.push({ ...session, userId, connected: true })
    })
    maybeScheduleCheckoutMutation(userId)
    return json(session, 201)
  }),

  route('DELETE /wallet-sessions/:id', ({ userId, params }) => {
    if (!userId) return unauthenticated()
    const s = getDb().walletSessions.find((x) => x.id === params.id && x.userId === userId)
    if (!s) return apiError(404, 'NOT_FOUND', 'Sessão de carteira não encontrada')
    mutate(() => {
      s.connected = false
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
