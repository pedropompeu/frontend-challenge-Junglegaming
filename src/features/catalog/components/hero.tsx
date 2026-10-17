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
  'inline-flex items-center gap-2 text-xs font-bold text-primary-hi md:rounded-md md:bg-primary md:px-7 md:py-2.5 md:text-lg md:tracking-wide md:text-ink md:hover:bg-primary-hi'

function Explore({ tab, label }: { tab?: NftTab; label: string }) {
  const content = (
    <>
      EXPLORAR
      <span className="sr-only"> {label}</span>
      <ArrowRightIcon
        aria-hidden="true"
        strokeWidth={1.5}
        className="size-4 text-primary md:hidden"
      />
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
    // "Mask Group" do frame mobile: #D28A4C de 20% a 10% e dois círculos de r 124 recortados pelo card.
    <div className="relative grid min-h-[190px] grid-cols-[1fr_auto] items-start gap-1.5 overflow-hidden rounded-[30px] bg-[linear-gradient(117deg,rgba(210,138,76,0.2),rgba(210,138,76,0.1))] px-4 pt-[5px] md:min-h-[450px] md:grid-cols-[1fr_450px] md:items-center md:gap-4 md:rounded-none md:bg-none md:p-0">
      <span
        aria-hidden="true"
        className="absolute top-[-31px] left-[-80px] size-[248px] rounded-full bg-[linear-gradient(160deg,rgba(221,154,95,0.43)_22%,rgba(210,138,76,0.04)_87%)] md:hidden"
      />
      <span
        aria-hidden="true"
        className="absolute top-[-10px] left-[73px] size-[248px] rounded-full bg-[linear-gradient(160deg,rgba(221,154,95,0.37)_22%,rgba(210,138,76,0)_87%)] md:hidden"
      />
      <div className="relative z-10 max-w-[60ch] md:pl-10">
        <p className="text-xs font-medium text-cream md:text-sm md:font-normal md:tracking-[0.12em]">
          {slide.eyebrow}
        </p>
        <h2 className="mt-1.5 text-lg leading-[29px] font-bold md:mt-4 md:text-5xl md:leading-[1.45]">
          <span className="md:hidden">{slide.mobileTitle}</span>
          <span className="hidden md:inline">{slide.title}</span>
        </h2>
        <p className="mt-1.5 max-w-[26ch] text-xs leading-[18px] text-sand md:mt-3 md:max-w-[52ch] md:text-sm md:leading-6">
          <span className="md:hidden">{slide.mobileText}</span>
          <span className="hidden md:inline">{slide.text}</span>
        </p>
        <div className="flex md:mt-8 md:block">
          <Explore tab={slide.tab} label={slide.mobileTitle.toLowerCase()} />
        </div>
      </div>
      <div className="relative mt-[5.5px] md:mt-0">
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
          className="size-[138px] rounded-2xl object-cover md:size-[450px] md:rounded-[32px]"
        />
        <img
          src={slide.thumb}
          width={60}
          height={60}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute -bottom-2 left-3.5 size-[58px] rounded-2xl object-cover md:hidden"
        />
      </div>
    </div>
  )
}
