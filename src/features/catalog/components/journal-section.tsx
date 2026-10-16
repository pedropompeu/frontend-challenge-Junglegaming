import { Unavailable } from '@/shared/ui/unavailable'

const POSTS = [
  {
    date: '12 de setembro',
    read: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/assets/nfts/3-400.webp',
  },
  {
    date: '13 de setembro',
    read: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/assets/nfts/1-400.webp',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/assets/nfts/4-400.webp',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/assets/nfts/2-400.webp',
  },
] as const

/** Blog "Diário da Cunhagem": conteúdo editorial estático, artigos fora do escopo. */
export function JournalSection() {
  return (
    <section aria-labelledby="diario-titulo" className="mt-16 md:mt-24">
      <h2 id="diario-titulo" className="text-center text-2xl font-bold md:text-3xl">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-sm text-sand">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((p) => (
          <li key={p.title}>
            <article className="h-full overflow-hidden rounded-[10px] bg-surface">
              <img
                src={p.image}
                width={400}
                height={290}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-[195px] w-full object-cover"
              />
              <div className="p-4">
                <p className="text-xs text-sand">
                  {p.date} <span aria-hidden="true">|</span>
                  <span className="sr-only">,</span> {p.read}
                </p>
                <h3 className="mt-3 max-w-[22ch] font-bold">{p.title}</h3>
                <p className="mt-2 text-xs leading-5 text-sand">{p.text}</p>
                <Unavailable asChild>
                  <a href="#" className="mt-3 inline-flex gap-4 text-xs font-bold text-primary-hi">
                    Ler mais<span className="sr-only">: {p.title}</span>
                    <span aria-hidden="true">→</span>
                  </a>
                </Unavailable>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
