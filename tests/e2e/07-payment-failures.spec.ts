import type { Order } from '../../src/contracts'
import { cartItem, main } from './cart-helpers'
import {
  connectWallet,
  goToReview,
  isOrderPost,
  openCheckout,
  walletStatus,
} from './checkout-helpers'
import { expect, login, mocks, test } from './fixtures'

const confirmButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Confirmar compra' })

test('declined payment keeps cart and shows refusal', async ({ page }) => {
  await page.clock.install()
  await openCheckout(page, { scenario: 'payment-declined' })
  await connectWallet(page)
  await goToReview(page)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/pedido\/ord_/)
  await page.clock.fastForward(3000)
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  await expect(main(page).getByText('Pagamento recusado pela carteira')).toBeVisible()
  await main(page).getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(cartItem(page, 'Neon Vessel')).toBeVisible()
})

test('repeated clicks create a single order', async ({ page }) => {
  const answered: Order[] = []
  page.on('response', async (r) => {
    if (!isOrderPost(r) || (r.status() !== 202 && r.status() !== 200)) return
    const order = (await r.json().catch(() => null)) as Order | null
    if (order) answered.push(order)
  })
  await openCheckout(page)
  await connectWallet(page)
  await goToReview(page)
  // Resposta lenta: os cliques extras chegam com o primeiro envio ainda em voo.
  await mocks(page).setLatency(800)
  await confirmButton(page).dblclick()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/pedido\/ord_/)
  expect(new Set(answered.map((o) => o.id)).size).toBe(1)
  expect(await mocks(page).orders()).toHaveLength(1)
})

test('timeout after creation recovers the same order', async ({ page }) => {
  await page.clock.install()
  await openCheckout(page, { scenario: 'order-timeout' })
  await connectWallet(page)
  await goToReview(page)
  const firstPost = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/api/orders'),
  )
  await confirmButton(page).click()
  const key = (await firstPost).headers()['idempotency-key']
  expect(key).toBeTruthy()
  // O servidor criou o pedido, mas a resposta nunca vem.
  await expect.poll(async () => (await mocks(page).orders()).length).toBe(1)
  await page.clock.fastForward(11_000)
  const alert = main(page).getByRole('alert').filter({ hasText: 'Não confirmamos o envio' })
  await expect(alert).toBeVisible()

  const retried = page.waitForResponse(isOrderPost)
  await alert.getByRole('button', { name: 'Tentar novamente' }).click()
  const response = await retried
  expect(response.request().headers()['idempotency-key']).toBe(key)
  expect(response.status()).toBe(200)
  const order = (await response.json()) as Order
  await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}$`))
  const orders = await mocks(page).orders()
  expect(orders.map((o) => o.id)).toEqual([order.id])
})

test('reload while the order answer is missing resumes the same attempt', async ({ page }) => {
  await page.clock.install()
  await openCheckout(page, { scenario: 'order-timeout' })
  await connectWallet(page)
  await goToReview(page)
  const isOrderPostRequest = (r: import('@playwright/test').Request) =>
    r.method() === 'POST' && r.url().endsWith('/api/orders')
  const firstPost = page.waitForRequest(isOrderPostRequest)
  await confirmButton(page).click()
  const key = (await firstPost).headers()['idempotency-key']
  await expect.poll(async () => (await mocks(page).orders()).length).toBe(1)
  await page.clock.fastForward(11_000)
  const alert = main(page).getByRole('alert').filter({ hasText: 'Não confirmamos o envio' })
  await expect(alert).toBeVisible()

  // A recarga não esquece o envio: o checkout reenvia o mesmo corpo com a mesma chave.
  const resent = page.waitForRequest(isOrderPostRequest)
  await page.reload()
  expect((await resent).headers()['idempotency-key']).toBe(key)
  // O backend simulado recomeça a cada carga, então o 1º envio desta carga também fica sem
  // resposta; o retry seguinte recebe o pedido que já existe.
  await page.clock.fastForward(11_000)
  await expect(alert).toBeVisible()
  const retried = page.waitForResponse(isOrderPost)
  await alert.getByRole('button', { name: 'Tentar novamente' }).click()
  const response = await retried
  expect(response.request().headers()['idempotency-key']).toBe(key)
  expect(response.status()).toBe(200)
  const order = (await response.json()) as Order
  await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}$`))
  expect((await mocks(page).orders()).map((o) => o.id)).toEqual([order.id])
})

test('leaving the checkout while the order is in flight keeps a single order', async ({ page }) => {
  await openCheckout(page, { scenario: 'payment-confirmed' })
  await connectWallet(page)
  await goToReview(page)
  await mocks(page).setLatency(1500)
  const created = page.waitForResponse(isOrderPost)
  await confirmButton(page).click()
  // Sai pelo próprio app, sem recarregar: a resposta chega com o checkout já desmontado.
  await page
    .getByRole('link', { name: 'Voltar' })
    .or(page.getByRole('navigation', { name: 'Trilha' }).getByRole('link', { name: 'Início' }))
    .filter({ visible: true })
    .click()
  await expect(page).not.toHaveURL(/\/checkout/)
  const response = await created
  expect(response.status()).toBe(202)
  const order = (await response.json()) as Order
  await page.getByRole('button', { name: 'Ver pedido' }).click()
  await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}$`))

  // Voltar ao checkout com o pedido pendente leva a ele, não a uma segunda compra.
  await page.goto('/checkout')
  await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}$`))
  expect((await mocks(page).orders()).map((o) => o.id)).toEqual([order.id])
})

test('wallet rejection and disconnection', async ({ page }) => {
  await openCheckout(page, { scenario: 'wallet-rejected' })
  await page.getByRole('radio', { name: 'MetaMask', exact: true }).check()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(walletStatus(page)).toContainText('Conexão recusada na carteira')
  await goToReview(page)
  await expect(confirmButton(page)).toBeDisabled()

  // Recomeça do zero no cenário padrão para conectar e então perder a carteira.
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await openCheckout(page, { scenario: 'default' })
  await connectWallet(page)
  await goToReview(page)
  await expect(confirmButton(page)).toBeEnabled()
  await mocks(page).disconnectWallet()
  await expect(walletStatus(page)).toContainText('Carteira desconectada')
  await expect(confirmButton(page)).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
})

test('session expiry during checkout preserves context', async ({ page }) => {
  await openCheckout(page)
  await page.getByLabel('Observação do colecionador').fill('Entregar na reserva')
  await page.getByLabel('Código de indicação').fill('AMIGO42')
  await connectWallet(page)
  await goToReview(page)
  await mocks(page).expireSession()
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/entrar\?.*motivo=expirada/)
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByLabel('Observação do colecionador')).toHaveValue('Entregar na reserva')
  await expect(page.getByLabel('Código de indicação')).toHaveValue('AMIGO42')
  expect(await mocks(page).orders()).toHaveLength(0)
})
