import { useQuery } from '@tanstack/react-query'
import { NftCard } from '@/features/catalog/components/nft-card'
import { NftCardSkeleton } from '@/features/catalog/components/nft-card-skeleton'
import { nftListQuery } from '@/features/catalog/queries'

const VISIBLE = 5

type MoreFromCollectionProps = { collectionId: string; currentId: string }

/** Carrossel horizontal (scroll-snap) com outros NFTs da mesma coleção; some se não houver. */
export function MoreFromCollection({ collectionId, currentId }: MoreFromCollectionProps) {
  const { data, isPending, isError } = useQuery(
    nftListQuery({
      collections: [collectionId],
      sort: 'relevance',
      tab: 'all',
      page: 1,
      pageSize: VISIBLE + 1,
    }),
  )
  const items = data?.items.filter((n) => n.id !== currentId).slice(0, VISIBLE) ?? []
  if (isError || (!isPending && items.length === 0)) return null
  const cell = 'w-[44vw] max-w-[220px] shrink-0 snap-start md:w-auto md:max-w-none'
  return (
    <section aria-labelledby="more-from-collection" className="mt-12 md:mt-16">
      <h2
        id="more-from-collection"
        className="border-b border-line pb-2 text-lg md:border-divider font-bold text-primary-hi"
      >
        Mais desta coleção
      </h2>
      <ul
        aria-busy={isPending}
        className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0"
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
