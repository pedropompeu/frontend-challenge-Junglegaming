import type { NftSummary } from '@/contracts'
import { cn } from '@/shared/lib/utils'
import { NftCard } from './nft-card'
import { NftCardSkeleton } from './nft-card-skeleton'

export const GRID_ID = 'catalogo-grade'

const gridClass =
  'grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:gap-x-[34px] lg:gap-y-12 [&>*:nth-child(even)]:mt-8 md:[&>*:nth-child(even)]:mt-0'

export function CatalogGridSkeleton({ count }: { count: number }) {
  return (
    <div data-testid="catalog-skeleton" className={gridClass} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <NftCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Grade de 3 colunas no desktop e 2 em masonry (coluna da direita deslocada) no mobile. */
export function CatalogGrid({ items, busy }: { items: NftSummary[]; busy: boolean }) {
  return (
    <ul
      id={GRID_ID}
      aria-label="NFTs"
      aria-busy={busy}
      className={cn(gridClass, 'transition-opacity', busy && 'opacity-70')}
    >
      {items.map((nft, i) => (
        <li key={nft.id}>
          <NftCard nft={nft} priority={i < 3} />
        </li>
      ))}
    </ul>
  )
}
