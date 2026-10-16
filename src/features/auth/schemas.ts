import { z } from 'zod'

export { LoginBodySchema, RegisterBodySchema } from '@/contracts'

/** Só caminhos internos (`/algo`); `//host` e URLs absolutas viram `undefined` (open redirect). */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined
  return value
}

export const authSearchSchema = z.object({
  redirect: z.unknown().transform(safeRedirect).optional(),
  motivo: z.enum(['expirada']).optional().catch(undefined),
})
export type AuthSearch = z.infer<typeof authSearchSchema>

const AUTH_PATHS = ['/entrar', '/cadastro']

/** Para onde ir depois de entrar ou fechar: nunca de volta à própria tela de acesso. */
export function afterAuthTarget(search: AuthSearch): string {
  const target = search.redirect
  if (!target || AUTH_PATHS.some((p) => target === p || target.startsWith(`${p}?`))) return '/'
  return target
}

/** Para onde ir ao fechar sem entrar: rota privada rebateria para o login, então vai ao Início. */
export function closeAuthTarget(search: AuthSearch, isPrivate: (href: string) => boolean): string {
  const target = afterAuthTarget(search)
  return isPrivate(target) ? '/' : target
}
