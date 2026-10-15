import { describe, expect, it } from 'vitest'
import { add, cmp, formatEth, mul, pct, sub } from '@/shared/lib/money'

describe('money', () => {
  it('adds decimals exactly', () => {
    expect(add('0.1', '0.2')).toBe('0.3')
    expect(add('1', '2', '3.5')).toBe('6.5')
  })
  it('subtracts exactly', () => {
    expect(sub('2.8333', '0.28333')).toBe('2.54997')
  })
  it('multiplies by integer quantity with full precision', () => {
    expect(mul('1.234567890123456789', 3)).toBe('3.703703670370370367')
  })
  it('computes percentages rounded to 6 decimals', () => {
    expect(pct('8.9', 10)).toBe('0.89')
    expect(pct('0.3333333', 10)).toBe('0.033333')
  })
  it('compares numerically', () => {
    expect(cmp('1.10', '1.1')).toBe(0)
    expect(cmp('2', '10')).toBe(-1)
    expect(cmp('0.5', '0.25')).toBe(1)
  })
  it('formats as ETH with up to 4 decimals and no trailing zeros', () => {
    expect(formatEth('8.936000')).toBe('8.936 ETH')
    expect(formatEth('1.23456789')).toBe('1.2346 ETH')
    expect(formatEth('2')).toBe('2 ETH')
    expect(formatEth('0.00001')).toBe('0.00001 ETH')
    expect(formatEth('1.23456789', { maxDecimals: 6 })).toBe('1.234568 ETH')
  })
})
