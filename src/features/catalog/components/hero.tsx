import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import type { NftTab } from '@/contracts'

export type HeroSlideData = {
  eyebrow: string
  title: string
  /** Título curto do mobile (Figma: "SEJA DONO DA CULTURA DIGITAL"). */
  mobileTitle: string
  text: string
  /** Texto curto do mobile, onde o card do hero tem pouco espaço. */
  mobileText: string
  image: { src: string; srcSet: string; alt: string }
  thumb: string
  /** Sem aba: "Explorar" rola até o catálogo. */
  tab?: NftTab
}

const cta =
  'inline-flex items-center gap-2 font-bold tracking-wide text-primary-hi md:rounded-md md:bg-primary md:px-7 md:py-2.5 md:text-lg md:text-ink md:hover:bg-primary-hi'

function Explore({ tab, label }: { tab?: NftTab; label: string }) {
  const content = (
    <>
      EXPLORAR
      <span className="sr-only"> {label}</span>
      <ArrowRightIcon aria-hidden="true" className="size-4 md:hidden" />
    </>
  )
  if (!tab) {
    return (
      <a href="#catalogo" className={cta}>
        {content}
      </a>
    )
  }
  return (
    <Link to="/" search={{ tab }} hash="catalogo" className={cta}>
      {content}
    </Link>
  )
}

/** Um destaque do hero: texto à esquerda e arte à direita (no mobile, card compacto). */
export function HeroSlide({ slide, priority }: { slide: HeroSlideData; priority: boolean }) {
  return (
    <div className="relative grid min-h-[190px] grid-cols-[1fr_auto] items-center gap-4 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_70%_30%,var(--color-surface-2),var(--color-surface)_60%)] p-4 md:min-h-[450px] md:grid-cols-[1fr_450px] md:rounded-none md:bg-none md:p-0">
      <div className="relative z-10 max-w-[60ch] md:pl-10">
        <p className="text-xs text-cream md:text-sm md:tracking-[0.12em]">{slide.eyebrow}</p>
        <h2 className="mt-2 text-xl leading-tight font-bold md:mt-4 md:text-5xl md:leading-[1.45]">
          <span className="md:hidden">{slide.mobileTitle}</span>
          <span className="hidden md:inline">{slide.title}</span>
        </h2>
        <p className="mt-2 max-w-[22ch] text-xs leading-5 text-sand md:mt-3 md:max-w-[52ch] md:text-sm md:leading-6 md:text-primary-hi">
          <span className="md:hidden">{slide.mobileText}</span>
          <span className="hidden md:inline">{slide.text}</span>
        </p>
        <div className="mt-3 md:mt-8">
          <Explore tab={slide.tab} label={slide.mobileTitle.toLowerCase()} />
        </div>
      </div>
      <div className="relative">
        <img
          src={slide.image.src}
          srcSet={slide.image.srcSet}
          sizes="(min-width: 768px) 450px, 140px"
          width={450}
          height={450}
          alt={slide.image.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="size-[138px] rounded-[20px] object-cover md:size-[450px] md:rounded-[32px]"
        />
        <img
          src={slide.thumb}
          width={60}
          height={60}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute -bottom-2 left-2 size-[58px] rounded-[14px] border-2 border-surface object-cover md:hidden"
        />
      </div>
    </div>
  )
}
