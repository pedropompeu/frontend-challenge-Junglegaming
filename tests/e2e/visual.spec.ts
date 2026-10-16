import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { addToCart, login, waitForLive } from './helpers/mocks'

/**
 * Deixa a tela parada antes do print: rede ociosa, socket "ao vivo", sem toasts e com todas as
 * imagens (inclusive as `lazy` abaixo da dobra) e fontes prontas.
 */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await waitForLive(page)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10_000 })
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = 'eager'
    await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)))
    await document.fonts.ready
  })
}

test('visual: home', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')).toHaveCount(9)
  await settle(page)
  await expect(page).toHaveScreenshot('home.png', { fullPage: true })
})

test('visual: detail', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  await expect(page.getByRole('heading', { level: 1, name: 'Neon Vessel' })).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true })
})

test('visual: cart', async ({ page }) => {
  await addToCart(page, 'nft_neon-vessel')
  await addToCart(page, 'nft_eco-dourado')
  await page.goto('/carrinho')
  await expect(page.getByTestId('summary-total')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true })
})

test('visual: checkout', async ({ page }) => {
  await page.goto('/entrar?redirect=%2Fnft%2Fnft_neon-vessel')
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/nft\/nft_neon-vessel$/)
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await expect(page.getByTestId('summary-total')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('checkout.png', { fullPage: true })
})
