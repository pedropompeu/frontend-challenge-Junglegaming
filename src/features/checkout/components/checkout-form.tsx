import { useId } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { Network } from '@/contracts'
import { cn } from '@/shared/lib/utils'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form'
import { FieldLabel, SelectField, TextField } from '@/shared/ui/form-fields'
import { Label } from '@/shared/ui/label'
import { PROVIDER_LABELS } from '../labels'
import { NOTE_MAX, type CheckoutFormValues } from '../schemas'
import { fieldErrorClass } from '@/shared/ui/field-styles'
import { NetworkSelector } from './network-selector'

type CheckoutFormProps = {
  id: string
  onValid: (values: CheckoutFormValues) => void
  onNetworkChange: (network: Network) => void
  onUseCustomWalletChange: (useCustom: boolean) => void
  hasWallets: boolean
}

/** "Perfil do colecionador" (frame Desktop/Pagamento): dados do comprador e da carteira. */
export function CheckoutForm({
  id,
  onValid,
  onNetworkChange,
  onUseCustomWalletChange,
  hasWallets,
}: CheckoutFormProps) {
  const form = useFormContext<CheckoutFormValues>()
  const useCustom = useWatch({ control: form.control, name: 'useCustomWallet' })
  const note = useWatch({ control: form.control, name: 'note' })
  const ids = useId()
  const lockedWallet = !useCustom

  return (
    <form id={id} noValidate onSubmit={form.handleSubmit(onValid)} aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} className="text-lg font-bold">
        Perfil do colecionador
      </h2>
      <div className="mt-4 grid gap-x-6 gap-y-5 md:grid-cols-2">
        <TextField
          control={form.control}
          name="displayName"
          label="Nome de exibição"
          required
          autoComplete="name"
        />
        <TextField
          control={form.control}
          name="username"
          label="Nome de usuário"
          required
          autoComplete="username"
        />
        <FormField
          control={form.control}
          name="network"
          render={({ field }) => (
            <FormItem className="content-start">
              <FieldLabel required>Rede</FieldLabel>
              <NetworkSelector
                value={field.value}
                onBlur={field.onBlur}
                onChange={(network) => {
                  field.onChange(network)
                  onNetworkChange(network)
                }}
              />
              <FormMessage className={fieldErrorClass} />
            </FormItem>
          )}
        />
        <TextField control={form.control} name="profileName" label="Nome do perfil" required />
        <TextField
          control={form.control}
          name="walletAddress"
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          readOnly={lockedWallet}
          description={
            lockedWallet && hasWallets
              ? 'Da carteira escolhida. Para usar outra, marque “Usar outra carteira?”.'
              : undefined
          }
        />
        <TextField
          control={form.control}
          name="secondaryAddress"
          label="ENS ou carteira secundária (opcional)"
          srOnlyLabel
          placeholder="ENS ou carteira secundária (opcional)"
          readOnly={lockedWallet}
        />
        <SelectField
          control={form.control}
          name="walletType"
          label="Tipo de carteira"
          required
          options={PROVIDER_LABELS}
          placeholder="Selecione uma carteira"
          disabled={lockedWallet}
        />
        <TextField control={form.control} name="referralCode" label="Código de indicação" />
        <TextField
          control={form.control}
          name="email"
          label="E-mail"
          required
          autoComplete="email"
        />
        <TextField control={form.control} name="ensName" label="Nome ENS" prefix=".eth" />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Checkbox
          id={`${ids}-custom`}
          name="useCustomWallet"
          checked={useCustom}
          // Sem carteira cadastrada não há para onde voltar: a avulsa é a única opção.
          disabled={!hasWallets}
          onCheckedChange={(v) => onUseCustomWalletChange(v === true)}
          className="size-5 rounded-full border-primary-hi"
        />
        <Label htmlFor={`${ids}-custom`} className="text-[15px] font-normal">
          Usar outra carteira?
        </Label>
      </div>

      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem className="mt-6 md:max-w-[350px]">
            <FormLabel className="text-[15px] font-normal text-cream">
              Observação do colecionador (opcional)
            </FormLabel>
            <FormControl>
              <textarea
                {...field}
                rows={6}
                className="w-full resize-y border border-line-strong bg-transparent px-4 py-3 text-base text-cream focus-visible:border-ring aria-invalid:border-destructive md:text-[15px]"
              />
            </FormControl>
            <FormDescription
              className={cn('text-right text-xs text-sand', note.length > NOTE_MAX && 'text-coral')}
            >
              {note.length}/{NOTE_MAX}
            </FormDescription>
            <FormMessage className={fieldErrorClass} />
          </FormItem>
        )}
      />
    </form>
  )
}
