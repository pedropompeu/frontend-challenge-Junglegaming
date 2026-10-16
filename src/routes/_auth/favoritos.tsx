import { useQueries } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'
import { NftCard } from '@/features/catalog/components/nft-card'
import { NftCardSkeleton } from '@/features/catalog/components/nft-card-skeleton'
import { useFavorites } from '@/features/favorites/queries'
import { nftDetailQuery } from '@/features/nft/queries'
import { toNftSummary } from '@/features/nft/summary'
import { errorMessage } from '@/shared/lib/api-error'

export const Route = createFileRoute('/_auth/favoritos')({
  component: FavoritesPage,
})

const grid = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6'

function FavoritesPage() {
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  // A API não lista por ids: cada card vem do detalhe (já em cache quando o usuário passou por ele).
  const nfts = useQueries({
    queries: ids.map((id) => nftDetailQuery(id)),
  })

  let content
  if (favorites.isError) {
    content = (
      <div role="alert" className="rounded-[10px] bg-surface px-6 py-12 text-center">
        <p className="font-bold">Não foi possível carregar seus favoritos</p>
        <p className="mt-2 text-sm text-sand">{errorMessage(favorites.error)}</p>
        <button
          type="button"
          onClick={() => void favorites.refetch()}
          className="mt-6 rounded-md bg-primary px-5 py-2 font-bold text-ink hover:bg-primary-hi"
        >
          Tentar novamente
        </button>
      </div>
    )
  } else if (!favorites.data) {
    content = (
      <div className={grid} aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <NftCardSkeleton key={i} />
        ))}
      </div>
    )
  } else if (ids.length === 0) {
    content = (
      <div className="grid justify-items-center gap-3 rounded-[10px] bg-surface px-6 py-14 text-center">
        <HeartIcon aria-hidden="true" className="size-10 text-primary-hi" />
        <p className="text-lg font-bold">Nenhum favorito ainda</p>
        <p className="max-w-sm text-sm text-sand">
          Toque no coração de um NFT para guardá-lo aqui e acompanhar preço e estoque.
        </p>
        <Link
          to="/"
          hash="catalogo"
          className="mt-3 inline-flex h-11 items-center rounded-md bg-primary px-6 font-bold text-ink hover:bg-primary-hi"
        >
          Explorar o mercado
        </Link>
      </div>
    )
  } else {
    content = (
      <ul aria-label="Favoritos" className={grid}>
        {nfts.map((q, i) =>
          // NFT removido do mercado some da lista em vez de ficar carregando.
          q.isError ? null : (
            <li key={ids[i]}>
              {q.data ? <NftCard nft={toNftSummary(q.data)} /> : <NftCardSkeleton />}
            </li>
          ),
        )}
      </ul>
    )
  }

  return (
    <section className="page-container py-8 md:py-10">
      <h1 className="mb-6 text-2xl font-bold md:text-4xl">Favoritos</h1>
      {content}
    </section>
  )
}
