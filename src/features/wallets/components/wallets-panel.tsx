import { useId, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { User, Wallet } from '@/contracts'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import { newWalletFormValues, walletFormValues } from '../schemas'
import { WalletForm } from './wallet-form'

type WalletsPanelProps = {
  user: User
  wallets: Wallet[]
  /** Quem veio do checkout volta para lá depois de salvar. */
  redirect?: string
}

const headerAction = 'text-[15px] text-primary-hi hover:text-cream'

/**
 * Frame Desktop/Carteiras. A principal tem sempre o formulário aberto (vazio até ser criada);
 * a secundária abre por "Adicionar" ou por "Igual à carteira principal", que copia a principal.
 */
export function WalletsPanel({ user, wallets, redirect }: WalletsPanelProps) {
  const id = useId()
  const router = useRouter()
  const primary = wallets.find((w) => w.slot === 'primary')
  const secondary = wallets.find((w) => w.slot === 'secondary')
  const [adding, setAdding] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const copying = sameAsPrimary && primary !== undefined

  function afterSave() {
    if (redirect) void router.navigate({ href: redirect, replace: true })
  }

  // A `key` troca o formulário inteiro quando a origem dos valores muda (cópia, salva, nova).
  let secondaryForm = null
  if (copying) {
    secondaryForm = { key: 'copy', values: walletFormValues(primary) }
  } else if (secondary) {
    secondaryForm = { key: 'saved', values: walletFormValues(secondary) }
  } else if (adding) {
    secondaryForm = { key: 'new', values: newWalletFormValues(user) }
  }

  return (
    <div className="grid gap-10">
      <section aria-labelledby={`${id}-primary`} className="grid gap-6">
        <div>
          <h2 id={`${id}-primary`} className="text-lg font-bold">
            Carteira principal
          </h2>
          <p className="mt-1 text-sm text-sand">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
          </p>
        </div>
        <WalletForm
          key={primary ? 'saved' : 'new'}
          slot="primary"
          userId={user.id}
          defaultValues={primary ? walletFormValues(primary) : newWalletFormValues(user)}
          onSaved={afterSave}
        />
      </section>

      <section aria-labelledby={`${id}-secondary`} className="grid gap-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <h2 id={`${id}-secondary`} className="mr-auto text-lg font-bold">
            Carteira secundária
          </h2>
          <div className="flex items-center gap-3">
            <Checkbox
              id={`${id}-same`}
              name="sameAsPrimary"
              checked={copying}
              disabled={!primary}
              onCheckedChange={(checked) => setSameAsPrimary(checked === true)}
              className="size-5 rounded-full border-primary-hi"
            />
            <Label htmlFor={`${id}-same`} className="text-[15px] font-normal">
              Igual à carteira principal
            </Label>
          </div>
          {secondary ? null : secondaryForm ? (
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setSameAsPrimary(false)
              }}
              className={headerAction}
            >
              Cancelar
            </button>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className={headerAction}>
              Adicionar<span className="sr-only"> carteira secundária</span>
            </button>
          )}
        </div>
        {secondaryForm ? (
          <WalletForm
            key={secondaryForm.key}
            slot="secondary"
            userId={user.id}
            defaultValues={secondaryForm.values}
            onSaved={() => {
              setAdding(false)
              setSameAsPrimary(false)
              afterSave()
            }}
          />
        ) : (
          <p className="text-sm text-sand">Você ainda não adicionou uma carteira secundária.</p>
        )}
      </section>
    </div>
  )
}
