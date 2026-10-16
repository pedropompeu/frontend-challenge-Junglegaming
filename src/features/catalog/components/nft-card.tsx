import { Link } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'
import type { NftSummary } from '@/contracts'
import { cn } from '@/shared/lib/utils'
import { EthPrice } from '@/shared/ui/eth-price'

type NftCardProps = {
  nft: NftSummary
  isFavorite?: boolean
  /** Sem handler, o coração não aparece (favoritos chegam na Task 14). */
  onToggleFavorite?: (nft: NftSummary) => void
  /** Imagens acima da dobra carregam com prioridade (LCP). */
  priority?: boolean
  className?: string
}

export function smallSrc(src: string): string {
  return src.replace(/-800\.webp$/, '-400.webp')
}

/** Preço riscado da edição mais barata, quando ela está em promoção. */
function originalOfCheapest(nft: NftSummary): string | null {
  return nft.editions.find((e) => e.price === nft.fromPrice)?.originalPrice ?? null
}

export function NftCard({
  nft,
  isFavorite = false,
  onToggleFavorite,
  priority = false,
  className,
}: NftCardProps) {
  const image = nft.images[0]!
  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative rounded-[24px] bg-surface p-1 transition-colors group-focus-within:bg-line group-hover:bg-line md:rounded-[4px] md:p-0.5">
        <img
          src={image.src}
          srcSet={`${smallSrc(image.src)} 400w, ${image.src} 800w`}
          sizes="(min-width: 1024px) 280px, (min-width: 768px) 30vw, 45vw"
          width={image.width}
          height={image.height}
          alt={image.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="aspect-square w-full rounded-[20px] object-cover md:rounded-[16px]"
        />
        {nft.rarity !== 'common' ? (
          <span className="absolute top-4 left-1 rounded-r-sm bg-primary px-2 py-1 text-xs font-bold text-ink md:top-3">
            RARO
          </span>
        ) : null}
        {onToggleFavorite ? (
          <button
            type="button"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            onClick={() => onToggleFavorite(nft)}
            className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-ink/80 text-primary-hi transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:aria-pressed:opacity-100"
          >
            <HeartIcon aria-hidden="true" className={cn('size-4', isFavorite && 'fill-current')} />
          </button>
        ) : null}
      </div>
      <div className="mt-3 px-2 md:px-0">
        <h3 className="text-[15px] leading-tight">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-[24px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring md:after:rounded-[4px]"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-khaki">{nft.collectionName}</p>
        <EthPrice value={nft.fromPrice} original={originalOfCheapest(nft)} className="mt-1" />
      </div>
    </article>
  )
}
