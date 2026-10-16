import type { QueryClient } from '@tanstack/react-query'
import type { Cart, Nft, NftSummary, NftUpdatedEvent, Page } from '@/contracts'
import { EDITION_LABELS } from '@/features/nft/editions'
import { fromPriceOf } from '@/features/nft/summary'
import { quotesKeyOf } from '@/features/quote/queries'
import { formatEth } from '@/shared/lib/money'
import { qk } from '@/shared/lib/query-keys'

export type CartLineChange = {
  cartItemId: string
  /** "Nome (edição)", pronto para a mensagem. */
  name: string
  kind: 'price' | 'availability'
  from: string
  to: string
}

/**
 * Aplica um `nft.updated` já aceito pelo gate. Cada cache só muda se a versão dele for menor
 * que a do evento, então um evento antigo nunca desfaz dado mais novo vindo da REST.
 */
export function applyNftUpdate(
  qc: QueryClient,
  e: NftUpdatedEvent,
  ctx: { ownerKey: string },
): { changedCartLines: CartLineChange[] } {
  const nftId = e.resource.id
  const { editions } = e.payload

  qc.setQueryData<Nft>(qk.nfts.detail(nftId), (cached) =>
    cached && cached.version < e.version ? { ...cached, editions, version: e.version } : cached,
  )

  qc.setQueriesData<Page<NftSummary>>({ queryKey: [...qk.nfts.all, 'list'] }, (cached) => {
    if (!cached?.items.some((n) => n.id === nftId && n.version < e.version)) return cached
    return {
      ...cached,
      items: cached.items.map((n) =>
        n.id === nftId && n.version < e.version
          ? { ...n, editions, version: e.version, fromPrice: fromPriceOf(editions) }
          : n,
      ),
    }
  })

  const cartKey = qk.cart(ctx.ownerKey)
  const cart = qc.getQueryData<Cart>(cartKey)
  const changedCartLines: CartLineChange[] = []
  if (cart?.items.some((i) => i.nftId === nftId)) {
    const items = cart.items.map((item) => {
      if (item.nftId !== nftId || item.nftVersion >= e.version) return item
      const edition = editions.find((ed) => ed.id === item.editionId)
      if (!edition) return item
      const name = `${item.name} (${EDITION_LABELS[item.editionKind]})`
      if (edition.price !== item.unitPrice) {
        changedCartLines.push({
          cartItemId: item.id,
          name,
          kind: 'price',
          from: item.unitPrice,
          to: edition.price,
        })
      }
      // Estoque só vira aviso quando a quantidade do carrinho deixa de caber.
      if (edition.available !== item.available && edition.available < item.quantity) {
        changedCartLines.push({
          cartItemId: item.id,
          name,
          kind: 'availability',
          from: String(item.available),
          to: String(edition.available),
        })
      }
      return {
        ...item,
        unitPrice: edition.price,
        available: edition.available,
        nftVersion: e.version,
      }
    })
    qc.setQueryData<Cart>(cartKey, { ...cart, items })
    // Item acima do estoque: o servidor recusaria a cotação (409). Ela só fica marcada como
    // velha e volta a ser pedida quando o carrinho couber de novo.
    const overStock = items.some((i) => i.quantity > i.available)
    void qc.invalidateQueries({
      queryKey: quotesKeyOf(ctx.ownerKey),
      refetchType: overStock ? 'none' : 'active',
    })
  }

  return { changedCartLines }
}

/** Texto do toast e do anúncio para leitores de tela. */
export function describeCartLineChange(change: CartLineChange): string {
  if (change.kind === 'price') {
    return `Preço de ${change.name} mudou de ${formatEth(change.from)} para ${formatEth(change.to)}`
  }
  const left = Number(change.to)
  if (left <= 0) return `${change.name} esgotou`
  return `Estoque de ${change.name} mudou: ${left === 1 ? 'só resta 1 unidade' : `só restam ${left} unidades`}`
}
