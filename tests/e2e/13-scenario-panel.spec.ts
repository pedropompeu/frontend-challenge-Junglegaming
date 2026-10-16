import type { Page } from '@playwright/test'
import Big from 'big.js'
import { formatEth } from '../../src/shared/lib/money'
import { cartItem, main } from './cart-helpers'
import { openCheckout, placeOrder } from './checkout-helpers'
import { expect, isMobile, mocks, test } from './fixtures'
import { addToCart } from './helpers/mocks'

async function openPanel(page: Page) {
  await page.getByRole('button', { name: 'Cenários (demo)' }).click()
  const panel = page.getByRole('dialog', { name: 'Cenários de demonstração' })
  await expect(panel).toBeVisible()
  return panel
}

test('scenario panel applies a scenario and resets the data', async ({ page }) => {
  await addToCart(page, 'nft_neon-vessel')
  let panel = await openPanel(page)
  const select = panel.getByRole('combobox', { name: 'Cenário' })
  await expect(select).toHaveText('Padrão')
  await select.click()
  await page.getByRole('option', { name: 'Catálogo vazio' }).click()
  await expect(panel.getByText('A listagem volta sempre vazia.')).toBeVisible()
  // Escolher no select não troca nada sozinho: só o botão aplica (e recarrega a página).
  expect(await mocks(page).getScenario()).toBe('default')
  await Promise.all([
    page.waitForEvent('load'),
    panel.getByRole('button', { name: 'Aplicar cenário' }).click(),
  ])
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  expect(await mocks(page).getScenario()).toBe('empty-catalog')

  panel = await openPanel(page)
  await expect(panel.getByRole('combobox', { name: 'Cenário' })).toHaveText('Catálogo vazio')
  await Promise.all([
    page.waitForEvent('load'),
    panel.getByRole('button', { name: 'Resetar dados' }).click(),
  ])
  await page.goto('/carrinho')
  // O banco foi recriado: o carrinho do visitante voltou vazio e o cenário ficou o mesmo.
  await expect(main(page).getByText(/seu carrinho está vazio/i)).toBeVisible()
  expect(await mocks(page).getScenario()).toBe('empty-catalog')
})

test('scenario panel raises a cart price and sells out the open edition', async ({ page }) => {
  const cart = await addToCart(page, 'nft_neon-vessel')
  const price = cart.items[0]!.unitPrice
  await page.goto('/carrinho')
  const row = cartItem(page, 'Neon Vessel')
  await expect(row.getByText(formatEth(price)).first()).toBeVisible()

  let panel = await openPanel(page)
  await expect(panel.getByText('Alvo: Neon Vessel (1/10), no carrinho')).toBeVisible()
  await panel.getByRole('button', { name: 'Alterar preço (+15%)' }).click()
  await expect(panel.getByRole('status')).toHaveText('Preço de Neon Vessel (1/10) subiu 15%.')
  await page.keyboard.press('Escape')
  const raised = new Big(price).times(1.15).round(4, Big.roundHalfUp).toFixed()
  await expect(row.getByText(formatEth(raised)).first()).toBeVisible()
  await expect(row.getByText('Preço atualizado')).toBeVisible()

  // No detail, sem passar pelo carrinho: o alvo é a edição aberta.
  await page.goto('/nft/nft_eco-dourado')
  panel = await openPanel(page)
  await expect(panel.getByText(/^Alvo: Eco Dourado \(.+\), aberto$/)).toBeVisible()
  await panel.getByRole('button', { name: 'Esgotar edição' }).click()
  await expect(panel.getByRole('status')).toContainText('esgotou')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('edition-available')).toHaveText('Sem unidades disponíveis')
})

test('scenario panel drops the live connection for 5 seconds', async ({ page }) => {
  await page.goto('/')
  await expect.poll(async () => (await mocks(page).connections()).length).toBeGreaterThan(0)
  const panel = await openPanel(page)
  await panel.getByRole('button', { name: 'Derrubar conexão (5s)' }).click()
  await expect.poll(async () => (await mocks(page).connections()).length).toBe(0)
  await expect
    .poll(async () => (await mocks(page).connections()).length, { timeout: 15_000 })
    .toBeGreaterThan(0)
})

test('scenario panel settles the pending order', async ({ page }) => {
  await openCheckout(page, { scenario: 'payment-confirmed' })
  const order = await placeOrder(page)
  const panel = await openPanel(page)
  await expect(panel.getByText(`Pedido pendente: ${order.id}`)).toBeVisible()
  await panel.getByRole('button', { name: 'Confirmar pedido' }).click()
  // O painel se fecha para a confirmação (no desktop, um modal) não abrir por baixo dele.
  await expect(panel).toBeHidden()
  const confirmed = page.getByRole('heading', { name: 'Pedido confirmado' })
  await expect(confirmed).toBeVisible()
  if (!isMobile(page)) {
    // O modal de confirmação esconde o resto da página; fechado, o botão do painel volta.
    await page.keyboard.press('Escape')
    await expect(confirmed).toBeHidden()
  }

  const again = await openPanel(page)
  await expect(again.getByText('Nenhum pedido pendente')).toBeVisible()
  await expect(again.getByRole('button', { name: 'Recusar pedido' })).toBeDisabled()
})
