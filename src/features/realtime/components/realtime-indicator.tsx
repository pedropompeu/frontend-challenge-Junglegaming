import { cn } from '@/shared/lib/utils'
import { useRealtimeStatus, type RealtimeStatus } from '../use-realtime-status'

const LABELS: Record<RealtimeStatus, string> = {
  connecting: 'Conectando…',
  connected: 'Ao vivo',
  reconnecting: 'Reconectando…',
  offline: 'Offline',
}

const DOT: Record<RealtimeStatus, string> = {
  connecting: 'bg-khaki',
  connected: 'bg-primary-hi',
  reconnecting: 'bg-coral motion-safe:animate-pulse',
  offline: 'bg-coral',
}

const TITLES: Record<RealtimeStatus, string> = {
  connecting: 'Conectando às atualizações de preço e estoque',
  connected: 'Preços e estoque atualizam sozinhos',
  reconnecting: 'Conexão perdida; os dados são conferidos ao voltar',
  offline: 'Sem atualizações automáticas; os dados podem estar desatualizados',
}

function Dot({ status }: { status: RealtimeStatus }) {
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', DOT[status])} />
}

/** Indicador discreto do header (a partir de `lg`): sempre visível, com texto além da cor. */
export function RealtimeIndicator() {
  const status = useRealtimeStatus()
  return (
    <p
      title={TITLES[status]}
      className="hidden items-center gap-2 text-xs font-bold whitespace-nowrap text-sand lg:flex"
    >
      <Dot status={status} />
      <span className="sr-only">Tempo real: </span>
      {LABELS[status]}
    </p>
  )
}

/**
 * Abaixo de `lg` (mobile sem header no Figma; tablet sem espaço no header) o status só
 * aparece quando há problema.
 */
export function RealtimeStatusPill() {
  const status = useRealtimeStatus()
  const problem = status === 'reconnecting' || status === 'offline'
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center md:top-[76px] lg:hidden"
    >
      {problem ? (
        <p className="flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-bold text-cream shadow-lg">
          <Dot status={status} />
          {status === 'offline' ? 'Sem atualizações ao vivo' : LABELS[status]}
        </p>
      ) : null}
    </div>
  )
}
