import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'

/** Mesmas dimensões do `NftCard` para a grade não pular ao carregar. */
export function NftCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className="flex aspect-[175/200] items-center rounded-[20px] bg-surface px-[3.5px] md:block md:aspect-auto md:rounded-[4px] md:p-0.5">
        <SkeletonShimmer
          data-testid="nft-card-skeleton-media"
          className="aspect-square w-full rounded-2xl"
        />
      </div>
      <div className="mt-2 space-y-2 px-2 md:mt-3 md:px-0">
        <SkeletonShimmer className="h-4 w-3/4" />
        <SkeletonShimmer className="h-3 w-1/2" />
        <SkeletonShimmer className="h-5 w-1/3" />
      </div>
    </div>
  )
}
