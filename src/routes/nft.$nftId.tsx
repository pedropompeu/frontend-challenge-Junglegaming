import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { pageHead } from '@/app/page-head'
import type { Edition } from '@/contracts'
import {
  availabilityMessage,
  conflictAvailable,
  useAddToCart,
  useQuantityInCart,
} from '@/features/cart/queries'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { EditionPicker } from '@/features/nft/components/edition-picker'
import { MoreFromCollection } from '@/features/nft/components/more-from-collection'
import { NftDetailSkeleton } from '@/features/nft/components/nft-detail-skeleton'
import { NftGallery } from '@/features/nft/components/nft-gallery'
import { NftInfo } from '@/features/nft/components/nft-info'
import { NftTabs } from '@/features/nft/components/nft-tabs'
import { PurchaseBar } from '@/features/nft/components/purchase-bar'
import { selectEdition } from '@/features/nft/editions'
import { nftDetailQuery } from '@/features/nft/queries'
import { errorMessage, isApiError } from '@/shared/lib/api-error'

const detailSearchSchema = z.object({ edicao: z.string().optional().catch(undefined) })

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: detailSearchSchema,
  loader: async ({ context, params }) => {
    try {
      const nft = await context.queryClient.ensureQueryData(nftDetailQuery(params.nftId))
      // Só o que o `head` usa: a tela lê a query, que o tempo real mantém atualizada.
      return { name: nft.name, description: nft.description }
    } catch (error) {
      if (isApiError(error) && error.code === 'NOT_FOUND') throw notFound()
      throw error
    }
  },
  // Sem dados (carregando ou inexistente), vale o `head` da raiz.
  head: ({ loaderData }) => (loaderData ? pageHead(loaderData.name, loaderData.description) : {}),
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
  const inCart = useQuantityInCart(nft.id, edition.id)
  // O teto é o que ainda cabe: estoque da edição menos o que já está no carrinho.
  const max = Math.max(0, edition.available - inCart)
  const addMutation = useAddToCart()

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

  function addToCart(then?: () => void) {
    addMutation.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: clampedQuantity },
      {
        onSuccess: () => {
          setQuantity(1)
          toast.success(`${nft.name} adicionado ao carrinho`)
          then?.()
        },
        onError: (error) => {
          const available = conflictAvailable(error)
          toast.error(available !== null ? availabilityMessage(available) : errorMessage(error))
        },
      },
    )
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
          {/* Topo do frame mobile: gradiente surface → surface-2 sob a arte, que a folha cobre em 30 px. */}
          <div
            data-testid="detail-hero"
            className="relative -mx-6 bg-[linear-gradient(138deg,var(--color-surface),var(--color-surface-2))] md:mx-0 md:bg-none"
          >
            <MobileTopBar nftId={nft.id} name={nft.name} />
            {/* Outro NFT recomeça na primeira imagem. */}
            <NftGallery
              key={nft.id}
              images={nft.images}
              name={nft.name}
              className="px-7 pt-[66px] md:p-0"
            />
          </div>
          <div
            data-testid="detail-sheet"
            className="relative z-10 -mx-6 -mt-[30px] rounded-t-[31px] bg-surface px-6 pt-8 pb-6 md:mx-0 md:mt-0 md:rounded-none md:bg-transparent md:p-0"
          >
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
                inCart={inCart}
                isPending={addMutation.isPending}
                onBuy={() => addToCart(() => void navigate({ to: '/carrinho' }))}
                onAddToCart={() => addToCart()}
                favoriteSlot={
                  <FavoriteButton
                    nftId={nft.id}
                    name={nft.name}
                    className="grid size-11 place-items-center rounded-md border border-line bg-surface-2 text-primary-hi transition-colors hover:bg-line"
                    iconClassName="size-5"
                  />
                }
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

/** Voltar e favoritar sobre a imagem: o mobile do detalhe não tem header. */
function MobileTopBar({ nftId, name }: { nftId: string; name: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  // Círculos de 34 px do frame, a 28 px das bordas e 24 px do topo.
  const circle = 'grid size-[34px] place-items-center rounded-full border border-line bg-surface-2'
  const back = `${circle} text-sand`
  return (
    <div className="absolute inset-x-7 top-6 z-10 flex items-center justify-between md:hidden">
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
      <FavoriteButton
        nftId={nftId}
        name={name}
        className={`${circle} text-primary-hi`}
        iconClassName="size-5"
      />
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
