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
      className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-bold text-primary-hi xl:hidden"
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
      <h2
        id={`${id}-title`}
        className="font-bold md:text-center md:text-lg xl:text-[17px] xl:leading-6"
      >
        Carteira e rede
      </h2>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as WalletProvider)}
        disabled={disabled}
        aria-labelledby={`${id}-title`}
        className="mt-3 gap-3 xl:mt-4 xl:gap-[17px]"
      >
        {PROVIDERS.map((provider) => {
          const itemId = `${id}-${provider}`
          return (
            <div
              key={provider}
              className="flex items-center gap-3 rounded-[16px] border border-transparent bg-surface px-4 py-3 has-[[data-state=checked]]:border-primary-hi md:rounded-none md:border-line md:bg-transparent xl:h-11 xl:gap-2.5 xl:rounded-[2.5px] xl:px-3 xl:py-0 xl:has-[[data-state=checked]]:border-primary"
            >
              <ProviderMark provider={provider} />
              <label htmlFor={itemId} className="flex-1 cursor-pointer text-[15px]">
                {PROVIDER_LABELS[provider]}
              </label>
              {provider === 'walletconnect' ? (
                <span
                  aria-hidden="true"
                  className="hidden rounded-md border border-primary/60 bg-band px-2 py-1 text-[9px] font-bold tracking-wide text-primary-hi uppercase xl:inline xl:border-line-strong xl:leading-[15px]"
                >
                  MetaMask • WalletConnect • Coinbase
                </span>
              ) : null}
              {/* No desktop o frame põe o radio à esquerda e dispensa a marca do provedor. */}
              <RadioGroupItem
                id={itemId}
                value={provider}
                className="size-5 border-primary-hi xl:order-first xl:size-4 xl:border-primary"
              />
            </div>
          )
        })}
      </RadioGroup>
    </section>
  )
}
