import { Unavailable } from '@/shared/ui/unavailable'

const FEATURES = [
  {
    mark: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    mark: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    mark: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const

/** Faixa de benefícios + newsletter que antecede o rodapé em todas as telas desktop do Figma. */
export function FeatureStrip() {
  return (
    <section aria-labelledby="feature-strip-title" className="page-container mt-16 md:mt-24">
      <h2 id="feature-strip-title" className="sr-only">
        Por que a Kurio
      </h2>
      {/*
        Frame desktop: faixa de 1200×250, colunas em x 168/433/699/965 e divisórias de 202 px
        a 17 px do texto; a newsletter ocupa os 325 px finais, a 30 px da borda.
      */}
      <div className="grid gap-8 bg-surface px-6 py-8 sm:grid-cols-2 lg:h-[250px] lg:grid-cols-[minmax(0,248fr)_minmax(0,266fr)_minmax(0,266fr)_minmax(0,342fr)] lg:gap-0 lg:pt-8 lg:pr-[30px] lg:pb-4 lg:pl-12">
        {FEATURES.map((f, i) => (
          <article
            key={f.title}
            className={i > 0 ? 'lg:border-l lg:border-primary lg:pl-[17px]' : ''}
          >
            <span
              aria-hidden="true"
              className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-ink"
            >
              {f.mark}
            </span>
            <h3 className="mt-5 text-[17px] font-bold lg:mt-2.5 lg:leading-5">{f.title}</h3>
            <p className="mt-2 max-w-[18ch] text-sm leading-[22px] text-sand lg:mt-2.5 lg:max-w-[23ch]">
              {f.text}
            </p>
          </article>
        ))}
        <div className="lg:border-l lg:border-primary lg:pl-[17px]">
          <h3 className="text-[17px] leading-4 font-bold lg:text-lg">
            Antecipe-se ao próximo lançamento
          </h3>
          <form
            className="mt-4 flex rounded-md lg:shadow-[0_0_20px_rgb(10_6_4/0.45)]"
            onSubmit={(e) => e.preventDefault()}
          >
            <label htmlFor="newsletter-email" className="sr-only">
              E-mail para a newsletter
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="digite seu e-mail..."
              className="h-10 min-w-0 flex-1 rounded-l-md bg-band px-3 text-sm text-cream placeholder:text-khaki"
            />
            <Unavailable className="h-10 rounded-r-md bg-primary px-4 font-bold text-ink lg:w-[85px] lg:px-0 lg:text-lg">
              Enviar
            </Unavailable>
          </form>
          <p className="mt-4 text-xs leading-[22px] text-sand lg:mt-3 lg:text-[13px]">
            Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
          </p>
        </div>
      </div>
    </section>
  )
}
