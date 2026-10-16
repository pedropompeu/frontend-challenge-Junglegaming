import Big from 'big.js'
import { findNft, mutateNft } from '../db/nfts'
import { getDb } from '../db/store'
import { consumeCheckoutMutation, getScenarioConfig } from '../scenarios/runtime'

export const CHECKOUT_MUTATION_DELAY_MS = 1500

/**
 * Cenários price-change-checkout / sold-out-checkout: 1,5s após a 1ª conexão de carteira do cenário,
 * muda o primeiro item do carrinho do usuário (preço +15% ou estoque zerado) e emite `nft.updated`.
 */
export function maybeScheduleCheckoutMutation(userId: string): void {
  const kind = getScenarioConfig().checkoutMutation
  if (!kind || !consumeCheckoutMutation()) return
  setTimeout(() => {
    const item = getDb().carts[`user:${userId}`]?.items[0]
    const edition = item && findNft(item.nftId)?.editions.find((e) => e.id === item.editionId)
    if (!item || !edition) return
    const patch =
      kind === 'price-change'
        ? { id: edition.id, price: new Big(edition.price).times(1.15).round(4, Big.roundHalfUp).toFixed() }
        : { id: edition.id, available: 0 }
    mutateNft(item.nftId, { editions: [patch] })
  }, CHECKOUT_MUTATION_DELAY_MS)
}
