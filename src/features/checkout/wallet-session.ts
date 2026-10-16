import { useCallback, useEffect, useRef, useState } from 'react'
import type { CreateWalletSessionBody, WalletSession } from '@/contracts'
import { deleteWalletSession, createWalletSession } from '@/features/wallets/api'
import { isApiError } from '@/shared/lib/api-error'
import { onWalletProviderEvent } from '@/shared/lib/wallet-provider'

export type WalletSessionStatus = 'idle' | 'connecting' | 'connected' | 'rejected' | 'disconnected'

type State = {
  status: WalletSessionStatus
  session: WalletSession | null
  /** Para qual carteira/provedor/rede a sessão foi aberta. */
  target: string | null
  error: unknown
}

const IDLE: State = { status: 'idle', session: null, target: null, error: null }

export const targetOf = (body: CreateWalletSessionBody) =>
  JSON.stringify([body.walletId ?? null, body.customWallet ?? null, body.provider, body.network])

/**
 * Conexão simulada com a carteira. Fica só em memória: recarregar a página exige conectar
 * de novo, como numa carteira real. A desconexão chega pelo "provedor" (extensão) ou pela
 * recusa do servidor ao criar o pedido (`markDisconnected`).
 */
export function useWalletSession() {
  const [state, setState] = useState<State>(IDLE)
  const attempt = useRef(0)
  // Sessão aberta, para os handlers (desconectar) sem depender do render.
  const current = useRef<WalletSession | null>(null)

  const connect = useCallback(async (body: CreateWalletSessionBody) => {
    const id = ++attempt.current
    current.current = null
    setState({ status: 'connecting', session: null, target: targetOf(body), error: null })
    try {
      const session = await createWalletSession(body)
      if (id === attempt.current) {
        current.current = session
        setState({ status: 'connected', session, target: targetOf(body), error: null })
      }
    } catch (error) {
      if (id !== attempt.current) return
      const rejected = isApiError(error) && error.code === 'WALLET_REJECTED'
      setState({ status: rejected ? 'rejected' : 'idle', session: null, target: null, error })
    }
  }, [])

  const disconnect = useCallback(() => {
    attempt.current++
    const session = current.current
    current.current = null
    setState(IDLE)
    // Melhor esforço: o servidor também derruba a sessão ao abrir outra.
    if (session) void deleteWalletSession(session.id).catch(() => undefined)
  }, [])

  const markDisconnected = useCallback(() => {
    attempt.current++
    current.current = null
    setState((s) =>
      s.session || s.status === 'connecting'
        ? { status: 'disconnected', session: null, target: null, error: null }
        : s,
    )
  }, [])

  useEffect(
    () =>
      onWalletProviderEvent((event) => {
        if (event.type === 'disconnect') markDisconnected()
      }),
    [markDisconnected],
  )

  return { ...state, connect, disconnect, markDisconnected }
}
