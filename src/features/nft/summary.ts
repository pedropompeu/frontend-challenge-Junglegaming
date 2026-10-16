import Big from 'big.js'
import type { Edition, Nft, NftSummary } from '@/contracts'

/** "A partir de": o preço da edição mais barata. */
export function fromPriceOf(editions: Edition[]): string {
  return editions.reduce((min, e) => (new Big(e.price).lt(min) ? e.price : min), editions[0]!.price)
}

/** Resumo de card a partir do detalhe. */
export function toNftSummary(nft: Nft): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    collectionName: nft.collectionName,
    network: nft.network,
    rarity: nft.rarity,
    images: nft.images,
    editions: nft.editions,
    version: nft.version,
    fromPrice: fromPriceOf(nft.editions),
  }
}
