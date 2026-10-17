import { useQuery } from '@tanstack/react-query'
import { useId, useState, type ReactNode } from 'react'
import type { Network } from '@/contracts'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'
import { Slider } from '@/shared/ui/slider'
import { categoriesQuery, networksQuery } from '../queries'
import type { CatalogSearch } from '../search-schema'

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

/** Teto do slider de preço; acima disso o filtro fica aberto. */
export const PRICE_CEILING = 15
const PRICE_STEP = 0.05

function toggle<T>(list: T[], item: T, on: boolean): T[] {
  return on ? [...list, item] : list.filter((x) => x !== item)
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg leading-6 font-bold text-cream">
        {title}
      </h2>
      <div className="mt-1">{children}</div>
    </section>
  )
}

/**
 * Item da lista do Figma: sem checkbox, laranja quando ativo, liga e desliga a cada clique.
 * Nas categorias a contagem é negrito e recuada 12 px da direita; na rede, regular e rente.
 */
function FilterItem({
  label,
  count,
  boldCount = false,
  active,
  onToggle,
}: {
  label: string
  count?: number
  boldCount?: boolean
  active: boolean
  onToggle: (on: boolean) => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => onToggle(!active)}
        className={cn(
          'flex w-full justify-between gap-2 rounded-sm py-2.5 pl-3 text-left text-[15px] leading-5 transition-colors',
          boldCount ? 'pr-3' : 'pr-0',
          active ? 'text-primary-hi' : 'text-sand hover:text-cream',
        )}
      >
        <span>{label}</span>
        {count !== undefined ? (
          <span className={cn('tabular-nums', boldCount && 'font-bold')}>({count})</span>
        ) : null}
      </button>
    </li>
  )
}

function PriceFilter({
  priceMin,
  priceMax,
  onApply,
}: {
  priceMin?: number
  priceMax?: number
  onApply: (range: { priceMin?: number; priceMax?: number }) => void
}) {
  const [range, setRange] = useState<number[]>([priceMin ?? 0, priceMax ?? PRICE_CEILING])
  const [lo, hi] = range as [number, number]
  return (
    <div className="px-3">
      <Slider
        min={0}
        max={PRICE_CEILING}
        step={PRICE_STEP}
        minStepsBetweenThumbs={1}
        value={range}
        onValueChange={setRange}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
      />
      <p className="mt-3 text-[15px] leading-5 text-cream" aria-live="polite">
        Preço: {formatEth(String(lo))} –{' '}
        {hi >= PRICE_CEILING ? 'sem limite' : formatEth(String(hi))}
      </p>
      <button
        type="button"
        onClick={() =>
          onApply({
            priceMin: lo > 0 ? lo : undefined,
            priceMax: hi < PRICE_CEILING ? hi : undefined,
          })
        }
        className="mt-3 h-9 w-[92px] rounded-md bg-primary text-base font-bold text-ink transition-colors hover:bg-primary-hi"
      >
        Aplicar
      </button>
    </div>
  )
}

type FiltersPanelProps = {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}

/** Categorias (seção "Coleções" do Figma), faixa de preço e rede. Cada mudança vai direto para a URL. */
export function FiltersPanel({ search, onChange, className }: FiltersPanelProps) {
  const categories = useQuery(categoriesQuery())
  // As redes são fixas: a lista aparece já, e a contagem entra quando chegar.
  const networks = useQuery(networksQuery())
  const networkCount = (n: Network) => networks.data?.find((x) => x.id === n)?.count
  return (
    <div className={cn('space-y-10', className)}>
      <Section title="Coleções">
        {categories.isPending ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <SkeletonShimmer key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : categories.isError ? (
          <p className="text-sm text-sand">
            Não foi possível carregar as categorias.{' '}
            <button
              type="button"
              className="text-primary-hi underline"
              onClick={() => categories.refetch()}
            >
              Tentar de novo
            </button>
          </p>
        ) : (
          <ul>
            {categories.data.map((c) => (
              <FilterItem
                key={c.id}
                label={c.name}
                count={c.count}
                boldCount
                active={search.categories.includes(c.id)}
                onToggle={(on) => onChange({ categories: toggle(search.categories, c.id, on) })}
              />
            ))}
          </ul>
        )}
      </Section>
      <Section title="Faixa de preço">
        <PriceFilter
          key={`${search.priceMin ?? ''}:${search.priceMax ?? ''}`}
          priceMin={search.priceMin}
          priceMax={search.priceMax}
          onApply={onChange}
        />
      </Section>
      <Section title="Rede">
        <ul>
          {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
            <FilterItem
              key={n}
              label={NETWORK_LABELS[n]}
              count={networkCount(n)}
              active={search.networks.includes(n)}
              onToggle={(on) => onChange({ networks: toggle(search.networks, n, on) })}
            />
          ))}
        </ul>
      </Section>
    </div>
  )
}
