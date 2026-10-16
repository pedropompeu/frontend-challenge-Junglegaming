import { createContext, useContext } from 'react'

/**
 * `connecting`: primeira conexão em curso; `connected`: recebendo eventos;
 * `reconnecting`: caiu depois de conectar e está tentando de novo;
 * `offline`: nunca conseguiu conectar (segue tentando em segundo plano).
 */
export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'

export const RealtimeStatusContext = createContext<RealtimeStatus>('connecting')

export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeStatusContext)
}
