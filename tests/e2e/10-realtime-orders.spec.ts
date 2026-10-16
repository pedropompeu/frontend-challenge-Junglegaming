import type { Page } from '@playwright/test'
import type { Order } from '../../src/contracts'
import { formatEth } from '../../src/shared/lib/money'
import { countOrderPosts, openCheckout, placeOrder } from './checkout-helpers'
import { expect, mocks, test } from './fixtures'

const confirmedHeading = (page: Page) => page.getByRole('heading', { name: 'Pedido confirmado' })
const thankYou = (page: Page) => page.getByRole('img', { name: 'Thank you' })
const waitingNetwork = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Aguardando confirmação da rede…' })

/** Pedido criado no cenário de liquidação manual: fica pendente até o teste decidir. */
async function pendingOrder(page: Page): Promise<Order> {
  await openCheckout(page, { scenario: 'payment-confirmed' })
  const order = await placeOrder(page)
  await expect(waitingNetwork(page)).toBeVisible()
  return order
}

async function confirmedOrder(page: Page): Promise<Order> {
  const order = await pendingOrder(page)
  await mocks(page).settleOrder(order.id, 'confirmed')
  await expect(confirmedHeading(page)).toBeVisible()
  return order
}

test('duplicate and old events do not regress state', async ({ page }) => {
  const order = await confirmedOrder(page)
  const m = mocks(page)
  const settled = (await m.events()).find(
    (e) => e.type === 'order.updated' && e.resource.id === order.id,
  )
  expect(settled, 'o servidor emitiu order.updated na liquidação').toBeDefined()
  // Duas versões novas do NFT comprado: a penúltima vira o evento "velho" a reenviar.
  const line = order.lines[0]!
  await m.mutateNft(line.nftId, { editions: [{ id: line.editionId, price: '9' }] })
  await m.mutateNft(line.nftId, { editions: [{ id: line.editionId, price: '10' }] })

  let cartReads = 0
  page.on('request', (r) => {
    if (r.method() === 'GET' && r.url().endsWith('/api/cart')) cartReads += 1
  })
  await m.emitDuplicate(settled!.eventId)
  await m.emitStale(line.nftId)
  // Nada deve acontecer: o tempo só deixa o socket entregar os reenvios.
  await page.waitForTimeout(1000)
  await expect(confirmedHeading(page)).toBeVisible()
  await expect(page.getByTestId('receipt-total')).toHaveText(formatEth(order.total))
  expect(cartReads, 'liquidação reaplicada invalidaria o carrinho').toBe(0)
})

test('disconnect while pending then reconnect recovers state without new purchase', async ({
  page,
}) => {
  const posts = countOrderPosts(page)
  const order = await pendingOrder(page)
  const m = mocks(page)
  await m.dropSocket({ holdMs: 3000 })
  // Liquida com o socket fora: o `order.updated` se perde.
  await m.settleOrder(order.id, 'confirmed')
  await expect(waitingNetwork(page)).toBeVisible()
  // Queda curta, volta rápida: a tentativa recusada não pode prender a reconexão.
  await expect
    .poll(async () => (await m.connections()).length, { timeout: 10_000 })
    .toBeGreaterThan(0)
  // Ao reconectar, a reconciliação pela REST traz o resultado.
  await expect(confirmedHeading(page)).toBeVisible()
  expect(posts.count).toBe(1)
  expect(await m.orders()).toHaveLength(1)
})

test('reload while pending resumes the same order', async ({ page }) => {
  const order = await pendingOrder(page)
  await page.reload()
  await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}$`))
  await expect(waitingNetwork(page)).toBeVisible()
  await mocks(page).settleOrder(order.id, 'confirmed')
  await expect(confirmedHeading(page)).toBeVisible()
  expect(await mocks(page).orders()).toHaveLength(1)
})

test('checkout resumes pending order instead of creating a new one', async ({ page }) => {
  const posts = countOrderPosts(page)
  const order = await pendingOrder(page)
  await page.goto('/checkout')
  await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}$`))
  await expect(waitingNetwork(page)).toBeVisible()
  expect(posts.count).toBe(1)
  expect(await mocks(page).orders()).toHaveLength(1)
})

test('confirmation is only shown for confirmed orders', async ({ page }) => {
  const order = await pendingOrder(page)
  await expect(thankYou(page)).toHaveCount(0)
  await mocks(page).settleOrder(order.id, 'declined')
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  await expect(thankYou(page)).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Ver no Etherscan/ })).toHaveCount(0)
  // Abrir o endereço direto também não mostra recibo.
  await page.goto(`/pedido/${order.id}`)
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  await expect(thankYou(page)).toHaveCount(0)
})

test('receipt is not affected by later catalog changes', async ({ page }) => {
  const order = await confirmedOrder(page)
  const line = order.lines[0]!
  await expect(thankYou(page)).toBeVisible()
  await expect(page.getByTestId('receipt-total')).toHaveText(formatEth(order.total))
  const row = page.getByRole('row').filter({ hasText: line.name })
  await expect(row).toContainText(formatEth(line.lineTotal))

  await mocks(page).mutateNft(line.nftId, {
    editions: [{ id: line.editionId, price: '42' }],
  })
  await page.reload()
  await expect(confirmedHeading(page)).toBeVisible()
  await expect(page.getByTestId('receipt-total')).toHaveText(formatEth(order.total))
  await expect(row).toContainText(formatEth(line.lineTotal))
  await expect(row).not.toContainText(formatEth('42'))

  // O "Etherscan" é o explorador simulado com o hash do pedido.
  const explorer = page.getByRole('link', { name: 'Ver no Etherscan (simulado)' })
  const settled = (await mocks(page).orders()).find((o) => o.id === order.id)
  await expect(explorer).toHaveAttribute('href', settled!.explorerUrl!)
  await explorer.click()
  await expect(page.getByRole('heading', { name: 'Explorador simulado' })).toBeVisible()
  await expect(page.getByText(settled!.txHash!)).toBeVisible()
  await expect(page.getByText(formatEth(order.total))).toBeVisible()
})
