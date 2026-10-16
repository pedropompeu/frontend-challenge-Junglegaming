import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Socket } from 'socket.io-client'
import { RealtimeEventSchema } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { clearCartLineNotices, markCartLineNotice } from '@/features/cart/line-notices'
import { announce } from '@/shared/lib/announce'
import { qk } from '@/shared/lib/query-keys'
import { createEventGate } from '@/shared/lib/realtime-gate'
import { getSessionSnapshot, subscribeSession } from '@/shared/lib/session-store'
import { createSocket } from '@/shared/lib/socket'
import { applyNftUpdate, describeCartLineChange } from './apply-nft-update'
import { applyOrderUpdate } from './apply-order-update'
import { RealtimeStatusContext, type RealtimeStatus } from './use-realtime-status'

/**
 * Um socket por sessão: o token vai no handshake, então trocar de usuário (ou sair)
 * fecha o socket antigo e abre outro. Eventos passam pelo schema e pelo gate
 * (duplicado/versão antiga) antes de tocar no cache; a REST continua sendo a verdade,
 * e toda reconexão refaz as queries que podem ter perdido eventos.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { ownerKey } = useSession()
  const token =
    useSyncExternalStore(subscribeSession, getSessionSnapshot, () => null)?.token ?? null
  // Status do socket de cada token: ao trocar de sessão, volta a "conectando" sem esperar evento.
  const [current, setCurrent] = useState<{ token: string | null; status: RealtimeStatus }>({
    token,
    status: 'connecting',
  })
  const status = current.token === token ? current.status : 'connecting'
  const owner = useRef(ownerOf(ownerKey))

  useEffect(() => {
    owner.current = ownerOf(ownerKey)
    clearCartLineNotices()
  }, [ownerKey])

  useEffect(() => {
    const gate = createEventGate()
    let opened: Socket | null = null
    let disposed = false
    let everConnected = false
    const setStatus = (next: RealtimeStatus) => setCurrent({ token, status: next })

    function reconcile() {
      const { ownerKey: key, userId } = owner.current
      void queryClient.invalidateQueries({ queryKey: qk.nfts.all })
      // Carrinho e cotações do dono atual.
      void queryClient.invalidateQueries({ queryKey: ['private', key] })
      if (userId) void queryClient.invalidateQueries({ queryKey: ['private', userId, 'order'] })
    }

    function listen(socket: Socket) {
      socket.on('connect', () => {
        if (everConnected) reconcile()
        everConnected = true
        setStatus('connected')
      })
      socket.on('disconnect', () => setStatus(socket.active ? 'reconnecting' : 'offline'))
      socket.on('connect_error', () => setStatus(everConnected ? 'reconnecting' : 'offline'))

      socket.on('nft.updated', (raw: unknown) => {
        const parsed = RealtimeEventSchema.safeParse(raw)
        if (!parsed.success || parsed.data.type !== 'nft.updated') return
        if (!gate.accept(parsed.data)) return
        const { changedCartLines } = applyNftUpdate(queryClient, parsed.data, {
          ownerKey: owner.current.ownerKey,
        })
        if (changedCartLines.length === 0) return
        const messages = changedCartLines.map((change) => {
          const message = describeCartLineChange(change)
          markCartLineNotice(change.cartItemId, change.kind)
          const show = change.kind === 'price' ? toast.info : toast.warning
          show(message, { id: `cart-line:${change.cartItemId}:${change.kind}` })
          return message
        })
        // Uma região viva só lê o último texto: junta tudo num anúncio.
        announce(messages.join('. '))
      })

      socket.on('order.updated', (raw: unknown) => {
        const parsed = RealtimeEventSchema.safeParse(raw)
        if (!parsed.success || parsed.data.type !== 'order.updated') return
        const { userId } = owner.current
        if (!userId || !gate.accept(parsed.data)) return
        applyOrderUpdate(queryClient, parsed.data, { userId })
      })
    }

    void createSocket(token)
      .then((created) => {
        // A sessão mudou enquanto o cliente carregava: este socket já nasceu velho.
        if (disposed) {
          created.disconnect()
          return
        }
        opened = created
        listen(created)
      })
      .catch(() => {
        // Chunk do cliente indisponível (ex.: sem rede): segue sem tempo real; a REST é a verdade.
        if (!disposed) setStatus('offline')
      })

    return () => {
      disposed = true
      opened?.off()
      opened?.disconnect()
      gate.reset()
    }
  }, [token, queryClient])

  return <RealtimeStatusContext.Provider value={status}>{children}</RealtimeStatusContext.Provider>
}

function ownerOf(ownerKey: string) {
  const userId = ownerKey.startsWith('user:') ? ownerKey.slice('user:'.length) : null
  return { ownerKey, userId }
}
