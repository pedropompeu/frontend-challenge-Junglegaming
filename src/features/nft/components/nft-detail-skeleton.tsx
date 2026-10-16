import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'

/**
 * Esqueleto com a mesma grade do detalhe (trilha, galeria com miniaturas e painel) para a imagem
 * entrar exatamente onde o placeholder estava, sem salto de layout.
 */
export function NftDetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT" className="page-container md:pt-6">
      <SkeletonShimmer className="hidden h-5 w-36 md:block" />
      <div className="grid gap-0 md:mt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8 lg:gap-10">
        <div className="-mx-6 px-6 pt-16 md:mx-0 md:flex md:items-start md:gap-5 md:p-0">
          {/* Miniatura real: imagem de 80/96 px dentro de uma borda de 2 px. */}
          <div className="hidden shrink-0 flex-col gap-3 md:flex">
            {Array.from({ length: 3 }, (_, i) => (
              <SkeletonShimmer key={i} className="size-[84px] lg:size-[100px]" />
            ))}
          </div>
          <div className="flex-1 bg-surface md:rounded-md md:p-3">
            <SkeletonShimmer
              data-testid="nft-detail-skeleton-media"
              className="aspect-square w-full rounded-[28px] md:rounded-md"
            />
          </div>
        </div>
        <div className="relative z-10 -mx-6 -mt-10 space-y-4 rounded-t-[32px] bg-surface px-6 pt-8 pb-6 md:mx-0 md:mt-0 md:rounded-none md:bg-transparent md:p-0">
          <SkeletonShimmer className="h-8 w-2/3" />
          <SkeletonShimmer className="h-7 w-1/3" />
          <SkeletonShimmer className="h-20 w-full" />
          <SkeletonShimmer className="h-8 w-1/2" />
          <SkeletonShimmer className="h-11 w-full" />
        </div>
      </div>
    </div>
  )
}
