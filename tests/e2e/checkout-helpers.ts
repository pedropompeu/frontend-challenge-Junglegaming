import type { Page, Request, Response } from '@playwright/test'
import type { Order } from '../../src/contracts'
import { expect, login } from './fixtures'

export const ANA_ADDRESS = '0x8f3a21c4b9e07d5a6c12f0e9b4d7a3c5e1f2b6d9'

const isOrderPostRequest = (r: Request) => r.method() === 'POST' && r.url().endsWith('/api/orders')
export const isOrderPost = (r: Response) => isOrderPostRequest(r.request())

/** Contador de `POST /orders` enviados pela página. */
export function countOrderPosts(page: Page) {
  const state = { count: 0 }
  page.on('request', (r) => {
    if (isOrderPostRequest(r)) state.count += 1
  })
  return state
}

/**
 * Entra (com cenário, se pedido), põe um NFT no carrinho e abre o checkout. O cenário vai na
 * primeira carga: o backend simulado o lê de `?scenario=` ao subir.
 */
export async function openCheckout(
  page: Page,
  { scenario, nftId = 'nft_neon-vessel' }: { scenario?: string; nftId?: string } = {},
) {
  const detail = `/nft/${nftId}`
  const params = new URLSearchParams({ ...(scenario ? { scenario } : {}), redirect: detail })
  await page.goto(`/entrar?${params}`)
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(new RegExp(`${detail}$`))
  const added = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/cart/items'),
  )
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  expect((await added).status()).toBe(200)
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
}

export const walletStatus = (page: Page) => page.getByTestId('wallet-status')

export async function connectWallet(page: Page, provider = 'MetaMask') {
  await page.getByRole('radio', { name: provider, exact: true }).check()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(walletStatus(page)).toContainText('Carteira conectada')
}

export const review = (page: Page) => page.getByRole('region', { name: 'Revise seu pedido' })

export async function goToReview(page: Page) {
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(review(page)).toBeVisible()
}

/** Do checkout aberto até o pedido criado (202), já na tela de acompanhamento. */
export async function placeOrder(page: Page): Promise<Order> {
  await connectWallet(page)
  await goToReview(page)
  const created = page.waitForResponse(isOrderPost)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const response = await created
  expect(response.status()).toBe(202)
  const order = (await response.json()) as Order
  await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}$`))
  return order
}
