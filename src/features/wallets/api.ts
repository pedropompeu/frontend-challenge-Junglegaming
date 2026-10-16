import { z } from 'zod'
import {
  WalletSchema,
  WalletSessionSchema,
  type CreateWalletSessionBody,
  type UpsertWalletBody,
  type Wallet,
  type WalletSession,
  type WalletSlot,
} from '@/contracts'
import { request, send } from '@/shared/lib/http'

export function fetchWallets(signal?: AbortSignal): Promise<Wallet[]> {
  return request(z.array(WalletSchema), { url: '/wallets', signal })
}

/** Cria ou substitui a carteira do slot (`primary` ou `secondary`). */
export function saveWallet(slot: WalletSlot, body: UpsertWalletBody): Promise<Wallet> {
  return request(WalletSchema, { method: 'PUT', url: `/wallets/${slot}`, data: body })
}

export function createWalletSession(body: CreateWalletSessionBody): Promise<WalletSession> {
  return request(WalletSessionSchema, { method: 'POST', url: '/wallet-sessions', data: body })
}

export function deleteWalletSession(sessionId: string): Promise<void> {
  return send({ method: 'DELETE', url: `/wallet-sessions/${encodeURIComponent(sessionId)}` })
}
