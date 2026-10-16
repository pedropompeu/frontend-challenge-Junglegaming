import type { Page, Response } from '@playwright/test'
import type { Cart, Quote } from '../../src/contracts'
import { formatEth } from '../../src/shared/lib/money'
import { expect, isMobile, login, mocks, test } from './fixtures'

const isQuote = (r: Response) => r.request().method() === 'POST' && r.url().endsWith('/api/quotes')

/** Guarda a última cotação devolvida pelo servidor, para comparar com o resumo na tela. */
function trackQuotes(page: Page) {
  const state: { last: Quote | null } = { last: null }
  page.on('response', async (r) => {
    if (!isQuote(r) || r.status() !== 201) return
    // Uma recarga no meio descarta o corpo: essa cotação nem chegou à tela.
    const quote = (await r.json().catch(() => null)) as Quote | null
    if (quote) state.last = quote
  })
  return state
}

async function addToCart(page: Page, nftId: string): Promise<Cart> {
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

const main = (page: Page) => page.getByRole('main')
const cartItem = (page: Page, name: string) =>
  main(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name }) })
const quantityOf = (page: Page, name: string) =>
  cartItem(page, name)
    .getByRole('group', { name: `Quantidade de ${name}` })
    .locator('output')

async function expectSummaryMatches(page: Page, quotes: { last: Quote | null }) {
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

test('add, change quantity, remove and see coherent summary', async ({ page }) => {
  const quotes = trackQuotes(page)
  await addToCart(page, 'nft_neon-vessel')
  await addToCart(page, 'nft_eco-dourado')
  if (!isMobile(page)) {
    await expect(page.getByRole('link', { name: 'Carrinho, 2 itens' })).toBeVisible()
  }
  await page.goto('/carrinho')
  await expect(cartItem(page, 'Neon Vessel')).toBeVisible()
  await expect(cartItem(page, 'Eco Dourado')).toBeVisible()
  await expectSummaryMatches(page, quotes)

  await cartItem(page, 'Neon Vessel').getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(quantityOf(page, 'Neon Vessel')).toHaveText('2')
  await expect
    .poll(() => quotes.last?.lines.find((l) => l.name === 'Neon Vessel')?.quantity)
    .toBe(2)
  await expectSummaryMatches(page, quotes)

  await cartItem(page, 'Eco Dourado')
    .getByRole('button', { name: 'Remover Eco Dourado do carrinho' })
    .click()
  await expect(cartItem(page, 'Eco Dourado')).toHaveCount(0)
  await expect.poll(() => quotes.last?.lines.length).toBe(1)
  await expectSummaryMatches(page, quotes)
})

test('apply valid, invalid and expired coupon; remove coupon', async ({ page }) => {
  const quotes = trackQuotes(page)
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  const field = main(page).getByLabel('Código promocional')
  const apply = main(page).getByRole('button', { name: 'Aplicar' })

  await field.fill('KURIO99')
  await apply.click()
  await expect(main(page).getByText('Cupom inválido')).toBeVisible()
  await expect(field).toHaveAttribute('aria-invalid', 'true')

  await field.fill('LAUNCH20')
  await apply.click()
  await expect(main(page).getByText(/cupom expirou/i)).toBeVisible()

  await field.fill('kurio10')
  await apply.click()
  await expect(main(page).getByText(/KURIO10 aplicado/)).toBeVisible()
  await expect.poll(() => quotes.last?.coupon?.code).toBe('KURIO10')
  await expectSummaryMatches(page, quotes)

  await page.reload()
  await expect(main(page).getByText(/KURIO10 aplicado/)).toBeVisible()

  await main(page).getByRole('button', { name: 'Remover cupom' }).click()
  await expect(main(page).getByLabel('Código promocional')).toBeVisible()
  await expect.poll(() => quotes.last?.coupon).toBeNull()
  await expectSummaryMatches(page, quotes)
})

test('cart survives reload', async ({ page }) => {
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  await expect(cartItem(page, 'Neon Vessel')).toBeVisible()
  await page.reload()
  await expect(cartItem(page, 'Neon Vessel')).toBeVisible()
  await expect(quantityOf(page, 'Neon Vessel')).toHaveText('1')
})

test('guest cart is preserved on login', async ({ page }) => {
  await addToCart(page, 'nft_neon-vessel')
  await addToCart(page, 'nft_eco-dourado')
  await page.goto('/carrinho')
  await main(page).getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fcheckout/)
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/checkout$/)
  await page.goto('/carrinho')
  await expect(cartItem(page, 'Neon Vessel')).toBeVisible()
  await expect(cartItem(page, 'Eco Dourado')).toBeVisible()
})

test('adding beyond available stock is rejected and explained', async ({ page }) => {
  const cart = await addToCart(page, 'nft_neon-vessel')
  const item = cart.items[0]!
  await page.goto('/carrinho')
  const plus = cartItem(page, 'Neon Vessel').getByRole('button', { name: 'Aumentar quantidade' })

  // Conflito forçado: a quantidade volta e o motivo aparece no item.
  await mocks(page).failNext('PATCH /cart/items/:itemId', {
    status: 409,
    code: 'AVAILABILITY_CONFLICT',
  })
  // Depois do 409 o carrinho é refeito; o estoque só muda quando esse refetch terminar.
  let rejected = false
  page.on('response', (r) => {
    if (r.request().method() === 'PATCH' && r.status() === 409) rejected = true
  })
  const refetch = page.waitForRequest(
    (r) => rejected && r.method() === 'GET' && r.url().endsWith('/api/cart'),
  )
  await plus.click()
  await (await refetch).response()
  await expect(
    cartItem(page, 'Neon Vessel').getByText(/Só resta(m)? \d+ unidades? desta edição/),
  ).toBeVisible()
  await expect(quantityOf(page, 'Neon Vessel')).toHaveText('1')

  // Conflito real: o estoque cai para 1 no servidor e o carrinho ainda não sabe.
  await mocks(page).mutateNft(item.nftId, { editions: [{ id: item.editionId, available: 1 }] })
  await plus.click()
  await expect(
    cartItem(page, 'Neon Vessel').getByText('Só resta 1 unidade desta edição'),
  ).toBeVisible()
  await expect(quantityOf(page, 'Neon Vessel')).toHaveText('1')
  // O stepper passa a respeitar o estoque novo.
  await expect(plus).toBeDisabled()
})

test('summary shows skeleton while loading', async ({ page }) => {
  // Trocar de cenário recria o banco simulado: o cenário vem antes do item no carrinho.
  await page.goto('/?scenario=slow')
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-summary-skeleton')).toBeVisible()
  await expect(page.getByTestId('summary-total')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('cart-summary-skeleton')).toHaveCount(0)
})

test('empty cart state', async ({ page }) => {
  await page.goto('/carrinho')
  await expect(main(page).getByText(/seu carrinho está vazio/i)).toBeVisible()
  await expect(main(page).getByRole('link', { name: /explorar o mercado/i })).toBeVisible()
})
