/**
 * "Provedor" de carteira simulado no navegador, no papel da extensão (EIP-1193): avisa a
 * página quando a carteira se desconecta por fora do app. Não é evento do servidor — o
 * tempo real do backend continua só no Socket.IO.
 */
export type WalletProviderEvent = { type: 'disconnect' }

const EVENT = 'kurio:wallet-provider'

export function emitWalletProviderEvent(event: WalletProviderEvent): void {
  window.dispatchEvent(new CustomEvent<WalletProviderEvent>(EVENT, { detail: event }))
}

export function onWalletProviderEvent(handler: (event: WalletProviderEvent) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<WalletProviderEvent>).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
