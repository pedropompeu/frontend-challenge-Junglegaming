import { createContext, useContext } from 'react'
import type { LoginBody, RegisterBody, User } from '@/contracts'
import type { OwnerKey } from '@/shared/lib/query-keys'

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

export type SessionValue = {
  status: SessionStatus
  user: User | null
  /** Dono do carrinho: `user:<id>` logado, `guest:<guestId>` visitante. */
  ownerKey: OwnerKey
  login(body: LoginBody): Promise<void>
  register(body: RegisterBody): Promise<void>
  logout(): Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession precisa estar dentro de <SessionProvider>')
  return value
}
