import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import type { NftTab } from '@/contracts'

const BANNERS: Array<{ title: string; text: string; image: string; tab: NftTab }> = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: '/assets/hero-450.webp',
    tab: 'new',
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: '/assets/nfts/3-400.webp',
    tab: 'trending',
  },
]

/** Os dois arcos `#D28A4C` do "Mask Group" do frame desktop, recortados pelo card (586×250). */
function PromoArcs() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 586 250"
      className="pointer-events-none absolute top-0 left-0 hidden h-[250px] w-[586px] xl:block"
      fill="none"
    >
      <circle cx="-63" cy="270" r="127" className="stroke-primary" strokeWidth="2" />
      <circle cx="-71" cy="262" r="127.5" className="stroke-primary" />
    </svg>
  )
}

export function PromoBanners() {
  return (
    <section
      aria-label="Coleções em destaque"
      className="mt-16 grid gap-6 lg:grid-cols-2 xl:gap-7 md:mt-24"
    >
      {BANNERS.map((b) => (
        <article
          key={b.title}
          className="relative grid grid-cols-[minmax(0,2fr)_3fr] overflow-hidden rounded-[10px] bg-surface xl:h-[250px] xl:grid-cols-2 xl:rounded-lg"
        >
          <img
            src={b.image}
            width={400}
            height={400}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full min-h-[200px] w-full object-cover md:min-h-[250px] xl:rounded-[18px]"
          />
          {/* Desktop: texto centrado na metade direita e "Explorar" 140×40 a ~30 px da borda. */}
          <div className="flex flex-col justify-center gap-3 p-4 md:p-6 xl:items-center xl:gap-2.5 xl:px-1 xl:text-center">
            <h3 className="text-lg leading-snug font-bold md:text-xl xl:text-lg xl:leading-6">
              {b.title}
            </h3>
            <p className="text-sm leading-[22px] text-sand xl:leading-6">{b.text}</p>
            <Link
              to="/"
              search={{ tab: b.tab }}
              hash="catalogo"
              className="inline-flex w-fit items-center gap-3 rounded-md bg-primary px-5 py-2 text-sm text-ink hover:bg-primary-hi xl:mt-3 xl:h-10 xl:w-[140px] xl:justify-center xl:mr-[26px] xl:self-end xl:p-0 xl:font-medium"
            >
              Explorar
              <span className="sr-only"> {b.title.toLowerCase()}</span>
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <PromoArcs />
        </article>
      ))}
    </section>
  )
}
