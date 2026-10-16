import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/shared/ui/carousel'
import { HeroSlide, type HeroSlideData } from './hero'

const art = (n: number, alt: string) => ({
  src: `/assets/nfts/${n}-800.webp`,
  srcSet: `/assets/nfts/${n}-400.webp 400w, /assets/nfts/${n}-800.webp 800w`,
  alt,
})

const SLIDES: HeroSlideData[] = [
  {
    eyebrow: 'Bem-vindo à Kurio',
    title: 'SEJA DONO DO FUTURO DA ARTE DIGITAL',
    mobileTitle: 'SEJA DONO DA CULTURA DIGITAL',
    text: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    mobileText: 'Descubra NFTs selecionados de criadores do mundo todo.',
    image: {
      src: '/assets/hero-900.webp',
      srcSet: '/assets/hero-450.webp 450w, /assets/hero-900.webp 900w',
      alt: 'Macaco de pelo castanho com óculos redondos verdes e jaqueta college verde',
    },
    thumb: '/assets/nfts/4-400.webp',
  },
  {
    eyebrow: 'Novos lançamentos',
    title: 'EDIÇÕES GÊNESIS DIRETO DOS CRIADORES',
    mobileTitle: 'EDIÇÕES GÊNESIS DOS CRIADORES',
    text: 'Edições limitadas cunhadas nas últimas semanas, antes de chegarem ao mercado secundário.',
    mobileText: 'Edições limitadas recém-cunhadas.',
    image: art(2, 'Macaco de pelo dourado com fones de ouvido verdes e jaqueta creme'),
    thumb: '/assets/nfts/7-400.webp',
    tab: 'new',
  },
  {
    eyebrow: 'Em alta',
    title: 'AS COLEÇÕES QUE TODO MUNDO ESTÁ OLHANDO',
    mobileTitle: 'AS COLEÇÕES DO MOMENTO',
    text: 'As peças com mais movimento na semana: ofertas, favoritos e vendas recentes.',
    mobileText: 'As peças com mais movimento na semana.',
    image: art(3, 'Macaco de pelo preto com gola alta verde e blazer creme'),
    thumb: '/assets/nfts/12-400.webp',
    tab: 'trending',
  },
]

/** Hero da Início com 3 destaques. Sem autoplay: o usuário troca pelos pontos, setas ou arraste. */
export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  return (
    <section aria-label="Destaques" className="relative">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent>
          {SLIDES.map((s, i) => (
            <CarouselItem key={s.title} aria-label={`${i + 1} de ${SLIDES.length}`}>
              <HeroSlide slide={s} priority={i === 0} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:bottom-8 md:left-[calc((100%-450px)/2)]">
        {SLIDES.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={`Ir para o destaque ${i + 1}`}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => api?.scrollTo(i)}
            className="grid size-6 place-items-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-2 rounded-full bg-primary/50 transition-colors',
                i === current && 'bg-primary-hi',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
