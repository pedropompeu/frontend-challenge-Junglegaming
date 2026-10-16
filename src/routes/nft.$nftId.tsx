import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import type { Edition } from '@/contracts'
import { EditionPicker } from '@/features/nft/components/edition-picker'
import { MoreFromCollection } from '@/features/nft/components/more-from-collection'
import { NftDetailSkeleton } from '@/features/nft/components/nft-detail-skeleton'
import { NftGallery } from '@/features/nft/components/nft-gallery'
import { NftInfo } from '@/features/nft/components/nft-info'
import { NftTabs } from '@/features/nft/components/nft-tabs'
import { PurchaseBar } from '@/features/nft/components/purchase-bar'
import { selectEdition } from '@/features/nft/editions'
import { nftDetailQuery } from '@/features/nft/queries'
import { isApiError } from '@/shared/lib/api-error'

const detailSearchSchema = z.object({ edicao: z.string().optional().catch(undefined) })

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: detailSearchSchema,
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(nftDetailQuery(params.nftId))
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') throw notFound()
      throw error
    }
  },
  pendingComponent: NftDetailSkeleton,
  notFoundComponent: NftNotFound,
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { edicao } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: nft } = useSuspenseQuery(nftDetailQuery(nftId))

  const edition = selectEdition(nft.editions, edicao)
  // Até a Task 15 (carrinho), o teto é o estoque da edição.
  const max = edition.available

  // Troca de edição recomeça a quantidade em 1 (ajuste de estado no render, sem efeito).
  const [quantity, setQuantity] = useState(1)
  const [quantityFor, setQuantityFor] = useState(edition.id)
  if (quantityFor !== edition.id) {
    setQuantityFor(edition.id)
    setQuantity(1)
  }
  const clampedQuantity = Math.min(quantity, Math.max(1, max))

  function selectEditionInUrl(next: Edition) {
    void navigate({ search: { edicao: next.id }, replace: true, resetScroll: false })
  }

  function addToCart() {
    toast.success(`${nft.name} adicionado ao carrinho`)
  }

  return (
    <article>
      <div className="page-container md:pt-6">
        <nav aria-label="Trilha" className="hidden text-sm font-bold md:block">
          <Link to="/" className="hover:text-primary-hi">
            Início
          </Link>{' '}
          /{' '}
          <Link to="/" hash="catalogo" className="hover:text-primary-hi">
            Mercado
          </Link>
        </nav>
        <div className="grid gap-0 md:mt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8 lg:gap-10">
          <div className="relative -mx-4 md:mx-0">
            <MobileTopBar />
            <NftGallery images={nft.images} name={nft.name} className="px-4 pt-16 md:p-0" />
          </div>
          <div className="relative z-10 -mx-4 -mt-10 rounded-t-[32px] bg-surface px-6 pt-8 pb-6 md:mx-0 md:mt-0 md:rounded-none md:bg-transparent md:p-0">
            <NftInfo nft={nft} edition={edition}>
              <EditionPicker
                editions={nft.editions}
                selectedId={edition.id}
                onSelect={selectEditionInUrl}
              />
              <PurchaseBar
                nftName={nft.name}
                edition={edition}
                quantity={clampedQuantity}
                max={max}
                onQuantityChange={setQuantity}
                onBuy={addToCart}
                onAddToCart={addToCart}
              />
            </NftInfo>
          </div>
        </div>
        <div className="mt-12 hidden md:block">
          <NftTabs nft={nft} />
        </div>
        <MoreFromCollection collectionId={nft.collectionId} currentId={nft.id} />
      </div>
    </article>
  )
}

/** Voltar (e, na Task 14, favoritar) sobre a imagem: o mobile do detalhe não tem header. */
function MobileTopBar() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const back =
    'grid size-10 place-items-center rounded-full border border-line-strong bg-ink/70 text-cream'
  return (
    <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between md:hidden">
      {canGoBack ? (
        <button
          type="button"
          aria-label="Voltar"
          className={back}
          onClick={() => router.history.back()}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </button>
      ) : (
        <Link to="/" aria-label="Voltar" className={back}>
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </Link>
      )}
    </div>
  )
}

function NftNotFound() {
  return (
    <section className="page-container grid min-h-[50vh] place-content-center gap-4 py-16 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-primary-hi">404</p>
      <h1 className="text-2xl font-bold md:text-4xl">NFT não encontrado</h1>
      <p className="text-sand">Este item não existe ou foi removido do mercado.</p>
      <Link
        to="/"
        hash="catalogo"
        className="mx-auto mt-2 inline-flex h-11 items-center rounded-md bg-primary px-6 font-bold text-ink hover:bg-primary-hi"
      >
        Voltar ao catálogo
      </Link>
    </section>
  )
}
