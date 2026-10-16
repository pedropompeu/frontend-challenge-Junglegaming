import { useId } from 'react'
import { WalletIcon } from 'lucide-react'
import type { WalletProvider } from '@/contracts'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { PROVIDER_LABELS } from '../labels'

const PROVIDERS: WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

function ProviderMark({ provider }: { provider: WalletProvider }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-bold text-primary-hi"
    >
      {provider === 'coinbase' ? <WalletIcon className="size-5" /> : PROVIDER_LABELS[provider][0]}
    </span>
  )
}

type ProviderSelectorProps = {
  value: WalletProvider
  onChange: (provider: WalletProvider) => void
  disabled?: boolean
}

/** "Carteira e rede": por qual provedor (extensão/app) a carteira é conectada. */
export function ProviderSelector({ value, onChange, disabled }: ProviderSelectorProps) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-bold md:text-center md:text-lg">
        Carteira e rede
      </h2>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as WalletProvider)}
        disabled={disabled}
        aria-labelledby={`${id}-title`}
        className="mt-3 gap-3"
      >
        {PROVIDERS.map((provider) => {
          const itemId = `${id}-${provider}`
          return (
            <div
              key={provider}
              className="flex items-center gap-3 rounded-[16px] border border-transparent bg-surface px-4 py-3 has-[[data-state=checked]]:border-primary-hi md:rounded-none md:border-line-strong md:bg-transparent"
            >
              <ProviderMark provider={provider} />
              <label htmlFor={itemId} className="flex-1 cursor-pointer text-[15px]">
                {PROVIDER_LABELS[provider]}
              </label>
              {provider === 'walletconnect' ? (
                <span
                  aria-hidden="true"
                  className="hidden rounded-md border border-primary/60 bg-band px-2 py-1 text-[9px] font-bold tracking-wide text-primary-hi uppercase xl:inline"
                >
                  MetaMask • WalletConnect • Coinbase
                </span>
              ) : null}
              <RadioGroupItem id={itemId} value={provider} className="size-5 border-primary-hi" />
            </div>
          )
        })}
      </RadioGroup>
    </section>
  )
}
