import Big from 'big.js'

Big.DP = 30
Big.RM = Big.roundHalfUp

/** Serializa sem notação científica e sem zeros à direita. */
function toPlain(b: Big): string {
  const s = b.toFixed()
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

export function add(...values: string[]): string {
  return toPlain(values.reduce((acc, v) => acc.plus(v), new Big(0)))
}

export function sub(a: string, b: string): string {
  return toPlain(new Big(a).minus(b))
}

export function mul(a: string, qty: number): string {
  return toPlain(new Big(a).times(qty))
}

/** Percentual de um valor, arredondado a 6 casas (ROUND_HALF_UP). */
export function pct(a: string, percent: number): string {
  return toPlain(new Big(a).times(percent).div(100).round(6, Big.roundHalfUp))
}

export function cmp(a: string, b: string): -1 | 0 | 1 {
  return new Big(a).cmp(b) as -1 | 0 | 1
}

export function formatEth(value: string, opts: { maxDecimals?: number } = {}): string {
  const big = new Big(value)
  const max = opts.maxDecimals ?? 4
  const rounded = big.round(max, Big.roundHalfUp)
  // Valores muito pequenos não viram "0 ETH": mostram a precisão necessária.
  const shown = rounded.eq(0) && !big.eq(0) ? big : rounded
  return `${toPlain(shown)} ETH`
}
