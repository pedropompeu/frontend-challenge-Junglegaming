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

export function PromoBanners() {
  return (
    <section aria-label="Coleções em destaque" className="mt-16 grid gap-6 lg:grid-cols-2 md:mt-24">
      {BANNERS.map((b) => (
        <article
          key={b.title}
          className="grid grid-cols-[minmax(0,2fr)_3fr] overflow-hidden rounded-[10px] bg-surface"
        >
          <img
            src={b.image}
            width={400}
            height={400}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full min-h-[200px] w-full object-cover md:min-h-[250px]"
          />
          <div className="flex flex-col justify-center gap-3 p-4 md:p-6">
            <h3 className="text-lg leading-snug font-bold md:text-xl">{b.title}</h3>
            <p className="text-sm leading-[22px] text-sand">{b.text}</p>
            <Link
              to="/"
              search={{ tab: b.tab }}
              hash="catalogo"
              className="inline-flex w-fit items-center gap-3 rounded-md bg-primary px-5 py-2 text-sm text-ink hover:bg-primary-hi"
            >
              Explorar
              <span className="sr-only"> {b.title.toLowerCase()}</span>
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
