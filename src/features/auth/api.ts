import {
  SessionInfoSchema,
  SessionSchema,
  type LoginBody,
  type RegisterBody,
  type Session,
  type SessionInfo,
} from '@/contracts'
import { send, request } from '@/shared/lib/http'

export function login(body: LoginBody): Promise<Session> {
  return request(SessionSchema, { method: 'POST', url: '/auth/login', data: body })
}

export function register(body: RegisterBody): Promise<Session> {
  return request(SessionSchema, { method: 'POST', url: '/auth/register', data: body })
}

export function fetchSessionInfo(signal?: AbortSignal): Promise<SessionInfo> {
  return request(SessionInfoSchema, { url: '/session', signal })
}

export function logout(): Promise<void> {
  return send({ method: 'POST', url: '/auth/logout' })
}

/** Junta o carrinho do visitante (header `X-Guest-Id`) ao do usuário recém-logado. */
export function mergeGuestCart(): Promise<void> {
  return send({ method: 'POST', url: '/cart/merge' })
}
