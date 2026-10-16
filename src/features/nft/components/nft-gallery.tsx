import { useRef, useState } from 'react'
import type { UIEvent } from 'react'
import { ZoomInIcon } from 'lucide-react'
import type { NftImage } from '@/contracts'
import { smallSrc } from '@/features/catalog/components/nft-card'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'

type NftGalleryProps = { images: NftImage[]; name: string; className?: string }

/**
 * Faixa de imagens com snap: no mobile o dedo (ou a seta, com a faixa focada) passa de uma à outra
 * sob os pontos do frame; no desktop as miniaturas rolam a faixa. O zoom abre a imagem atual.
 */
export function NftGallery({ images, name, className }: NftGalleryProps) {
  const [index, setIndex] = useState(0)
  const strip = useRef<HTMLUListElement>(null)
  const current = images[Math.min(index, images.length - 1)]!
  const alt = `${name}: ${current.alt}`

  function show(i: number) {
    setIndex(i)
    const el = strip.current
    el?.scrollTo({ left: i * el.clientWidth, behavior: 'instant' })
  }

  // A imagem atual é a que parou no snap; o arredondamento ignora o meio do gesto.
  function followScroll(event: UIEvent<HTMLUListElement>) {
    const el = event.currentTarget
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }
  return (
    <div className={cn('md:flex md:items-start md:gap-5', className)}>
      {images.length > 1 ? (
        <div
          role="group"
          aria-label="Imagens do NFT"
          className="hidden shrink-0 flex-col gap-3 md:flex"
        >
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-pressed={i === index}
              aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              onClick={() => show(i)}
              className="overflow-hidden rounded-md border-2 border-transparent transition-colors hover:border-line-strong aria-pressed:border-primary-hi"
            >
              <img
                src={smallSrc(img.src)}
                alt=""
                width={96}
                height={96}
                loading="lazy"
                decoding="async"
                className="size-20 object-cover lg:size-24"
              />
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative flex-1 rounded-3xl bg-surface md:rounded-md md:p-3">
        {/* O foco deixa a seta rolar a faixa; sem barra, como o frame. */}
        <ul
          ref={strip}
          aria-label={`Imagens de ${name}`}
          tabIndex={0}
          onScroll={followScroll}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl [scrollbar-width:none] md:rounded-md"
        >
          {images.map((img, i) => (
            <li key={img.src} className="w-full shrink-0 snap-center">
              <img
                src={img.src}
                srcSet={`${smallSrc(img.src)} 400w, ${img.src} 800w`}
                sizes="(min-width: 1024px) 420px, (min-width: 768px) 40vw, 100vw"
                width={img.width}
                height={img.height}
                alt={`${name}: ${img.alt}`}
                fetchPriority={i === 0 ? 'high' : undefined}
                loading={i === 0 ? undefined : 'lazy'}
                decoding="async"
                className="aspect-[361/356] w-full rounded-3xl object-cover md:aspect-square md:rounded-md"
              />
            </li>
          ))}
        </ul>
        {images.length > 1 ? (
          // Pontos do frame (Group 62): só indicam; quem troca a imagem é o gesto na faixa.
          <div
            aria-hidden="true"
            data-testid="gallery-dots"
            className="pointer-events-none absolute bottom-[50px] left-1/2 flex -translate-x-1/2 gap-[7px] md:hidden"
          >
            {images.map((img, i) => (
              <span
                key={img.src}
                className={cn(
                  'h-[7px] w-[7px] rounded-full bg-primary motion-safe:transition-[width]',
                  i === index && 'w-7',
                )}
              />
            ))}
          </div>
        ) : null}
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute right-8 bottom-16 grid size-10 place-items-center rounded-full bg-ink/80 text-cream transition-colors hover:text-primary-hi md:top-5 md:right-5 md:bottom-auto md:size-9"
            >
              <ZoomInIcon aria-hidden="true" className="size-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="border-line bg-surface p-3 sm:max-w-3xl">
            <DialogTitle className="sr-only">{name}</DialogTitle>
            <img
              src={current.src}
              width={current.width}
              height={current.height}
              alt={alt}
              className="aspect-square max-h-[80dvh] w-full rounded-md object-contain"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
