import { useId } from 'react'
import { Link } from '@tanstack/react-router'
import type { Wallet } from '@/contracts'
import { NETWORK_LABELS } from '@/features/catalog/components/filters-panel'
import { cn } from '@/shared/lib/utils'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { shortAddress } from '../labels'

type WalletSelectorProps = {
  wallets: Wallet[]
  /** Carteira escolhida; vazio quando o usuário informa outra carteira. */
  value: string
  onSelect: (wallet: Wallet) => void
  disabled?: boolean
}

/** Carteiras cadastradas como cartões de escolha única (frame Mobile/Pagamento). */
export function WalletSelector({ wallets, value, onSelect, disabled }: WalletSelectorProps) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${id}-title`} className="font-bold">
          Suas carteiras
        </h2>
        {wallets.length > 0 ? (
          <Link
            to="/perfil/carteiras"
            search={{ redirect: '/checkout' }}
            className="text-sm font-bold text-primary-hi hover:underline"
          >
            Trocar carteira
          </Link>
        ) : null}
      </div>
      {wallets.length === 0 ? (
        <div className="mt-3 rounded-[16px] bg-surface px-5 py-4 text-sm">
          <p className="text-sand">Você ainda não tem carteiras cadastradas.</p>
          <Link
            to="/perfil/carteiras"
            search={{ redirect: '/checkout' }}
            className="mt-3 inline-flex h-10 items-center rounded-full border border-primary-hi px-5 font-bold text-primary-hi hover:bg-primary-hi hover:text-ink"
          >
            Cadastrar carteira
          </Link>
        </div>
      ) : (
        <RadioGroup
          value={value}
          onValueChange={(walletId) => {
            const wallet = wallets.find((w) => w.id === walletId)
            if (wallet) onSelect(wallet)
          }}
          disabled={disabled}
          aria-labelledby={`${id}-title`}
          className="mt-3 gap-3"
        >
          {wallets.map((wallet) => {
            const itemId = `${id}-${wallet.id}`
            return (
              <label
                key={wallet.id}
                htmlFor={itemId}
                className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-[16px] border border-transparent bg-surface px-5 py-4',
                  'has-[[data-state=checked]]:border-primary-hi',
                  disabled && 'cursor-not-allowed opacity-70',
                )}
              >
                <RadioGroupItem
                  id={itemId}
                  value={wallet.id}
                  className="size-5 border-primary-hi"
                />
                <span className="grid min-w-0 gap-1">
                  <span className="font-bold">{wallet.nickname}</span>
                  <span className="truncate text-sm text-sand">
                    {wallet.ensName ? `${wallet.ensName}.eth` : shortAddress(wallet.address)}
                  </span>
                  <span className="text-sm text-sand">Rede {NETWORK_LABELS[wallet.network]}</span>
                </span>
              </label>
            )
          })}
        </RadioGroup>
      )}
    </section>
  )
}
