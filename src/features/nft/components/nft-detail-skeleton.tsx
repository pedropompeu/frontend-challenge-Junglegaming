import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'

/** Esqueleto com a mesma grade do detalhe para não haver salto de layout. */
export function NftDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando NFT"
      className="page-container grid gap-8 pt-4 md:grid-cols-2 md:pt-8"
    >
      <div className="flex gap-5">
        <div className="hidden flex-col gap-3 md:flex">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonShimmer key={i} className="size-20 lg:size-24" />
          ))}
        </div>
        <SkeletonShimmer className="aspect-square flex-1 rounded-[28px] md:rounded-md" />
      </div>
      <div className="space-y-4">
        <SkeletonShimmer className="h-8 w-2/3" />
        <SkeletonShimmer className="h-7 w-1/3" />
        <SkeletonShimmer className="h-20 w-full" />
        <SkeletonShimmer className="h-8 w-1/2" />
        <SkeletonShimmer className="h-11 w-full" />
      </div>
    </div>
  )
}
