import { useQuery } from '@tanstack/react-query'
import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CatalogGrid, CatalogGridSkeleton } from '@/features/catalog/components/catalog-grid'
import { CatalogPagination } from '@/features/catalog/components/catalog-pagination'
import { CatalogTabs } from '@/features/catalog/components/catalog-tabs'
import { FeaturedOffer } from '@/features/catalog/components/featured-offer'
import { FiltersPanel } from '@/features/catalog/components/filters-panel'
import { HeroCarousel } from '@/features/catalog/components/hero-carousel'
import { JournalSection } from '@/features/catalog/components/journal-section'
import { MobileSearch, SearchInput } from '@/features/catalog/components/mobile-search'
import { PromoBanners } from '@/features/catalog/components/promo-banners'
import { SortSelect } from '@/features/catalog/components/sort-select'
import { nftListQuery } from '@/features/catalog/queries'
import {
  CATALOG_PAGE_SIZE,
  CATALOG_SEARCH_DEFAULTS,
  catalogSearchSchema,
  hasActiveFilters,
  toListParams,
} from '@/features/catalog/search-schema'
import { useCatalogNavigation } from '@/features/catalog/use-catalog-navigation'
import { errorMessage } from '@/shared/lib/api-error'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  search: { middlewares: [stripSearchParams(CATALOG_SEARCH_DEFAULTS)] },
  component: HomePage,
})

function HomePage() {
  const { search, setFilters, setPage, clearFilters } = useCatalogNavigation()
  const query = useQuery(nftListQuery(toListParams(search)))
  const { data } = query
  const outOfRange = data !== undefined && data.totalPages > 0 && search.page > data.totalPages

  useEffect(() => {
    if (outOfRange) void setPage(data.totalPages, { replace: true })
  }, [outOfRange, data?.totalPages, setPage])

  let results
  if (query.isError && !data) {
    results = (
      <div role="alert" className="rounded-[10px] bg-surface px-6 py-12 text-center">
        <h2 className="text-lg font-bold">Não foi possível carregar os NFTs</h2>
        <p className="mt-2 text-sm text-sand">{errorMessage(query.error)}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-6 rounded-md bg-primary px-5 py-2 font-bold text-ink hover:bg-primary-hi"
        >
          Tentar novamente
        </button>
      </div>
    )
  } else if (!data || outOfRange) {
    results = <CatalogGridSkeleton count={CATALOG_PAGE_SIZE} />
  } else if (data.total === 0) {
    results = (
      <div className="rounded-[10px] bg-surface px-6 py-12 text-center">
        <h2 className="text-lg font-bold">Nenhum NFT encontrado</h2>
        <p className="mt-2 text-sm text-sand">
          {search.q ? `Nada corresponde a “${search.q}”.` : 'Nenhum item corresponde aos filtros.'}{' '}
          Tente outros termos ou remova filtros.
        </p>
        {hasActiveFilters(search) ? (
          <button
            type="button"
            onClick={() => void clearFilters()}
            className="mt-6 rounded-md bg-primary px-5 py-2 font-bold text-ink hover:bg-primary-hi"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>
    )
  } else {
    results = (
      <>
        <CatalogGrid items={data.items} busy={query.isFetching} />
        <CatalogPagination page={data.page} totalPages={data.totalPages} />
      </>
    )
  }

  const updating = query.isFetching && !query.isPending

  return (
    <div className="page-container pt-4 md:pt-6">
      <h1 className="sr-only">Kurio — mercado de NFTs</h1>
      <MobileSearch resultCount={data?.total} />
      <div className="mt-4 md:mt-0">
        <HeroCarousel />
      </div>

      <div
        id="catalogo"
        className="mt-3.5 scroll-mt-6 md:mt-16 md:grid md:grid-cols-[minmax(0,310px)_1fr] md:gap-8 lg:gap-12"
      >
        <aside aria-label="Filtros" className="hidden md:block">
          <div className="bg-surface px-5 py-5">
            <SearchInput className="mb-6" />
            <FiltersPanel search={search} onChange={setFilters} />
          </div>
          <FeaturedOffer />
        </aside>

        <section aria-labelledby="catalogo-titulo">
          <h2 id="catalogo-titulo" className="sr-only">
            Catálogo
          </h2>
          <div className="flex items-center justify-between gap-4 overflow-x-auto">
            <CatalogTabs value={search.tab} onChange={(tab) => void setFilters({ tab })} />
            <SortSelect
              value={search.sort}
              onChange={(sort) => void setFilters({ sort })}
              className="hidden md:flex"
            />
          </div>
          <p aria-live="polite" className="mt-4 h-5 text-xs text-sand">
            {updating ? 'Atualizando…' : data && !outOfRange ? `${data.total} NFTs` : ''}
          </p>
          <div className="mt-2">{results}</div>
        </section>
      </div>

      <PromoBanners />
      <JournalSection />
    </div>
  )
}
