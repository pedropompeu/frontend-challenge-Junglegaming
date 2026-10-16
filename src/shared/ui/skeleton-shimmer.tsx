import { cn } from '@/shared/lib/utils'

/** Placeholder de carregamento; as dimensões vêm do `className` para manter o CLS em zero. */
export function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton-shimmer"
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--color-surface)_25%,var(--color-surface-2)_50%,var(--color-surface)_75%)] bg-[length:200%_100%] motion-reduce:animate-none',
        className,
      )}
    />
  )
}
