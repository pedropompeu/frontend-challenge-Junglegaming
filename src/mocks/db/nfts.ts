import type { Nft, NftUpdatedEvent } from '@/contracts'
import { emitNftUpdated } from '../socket/bus'
import { getDb, mutate } from './store'

export type NftPatch = { editions: Array<{ id: string; price?: string; available?: number }> }

/** Aplica uma mudança de preço/estoque, incrementa a versão do NFT e emite `nft.updated`. */
export function mutateNft(nftId: string, patch: NftPatch): NftUpdatedEvent {
  const nft = mutate((db) => {
    const n = db.nfts.find((x) => x.id === nftId)
    if (!n) throw new Error(`NFT ${nftId} não existe`)
    for (const p of patch.editions) {
      const e = n.editions.find((x) => x.id === p.id)
      if (!e) throw new Error(`Edição ${p.id} não existe em ${nftId}`)
      if (p.price !== undefined) e.price = p.price
      if (p.available !== undefined) e.available = Math.max(0, p.available)
    }
    n.version += 1
    return n
  })
  return emitNftUpdated(nft)
}

/** Ajusta o estoque de várias edições (negativo reserva, positivo devolve), um evento por NFT. */
export function adjustStock(
  lines: Array<{ nftId: string; editionId: string; delta: number }>,
): void {
  const touched = new Map<string, Nft>()
  mutate((db) => {
    for (const l of lines) {
      const nft = db.nfts.find((n) => n.id === l.nftId)
      const e = nft?.editions.find((x) => x.id === l.editionId)
      if (!nft || !e) continue
      e.available = Math.max(0, e.available + l.delta)
      touched.set(nft.id, nft)
    }
    for (const nft of touched.values()) nft.version += 1
  })
  for (const nft of touched.values()) emitNftUpdated(nft)
}

export function findNft(nftId: string): Nft | undefined {
  return getDb().nfts.find((n) => n.id === nftId)
}
