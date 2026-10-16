import { useState } from 'react'
import { ZoomInIcon } from 'lucide-react'
import type { NftImage } from '@/contracts'
import { smallSrc } from '@/features/catalog/components/nft-card'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'

type NftGalleryProps = { images: NftImage[]; name: string; className?: string }

/** Imagem principal com miniaturas (desktop) e zoom em diálogo. */
export function NftGallery({ images, name, className }: NftGalleryProps) {
  const [index, setIndex] = useState(0)
  const current = images[Math.min(index, images.length - 1)]!
  const alt = `${name}: ${current.alt}`
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
              onClick={() => setIndex(i)}
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
        <img
          src={current.src}
          srcSet={`${smallSrc(current.src)} 400w, ${current.src} 800w`}
          sizes="(min-width: 1024px) 420px, (min-width: 768px) 40vw, 100vw"
          width={current.width}
          height={current.height}
          alt={alt}
          fetchPriority="high"
          decoding="async"
          className="aspect-[361/356] w-full rounded-3xl object-cover md:aspect-square md:rounded-md"
        />
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
