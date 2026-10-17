import { useQuery } from '@tanstack/react-query'
import { NftCard } from '@/features/catalog/components/nft-card'
import { NftCardSkeleton } from '@/features/catalog/components/nft-card-skeleton'
import { nftListQuery } from '@/features/catalog/queries'

const VISIBLE = 5

/** "Colecionadores também viram": NFTs em alta que ainda não estão no carrinho. */
export function AlsoViewed({ excludeIds }: { excludeIds: string[] }) {
  const { data, isPending, isError } = useQuery(
    nftListQuery({ sort: 'relevance', tab: 'trending', page: 1, pageSize: VISIBLE * 2 }),
  )
  const items = data?.items.filter((n) => !excludeIds.includes(n.id)).slice(0, VISIBLE) ?? []
  if (isError || (!isPending && items.length === 0)) return null
  const cell = 'w-[44vw] max-w-[220px] shrink-0 snap-start md:w-auto md:max-w-none'
  return (
    <section aria-labelledby="also-viewed" className="mt-12 md:mt-24">
      <h2
        id="also-viewed"
        className="border-b border-line pb-2 text-lg font-bold text-primary-hi md:border-divider md:pb-[11px] md:text-[17px] md:leading-4"
      >
        Colecionadores também viram
      </h2>
      <ul
        aria-busy={isPending}
        className="-mx-6 mt-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 md:mx-0 md:mt-8 md:grid md:grid-cols-5 md:overflow-visible md:px-0"
      >
        {isPending
          ? Array.from({ length: VISIBLE }, (_, i) => (
              <li key={i} className={cell}>
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className={cell}>
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
