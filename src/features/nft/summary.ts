import Big from 'big.js'
import type { Nft, NftSummary } from '@/contracts'

/** Resumo de card a partir do detalhe (o "a partir de" é a edição mais barata). */
export function toNftSummary(nft: Nft): NftSummary {
  const fromPrice = nft.editions.reduce(
    (min, e) => (new Big(e.price).lt(min) ? e.price : min),
    nft.editions[0]!.price,
  )
  return {
    id: nft.id,
    name: nft.name,
    collectionName: nft.collectionName,
    network: nft.network,
    rarity: nft.rarity,
    images: nft.images,
    editions: nft.editions,
    version: nft.version,
    fromPrice,
  }
}
