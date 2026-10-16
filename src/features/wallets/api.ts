import { z } from 'zod'
import {
  WalletSchema,
  WalletSessionSchema,
  type CreateWalletSessionBody,
  type Wallet,
  type WalletSession,
} from '@/contracts'
import { request, send } from '@/shared/lib/http'

export function fetchWallets(signal?: AbortSignal): Promise<Wallet[]> {
  return request(z.array(WalletSchema), { url: '/wallets', signal })
}

export function createWalletSession(body: CreateWalletSessionBody): Promise<WalletSession> {
  return request(WalletSessionSchema, { method: 'POST', url: '/wallet-sessions', data: body })
}

export function deleteWalletSession(sessionId: string): Promise<void> {
  return send({ method: 'DELETE', url: `/wallet-sessions/${encodeURIComponent(sessionId)}` })
}
