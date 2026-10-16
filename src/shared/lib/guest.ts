import { readItem, writeItem } from './storage'

export const GUEST_KEY = 'kurio:guest-id'

/** Identificador do carrinho de visitante; criado na primeira leitura. */
export function getGuestId(): string {
  return readItem('local', GUEST_KEY) ?? rotateGuestId()
}

/** Gera um novo id de visitante (após o merge do carrinho no login, o antigo fica órfão). */
export function rotateGuestId(): string {
  const id = `gst_${crypto.randomUUID().replace(/-/g, '')}`
  writeItem('local', GUEST_KEY, id)
  return id
}
