import { StarIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type RatingProps = { rating: number; reviewsCount: number; className?: string }

function srLabel(rating: number, reviewsCount: number): string {
  const value = rating.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return `Avaliação ${value} de 5, ${reviewsCount} ${reviewsCount === 1 ? 'avaliação' : 'avaliações'}`
}

/** Estrelas + contagem no desktop; selo compacto "★ 4.8(19)" de 27 px no mobile, como no Figma. */
export function Rating({ rating, reviewsCount, className }: RatingProps) {
  const filled = Math.round(rating)
  return (
    <p className={cn('text-sm', className)}>
      <span className="sr-only">{srLabel(rating, reviewsCount)}</span>
      <span
        aria-hidden="true"
        data-testid="rating-badge"
        className="inline-flex h-[27px] items-center gap-1 rounded-full border border-primary px-1.5 md:hidden"
      >
        <StarIcon className="size-3.5 fill-star text-star" />
        <span>
          <span className="font-medium">{rating.toFixed(1)}</span>
          <span className="text-sand">({reviewsCount})</span>
        </span>
      </span>
      <span aria-hidden="true" className="hidden items-center gap-1 md:inline-flex">
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon
            key={i}
            className={cn(
              'size-3.5 text-primary-hi',
              i < filled ? 'fill-primary-hi' : 'fill-transparent',
            )}
          />
        ))}
        <span className="ml-1">{reviewsCount} avaliações de colecionadores</span>
      </span>
    </p>
  )
}
