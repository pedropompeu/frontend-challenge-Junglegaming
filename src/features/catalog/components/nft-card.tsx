import { Link } from '@tanstack/react-router'
import type { NftSummary } from '@/contracts'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { cn } from '@/shared/lib/utils'
import { EthPrice } from '@/shared/ui/eth-price'

type NftCardProps = {
  nft: NftSummary
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

export function NftCard({ nft, priority = false, className }: NftCardProps) {
  const image = nft.images[0]!
  return (
    <article className={cn('group relative flex flex-col', className)}>
      {/*
        Moldura retrato 175×200 do frame mobile (r20, surface → surface-2) com a arte centrada.
        No desktop, 258×300 em surface, sem raio, com a arte de 250 a 4 px das laterais.
      */}
      <div className="relative flex aspect-[175/200] items-center rounded-[20px] bg-surface bg-[linear-gradient(140deg,var(--color-surface),var(--color-surface-2))] px-[3.5px] transition-colors group-focus-within:bg-line group-hover:bg-line md:aspect-[258/300] md:rounded-none md:bg-none md:px-1">
        {/* No mobile o selo se ancora no topo da arte; no desktop, na moldura. */}
        <div className="relative w-full md:static">
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
            className="aspect-square w-full rounded-2xl object-cover md:rounded-[15px]"
          />
          {nft.rarity !== 'common' ? (
            <span className="absolute top-0 -left-[3.5px] flex h-8 w-[68px] items-center bg-primary pb-0.5 pl-2 text-[13px] font-medium text-ink md:top-3 md:left-1 md:block md:h-auto md:w-auto md:rounded-r-sm md:px-2 md:py-1 md:text-xs md:font-bold">
              RARO
            </span>
          ) : null}
        </div>
        {/* Coração de 27 px do frame: contorno line sobre surface-2, só preenchido quando favorito. */}
        <FavoriteButton
          nftId={nft.id}
          name={nft.name}
          className="absolute top-[12.5px] right-[11px] z-10 grid size-[27px] place-items-center rounded-full border border-line bg-surface-2 text-primary transition-opacity md:top-3 md:right-3 md:size-8 md:border-0 md:bg-ink/80 md:text-primary-hi md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:aria-pressed:opacity-100"
          iconClassName="size-[18px] md:size-4"
        />
      </div>
      <div className="mt-2 px-2 md:mt-2.5 md:px-0">
        <h3 className="text-[15px] leading-tight md:text-base">
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-[20px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring md:after:rounded-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-khaki">{nft.collectionName}</p>
        <EthPrice
          value={nft.fromPrice}
          original={originalOfCheapest(nft)}
          className="mt-1"
          amountClassName="md:text-lg"
          originalClassName="md:text-lg"
        />
      </div>
    </article>
  )
}
