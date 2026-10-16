import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { LoginBody, RegisterBody, Session } from '@/contracts'
import { moveGuestCoupon } from '@/features/quote/checkout-prefs'
import { announce } from '@/shared/lib/announce'
import { isApiError } from '@/shared/lib/api-error'
import { getGuestId, rotateGuestId } from '@/shared/lib/guest'
import { ownerKeyOf, qk } from '@/shared/lib/query-keys'
import {
  clearStoredSession,
  getSessionSnapshot,
  emitSessionExpired,
  getStoredSession,
  onSessionExpired,
  setStoredSession,
  subscribeSession,
} from '@/shared/lib/session-store'
import * as api from './api'
import { clearPrivateState } from './private-state'
import { sessionQuery } from './queries'
import { SessionContext, type SessionStatus, type SessionValue } from './use-session'

export const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Entre novamente para continuar'
const AUTH_PATHS = ['/entrar', '/cadastro']

/**
 * Fonte única da sessão no cliente. O token salvo é a verdade síncrona (guards, header HTTP);
 * `GET /session` confirma o usuário no boot. Fica dentro do router para poder redirecionar.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const stored = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => null)
  const [guestId, setGuestId] = useState(getGuestId)
  const loggingOut = useRef(false)

  const info = useQuery({ ...sessionQuery(), enabled: stored !== null })
  const user = stored && info.data?.user.id === stored.userId ? info.data.user : null
  const rejected = isApiError(info.error) && info.error.status === 401
  const status: SessionStatus =
    !stored || rejected ? 'anonymous' : user ? 'authenticated' : 'loading'

  useEffect(
    () =>
      onSessionExpired(() => {
        if (loggingOut.current || !getStoredSession()) return
        clearStoredSession()
        queryClient.removeQueries({ queryKey: qk.session() })
        // Preserva os rascunhos do usuário: ele volta ao mesmo fluxo depois de entrar.
        queryClient.removeQueries({ queryKey: ['private'] })
        // Com token vencido até as rotas públicas respondem 401; refaz o que falhou.
        void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'private' })
        toast.error(SESSION_EXPIRED_MESSAGE, { id: 'session-expired' })
        announce(SESSION_EXPIRED_MESSAGE, 'assertive')
        // `latestLocation` é o destino de uma navegação em curso (ex.: guard de rota privada).
        const location = router.latestLocation
        if (AUTH_PATHS.includes(location.pathname)) return
        void router.navigate({
          to: '/entrar',
          search: { redirect: location.href, motivo: 'expirada' },
        })
      }),
    [queryClient, router],
  )

  // Se o 401 do boot chegou antes de o ouvinte acima existir, a sessão ainda está salva.
  useEffect(() => {
    if (rejected && getStoredSession()) emitSessionExpired()
  }, [rejected])

  const value = useMemo<SessionValue>(() => {
    async function completeAuth(session: Session) {
      const previousUserId = getStoredSession()?.userId ?? null
      setStoredSession({
        token: session.token,
        userId: session.user.id,
        expiresAt: session.expiresAt,
      })
      if (previousUserId !== session.user.id) clearPrivateState(queryClient, session.user.id)
      try {
        await api.mergeGuestCart()
      } catch {
        // O carrinho de visitante não é crítico para entrar.
      }
      const guest = getGuestId()
      moveGuestCoupon(ownerKeyOf(null, guest), ownerKeyOf(session.user.id, guest))
      setGuestId(rotateGuestId())
      queryClient.setQueryData(qk.session(), {
        user: session.user,
        expiresAt: session.expiresAt,
      })
      queryClient.removeQueries({ queryKey: ['private'] })
    }

    return {
      status,
      user,
      ownerKey: ownerKeyOf(stored?.userId ?? null, guestId),
      async login(body: LoginBody) {
        await completeAuth(await api.login(body))
      },
      async register(body: RegisterBody) {
        await completeAuth(await api.register(body))
      },
      async logout() {
        loggingOut.current = true
        try {
          await api.logout()
        } catch {
          // Sessão já inválida no servidor: basta limpar a local.
        } finally {
          loggingOut.current = false
        }
        clearStoredSession()
        queryClient.removeQueries({ queryKey: qk.session() })
        clearPrivateState(queryClient, null)
      },
    }
  }, [status, user, stored, guestId, queryClient])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
