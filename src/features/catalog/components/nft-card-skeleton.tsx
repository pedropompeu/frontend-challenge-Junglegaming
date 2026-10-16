import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'

/** Mesmas dimensões do `NftCard` para a grade não pular ao carregar. */
export function NftCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      <div className="rounded-[24px] bg-surface p-1 md:rounded-[4px] md:p-0.5">
        <SkeletonShimmer className="aspect-square w-full rounded-[20px] md:rounded-[16px]" />
      </div>
      <div className="mt-3 space-y-2 px-2 md:px-0">
        <SkeletonShimmer className="h-4 w-3/4" />
        <SkeletonShimmer className="h-3 w-1/2" />
        <SkeletonShimmer className="h-5 w-1/3" />
      </div>
    </div>
  )
}
