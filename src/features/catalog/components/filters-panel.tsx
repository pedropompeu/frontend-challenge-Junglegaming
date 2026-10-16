import { useQuery } from '@tanstack/react-query'
import { useId, useState, type ReactNode } from 'react'
import type { Network } from '@/contracts'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { Checkbox } from '@/shared/ui/checkbox'
import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'
import { Slider } from '@/shared/ui/slider'
import { collectionsQuery } from '../queries'
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
    <section aria-labelledby={id} className="border-b border-line pb-6 last:border-none">
      <h2 id={id} className="text-lg font-bold text-cream">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function CheckRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string
  count?: number
  checked: boolean
  onChange: (on: boolean) => void
}) {
  const id = useId()
  return (
    <li className="flex items-center gap-3 py-1.5 pl-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <label
        htmlFor={id}
        className="flex flex-1 cursor-pointer justify-between gap-2 text-sm text-sand"
      >
        <span>{label}</span>
        {count !== undefined ? (
          <span className="text-primary-hi tabular-nums">({count})</span>
        ) : null}
      </label>
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
    <>
      <Slider
        min={0}
        max={PRICE_CEILING}
        step={PRICE_STEP}
        minStepsBetweenThumbs={1}
        value={range}
        onValueChange={setRange}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        className="px-1"
      />
      <p className="mt-4 text-sm text-sand" aria-live="polite">
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
        className="mt-3 rounded-md bg-primary px-4 py-1.5 text-sm font-bold text-ink transition-colors hover:bg-primary-hi"
      >
        Aplicar
      </button>
    </>
  )
}

type FiltersPanelProps = {
  search: CatalogSearch
  onChange: (patch: Partial<CatalogSearch>) => void
  className?: string
}

/** Coleções, faixa de preço e rede. Cada mudança vai direto para a URL. */
export function FiltersPanel({ search, onChange, className }: FiltersPanelProps) {
  const collections = useQuery(collectionsQuery())
  return (
    <div className={cn('space-y-6', className)}>
      <Section title="Coleções">
        {collections.isPending ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonShimmer key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : collections.isError ? (
          <p className="text-sm text-sand">
            Não foi possível carregar as coleções.{' '}
            <button
              type="button"
              className="text-primary-hi underline"
              onClick={() => collections.refetch()}
            >
              Tentar de novo
            </button>
          </p>
        ) : (
          <ul>
            {collections.data.map((c) => (
              <CheckRow
                key={c.id}
                label={c.name}
                count={c.count}
                checked={search.collections.includes(c.id)}
                onChange={(on) => onChange({ collections: toggle(search.collections, c.id, on) })}
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
            <CheckRow
              key={n}
              label={NETWORK_LABELS[n]}
              checked={search.networks.includes(n)}
              onChange={(on) => onChange({ networks: toggle(search.networks, n, on) })}
            />
          ))}
        </ul>
      </Section>
    </div>
  )
}
