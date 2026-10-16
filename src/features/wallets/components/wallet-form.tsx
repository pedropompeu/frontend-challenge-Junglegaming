import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { UpsertWalletBody, Wallet, WalletSlot } from '@/contracts'
import { applyServerFieldErrors } from '@/features/auth/form-errors'
import { NETWORK_LABELS } from '@/features/catalog/components/filters-panel'
import { PROVIDER_LABELS } from '@/features/checkout/labels'
import { errorMessage } from '@/shared/lib/api-error'
import { Form } from '@/shared/ui/form'
import { SelectField, TextField } from '@/shared/ui/form-fields'
import { useSaveWallet } from '../queries'
import {
  WALLET_SLOT_TITLES,
  WalletFormSchema,
  walletFormValues,
  type WalletFormValues,
} from '../schemas'

type WalletFormProps = {
  slot: WalletSlot
  userId: string
  defaultValues: WalletFormValues
  onSaved: (wallet: Wallet) => void
}

/** Campos do frame Desktop/Carteiras; "Salvar carteira" grava o slot com `PUT /wallets/{slot}`. */
export function WalletForm({ slot, userId, defaultValues, onSaved }: WalletFormProps) {
  const form = useForm({ resolver: zodResolver(WalletFormSchema), defaultValues })
  const saveWallet = useSaveWallet(userId)

  async function submit(body: UpsertWalletBody) {
    try {
      const wallet = await saveWallet.mutateAsync({ slot, body })
      form.reset(walletFormValues(wallet))
      toast.success(`${WALLET_SLOT_TITLES[slot]} salva`)
      onSaved(wallet)
    } catch (error) {
      if (!applyServerFieldErrors(form, error)) {
        toast.error(errorMessage(error, 'Não foi possível salvar a carteira'))
      }
    }
  }

  const { control } = form
  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(submit)}
        className="grid gap-x-7 gap-y-5 md:grid-cols-2 md:gap-y-8"
      >
        <TextField
          control={control}
          name="displayName"
          label="Nome de exibição"
          required
          autoComplete="name"
        />
        <TextField control={control} name="nickname" label="Apelido da carteira" required />
        <SelectField
          control={control}
          name="network"
          label="Rede"
          required
          options={NETWORK_LABELS}
          placeholder="Selecione uma rede"
        />
        <TextField control={control} name="profileName" label="Nome do perfil" required />
        <TextField
          control={control}
          name="address"
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
        />
        <TextField
          control={control}
          name="secondaryAddress"
          label="ENS ou carteira secundária (opcional)"
          srOnlyLabel
          placeholder="ENS ou carteira secundária (opcional)"
        />
        <SelectField
          control={control}
          name="walletType"
          label="Tipo de carteira"
          required
          options={PROVIDER_LABELS}
          placeholder="Selecione uma carteira"
        />
        <TextField control={control} name="referralCode" label="Código de indicação" />
        <TextField
          control={control}
          name="email"
          label="E-mail"
          type="email"
          required
          autoComplete="email"
        />
        <TextField control={control} name="ensName" label="Nome ENS" prefix=".eth" />
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saveWallet.isPending}
            className="h-10 min-w-[131px] bg-primary px-6 text-[15px] font-bold text-ink transition-colors hover:bg-primary-hi disabled:cursor-wait disabled:opacity-70"
          >
            {saveWallet.isPending ? 'Salvando…' : 'Salvar carteira'}
          </button>
        </div>
      </form>
    </Form>
  )
}
