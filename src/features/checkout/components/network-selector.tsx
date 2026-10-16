import type { Network } from '@/contracts'
import { NETWORK_LABELS } from '@/features/catalog/components/filters-panel'
import { FormControl } from '@/shared/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { selectTriggerClass } from './field-styles'

type NetworkSelectorProps = {
  value: Network
  onChange: (network: Network) => void
  onBlur?: () => void
}

/** Rede do pedido: muda a taxa da cotação e o formato de endereço aceito. */
export function NetworkSelector({ value, onChange, onBlur }: NetworkSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Network)}>
      <FormControl>
        <SelectTrigger onBlur={onBlur} aria-required="true" className={selectTriggerClass}>
          <SelectValue placeholder="Selecione uma rede" />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
          <SelectItem key={n} value={n}>
            {NETWORK_LABELS[n]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
