import type { Page, Response } from '@playwright/test'
import type { Cart, Quote } from '../../src/contracts'
import { formatEth } from '../../src/shared/lib/money'
import { expect } from './fixtures'

const isQuote = (r: Response) => r.request().method() === 'POST' && r.url().endsWith('/api/quotes')

/** Guarda a última cotação devolvida pelo servidor, para comparar com o resumo na tela. */
export function trackQuotes(page: Page) {
  const state: { last: Quote | null; byId: Map<string, Quote> } = { last: null, byId: new Map() }
  page.on('response', async (r) => {
    if (!isQuote(r) || r.status() !== 201) return
    // Uma recarga no meio descarta o corpo: essa cotação nem chegou à tela.
    const quote = (await r.json().catch(() => null)) as Quote | null
    if (!quote) return
    state.last = quote
    state.byId.set(quote.id, quote)
  })
  return state
}

export async function addToCart(page: Page, nftId: string): Promise<Cart> {
  await page.goto(`/nft/${nftId}`)
  const added = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/cart/items'),
  )
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  const res = await added
  expect(res.status()).toBe(200)
  await expect(page.getByText(/adicionado ao carrinho/i).first()).toBeVisible()
  return (await res.json()) as Cart
}

export const main = (page: Page) => page.getByRole('main')
export const cartItem = (page: Page, name: string) =>
  main(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name }) })
export const quantityOf = (page: Page, name: string) =>
  cartItem(page, name)
    .getByRole('group', { name: `Quantidade de ${name}` })
    .locator('output')

export async function expectSummaryMatches(page: Page, quotes: { last: Quote | null }) {
  await expect
    .poll(async () => {
      const q = quotes.last
      if (!q) return 'sem cotação'
      const shown = await Promise.all(
        ['subtotal', 'discount', 'fee', 'total'].map((id) =>
          page.getByTestId(`summary-${id}`).textContent(),
        ),
      )
      const expected = [q.subtotal, q.discount, q.networkFee, q.total].map((v) => formatEth(v))
      return shown.every((text, i) => text?.includes(expected[i]!)) ? 'ok' : shown.join(' | ')
    })
    .toBe('ok')
}
