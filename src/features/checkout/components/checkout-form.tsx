import { useId, type ReactNode } from 'react'
import { useFormContext, useWatch, type FieldPath } from 'react-hook-form'
import type { Network, WalletProvider } from '@/contracts'
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
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { PROVIDER_LABELS } from '../labels'
import { NOTE_MAX, type CheckoutFormValues } from '../schemas'
import { inputClass, selectTriggerClass } from './field-styles'
import { NetworkSelector } from './network-selector'

type TextName = Exclude<
  FieldPath<CheckoutFormValues>,
  'network' | 'useCustomWallet' | 'walletType' | 'provider'
>

/** Rótulo com asterisco fora do `<label>`: o nome acessível fica só com o texto. */
function FieldLabel({
  children,
  required,
  srOnly,
}: {
  children: ReactNode
  required?: boolean
  srOnly?: boolean
}) {
  return (
    <div className={cn('flex items-baseline gap-3', srOnly && 'sr-only')}>
      <FormLabel className="text-[15px] font-normal text-cream">{children}</FormLabel>
      {required ? (
        <span aria-hidden="true" className="text-coral">
          *
        </span>
      ) : null}
    </div>
  )
}

type TextFieldProps = {
  name: TextName
  label: string
  required?: boolean
  srOnlyLabel?: boolean
  placeholder?: string
  autoComplete?: string
  readOnly?: boolean
  description?: string
  suffix?: string
}

function TextField({
  name,
  label,
  required,
  srOnlyLabel,
  placeholder,
  autoComplete,
  readOnly,
  description,
  suffix,
}: TextFieldProps) {
  const { control } = useFormContext<CheckoutFormValues>()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="content-start">
          <FieldLabel required={required} srOnly={srOnlyLabel}>
            {label}
          </FieldLabel>
          <div className="flex items-center">
            <FormControl>
              <Input
                {...field}
                value={field.value as string}
                placeholder={placeholder}
                autoComplete={autoComplete ?? 'off'}
                readOnly={readOnly}
                aria-required={required ? true : undefined}
                className={cn(inputClass, suffix && 'max-w-56')}
              />
            </FormControl>
            {suffix ? (
              <span aria-hidden="true" className="ml-2 text-sand">
                {suffix}
              </span>
            ) : null}
          </div>
          {description ? (
            <FormDescription className="text-xs text-sand">{description}</FormDescription>
          ) : null}
          <FormMessage className="text-xs font-bold text-coral" />
        </FormItem>
      )}
    />
  )
}

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
        <TextField name="displayName" label="Nome de exibição" required autoComplete="name" />
        <TextField name="username" label="Nome de usuário" required autoComplete="username" />
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
              <FormMessage className="text-xs font-bold text-coral" />
            </FormItem>
          )}
        />
        <TextField name="profileName" label="Nome do perfil" required />
        <TextField
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
          name="secondaryAddress"
          label="ENS ou carteira secundária (opcional)"
          srOnlyLabel
          placeholder="ENS ou carteira secundária (opcional)"
          readOnly={lockedWallet}
        />
        <FormField
          control={form.control}
          name="walletType"
          render={({ field }) => (
            <FormItem className="content-start">
              <FieldLabel required>Tipo de carteira</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v as WalletProvider)}
                disabled={lockedWallet}
              >
                <FormControl>
                  <SelectTrigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-required="true"
                    className={selectTriggerClass}
                  >
                    <SelectValue placeholder="Selecione uma carteira" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(PROVIDER_LABELS) as WalletProvider[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDER_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs font-bold text-coral" />
            </FormItem>
          )}
        />
        <TextField name="referralCode" label="Código de indicação" />
        <TextField name="email" label="E-mail" required autoComplete="email" />
        <TextField name="ensName" label="Nome ENS" suffix=".eth" />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Checkbox
          id={`${ids}-custom`}
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
                className="w-full resize-y border border-line-strong bg-transparent px-4 py-3 text-base text-cream outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-[15px]"
              />
            </FormControl>
            <FormDescription
              className={cn('text-right text-xs text-sand', note.length > NOTE_MAX && 'text-coral')}
            >
              {note.length}/{NOTE_MAX}
            </FormDescription>
            <FormMessage className="text-xs font-bold text-coral" />
          </FormItem>
        )}
      />
    </form>
  )
}
