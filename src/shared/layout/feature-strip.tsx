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
      <div className="grid gap-8 bg-surface px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-12">
        {FEATURES.map((f, i) => (
          <article key={f.title} className={i > 0 ? 'lg:border-l lg:border-primary lg:pl-4' : ''}>
            <span
              aria-hidden="true"
              className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-ink"
            >
              {f.mark}
            </span>
            <h3 className="mt-5 text-[17px] font-bold">{f.title}</h3>
            <p className="mt-2 max-w-[18ch] text-sm leading-[22px] text-sand">{f.text}</p>
          </article>
        ))}
        <div className="lg:border-l lg:border-primary lg:pl-4">
          <h3 className="text-[17px] leading-4 font-bold">Antecipe-se ao próximo lançamento</h3>
          <form className="mt-4 flex" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="newsletter-email" className="sr-only">
              E-mail para a newsletter
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="digite seu e-mail..."
              className="h-10 min-w-0 flex-1 rounded-l-md bg-band px-3 text-sm text-cream placeholder:text-khaki"
            />
            <Unavailable className="h-10 rounded-r-md bg-primary px-4 font-bold text-ink">
              Enviar
            </Unavailable>
          </form>
          <p className="mt-4 text-xs leading-[22px] text-sand">
            Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
          </p>
        </div>
      </div>
    </section>
  )
}
