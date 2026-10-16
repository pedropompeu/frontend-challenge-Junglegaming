import type { WalletSession } from '@/contracts'
import { cn } from '@/shared/lib/utils'
import { PROVIDER_LABELS, shortAddress } from '../labels'
import type { WalletSessionStatus } from '../wallet-session'

const MESSAGES: Record<WalletSessionStatus, string> = {
  idle: 'Carteira não conectada',
  connecting: 'Conectando carteira…',
  connected: 'Carteira conectada',
  rejected: 'Conexão recusada na carteira',
  disconnected: 'Carteira desconectada',
}

type WalletStatusProps = {
  status: WalletSessionStatus
  session: WalletSession | null
  /** Por que não dá para conectar agora (ex.: endereço inválido); some quando pode. */
  blockedReason: string | null
  onConnect: () => void
  onDisconnect: () => void
}

/** Estado da conexão simulada e a ação possível (conectar ou desconectar). */
export function WalletStatus({
  status,
  session,
  blockedReason,
  onConnect,
  onDisconnect,
}: WalletStatusProps) {
  const connected = status === 'connected' && session !== null
  const problem = status === 'rejected' || status === 'disconnected'
  return (
    <div className="grid gap-3">
      <p
        role="status"
        data-testid="wallet-status"
        className={cn(
          'flex flex-wrap items-center gap-x-2 rounded-[10px] bg-surface px-4 py-3 text-sm',
          connected && 'text-primary-hi',
          problem && 'text-coral',
        )}
      >
        <span className="font-bold">{MESSAGES[status]}</span>
        {connected ? (
          <span className="text-sand">
            {shortAddress(session.address)} · {PROVIDER_LABELS[session.provider]}
          </span>
        ) : null}
        {status === 'rejected' ? (
          <span className="text-sand">Aprove o acesso na carteira e tente de novo.</span>
        ) : null}
      </p>
      {connected ? (
        <button
          type="button"
          onClick={onDisconnect}
          className="h-10 rounded-full border border-line text-sm font-bold text-sand hover:text-cream md:rounded-md"
        >
          Desconectar
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onConnect}
            disabled={status === 'connecting' || blockedReason !== null}
            className="h-11 rounded-full border border-primary-hi text-sm font-bold text-primary-hi transition-colors hover:bg-primary-hi hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 md:rounded-md"
          >
            {status === 'connecting' ? 'Conectando…' : 'Conectar carteira'}
          </button>
          {blockedReason ? <p className="text-xs text-sand">{blockedReason}</p> : null}
        </>
      )}
    </div>
  )
}
