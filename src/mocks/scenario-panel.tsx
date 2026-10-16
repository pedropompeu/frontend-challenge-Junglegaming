import { useId, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { FlaskConicalIcon } from 'lucide-react'
import type { Edition, Nft } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { EDITION_LABELS, selectEdition } from '@/features/nft/editions'
import { mobileChromeOf, type MobileChrome } from '@/shared/layout/bottom-nav'
import { cn } from '@/shared/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { selectTriggerClass } from '@/shared/ui/field-styles'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet'
import { findNft, raisedPrice } from './db/nfts'
import { getDb } from './db/store'
import { SCENARIO_NAMES, type ScenarioName } from './scenarios/names'
import { SCENARIOS } from './scenarios/scenarios'

/**
 * Onde o botão fica no mobile sem cobrir a navegação: acima da barra inferior (73 px) ou da barra
 * de compra do detalhe (161 px), à direita para não cobrir o seletor de edição. No carrinho e no
 * checkout o rodapé inteiro é do resumo fixo, então o botão sobe para o canto superior direito.
 */
const MOBILE_POSITION: Record<MobileChrome, string> = {
  'bottom-nav': 'bottom-[calc(85px+env(safe-area-inset-bottom))] left-3',
  'action-bar': 'bottom-[calc(173px+env(safe-area-inset-bottom))] right-3',
  focused: 'top-4 right-4',
  bare: 'bottom-3 left-3',
}

type Target = { nft: Nft; edition: Edition; where: 'no carrinho' | 'aberto' }

/** A edição do NFT aberto (no detalhe é ela que está na tela); fora dele, o 1º item do carrinho. */
function findTarget(ownerKey: string, pathname: string, edicao: string | undefined): Target | null {
  const openId = /^\/nft\/([^/]+)$/.exec(pathname)?.[1]
  const open = openId ? findNft(decodeURIComponent(openId)) : undefined
  if (open) return { nft: open, edition: selectEdition(open.editions, edicao), where: 'aberto' }
  const item = getDb().carts[ownerKey]?.items[0]
  const nft = item ? findNft(item.nftId) : undefined
  const edition = nft?.editions.find((e) => e.id === item?.editionId)
  return nft && edition ? { nft, edition, where: 'no carrinho' } : null
}

function describe({ nft, edition }: Target): string {
  return `${nft.name} (${EDITION_LABELS[edition.kind]})`
}

function lastPendingOrderId(): string | null {
  return (
    getDb()
      .orders.filter((o) => o.status === 'pending')
      .at(-1)?.id ?? null
  )
}

const control = () => window.__kurioMocks!

const action =
  'h-10 rounded-md border border-line-strong px-3 text-sm text-cream transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50'
const heading = 'text-xs font-bold tracking-[0.15em] text-sand uppercase'

/**
 * Painel de demonstração do backend simulado (só com `VITE_ENABLE_MOCKS=true`): troca o cenário e
 * provoca, pelo `window.__kurioMocks`, os eventos que o avaliador quer ver acontecer na tela.
 */
export default function ScenarioPanel() {
  const { ownerKey } = useSession()
  const location = useRouterState({ select: (s) => s.location })
  const edicao = (location.search as { edicao?: string }).edicao
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<ScenarioName>(() => control().getScenario())
  const [status, setStatus] = useState('')
  // O banco simulado não avisa o React: cada ação pede um novo render para reler o estado.
  const [, setVersion] = useState(0)
  const selectId = useId()
  const descriptionId = useId()

  const current = control().getScenario()
  const target = open ? findTarget(ownerKey, location.pathname, edicao) : null
  const pendingOrderId = open ? lastPendingOrderId() : null

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setChoice(control().getScenario())
      setStatus('')
    }
  }

  function report(message: string) {
    setStatus(message)
    setVersion((v) => v + 1)
  }

  function raisePrice(t: Target) {
    control().mutateNft(t.nft.id, {
      editions: [{ id: t.edition.id, price: raisedPrice(t.edition.price) }],
    })
    report(`Preço de ${describe(t)} subiu 15%.`)
  }

  function sellOut(t: Target) {
    control().mutateNft(t.nft.id, { editions: [{ id: t.edition.id, available: 0 }] })
    report(`${describe(t)} esgotou.`)
  }

  function dropConnection() {
    control().dropSocket({ holdMs: 5000 })
    report('Conexão em tempo real derrubada; ela volta sozinha em 5 s.')
  }

  /** Fecha o painel antes: o resultado do pedido abre um modal (desktop) que não pode ficar por baixo. */
  function settle(orderId: string, result: 'confirmed' | 'declined') {
    setOpen(false)
    control().settleOrder(orderId, result)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        aria-label="Cenários (demo)"
        className={cn(
          'fixed z-40 grid size-11 place-items-center rounded-full border border-line-strong bg-surface-2 text-primary-hi shadow-lg transition-colors hover:bg-line',
          MOBILE_POSITION[mobileChromeOf(location.pathname)],
          'md:top-auto md:right-auto md:bottom-4 md:left-4',
        )}
      >
        <FlaskConicalIcon aria-hidden="true" className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-full max-w-sm gap-0 overflow-y-auto border-line bg-ink text-cream sm:max-w-sm"
      >
        <SheetHeader className="pr-12">
          <SheetTitle className="text-cream">Cenários de demonstração</SheetTitle>
          <SheetDescription className="text-sand">
            Backend simulado no navegador. Trocar o cenário ou resetar recarrega a página.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-8 px-4 pb-8">
          <section className="grid gap-3">
            <h3 className={heading}>Dados</h3>
            <label htmlFor={selectId} className="text-sm">
              Cenário
            </label>
            <Select value={choice} onValueChange={(v) => setChoice(v as ScenarioName)}>
              <SelectTrigger
                id={selectId}
                aria-describedby={descriptionId}
                className={cn(selectTriggerClass, 'w-full')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIO_NAMES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {SCENARIOS[name].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id={descriptionId} className="text-sm text-sand">
              {SCENARIOS[choice].description}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void control().reset(choice)}
                className="h-10 rounded-md bg-primary px-3 text-sm font-bold text-ink transition-colors hover:bg-primary-hi"
              >
                Aplicar cenário
              </button>
              <button type="button" onClick={() => void control().reset()} className={action}>
                Resetar dados
              </button>
            </div>
            <p className="text-xs text-sand">Ativo agora: {SCENARIOS[current].label}</p>
          </section>

          <section className="grid gap-3">
            <h3 className={heading}>Tempo real</h3>
            <p className="text-sm">
              {target
                ? `Alvo: ${describe(target)}, ${target.where}`
                : 'Sem alvo: adicione um item ao carrinho ou abra um NFT.'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!target}
                onClick={() => target && raisePrice(target)}
                className={action}
              >
                Alterar preço (+15%)
              </button>
              <button
                type="button"
                disabled={!target}
                onClick={() => target && sellOut(target)}
                className={action}
              >
                Esgotar edição
              </button>
            </div>
            <button type="button" onClick={dropConnection} className={action}>
              Derrubar conexão (5s)
            </button>
          </section>

          <section className="grid gap-3">
            <h3 className={heading}>Pedido</h3>
            <p className="text-sm break-all">
              {pendingOrderId ? `Pedido pendente: ${pendingOrderId}` : 'Nenhum pedido pendente'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!pendingOrderId}
                onClick={() => pendingOrderId && settle(pendingOrderId, 'confirmed')}
                className={action}
              >
                Confirmar pedido
              </button>
              <button
                type="button"
                disabled={!pendingOrderId}
                onClick={() => pendingOrderId && settle(pendingOrderId, 'declined')}
                className={action}
              >
                Recusar pedido
              </button>
            </div>
          </section>

          <p role="status" className="min-h-5 text-sm text-primary-hi">
            {status}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
