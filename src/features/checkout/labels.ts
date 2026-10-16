import type { WalletProvider } from '@/contracts'

export const PROVIDER_LABELS: Record<WalletProvider, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
}

/** `0x8f3a…b6d9`: o começo e o fim bastam para conferir o endereço. */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
