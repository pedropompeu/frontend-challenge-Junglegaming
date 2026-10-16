import type { Page } from '@playwright/test'
import { expect, isMobile, test } from './fixtures'

const editions = (page: Page) => page.getByRole('group', { name: 'Edição' })

test('direct access renders detail and title', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  await expect(page.getByRole('heading', { level: 1, name: 'Neon Vessel' })).toBeVisible()
  await expect(page.getByText('ID do token:')).toBeVisible()
  await expect(page.getByRole('img', { name: /neon vessel/i }).first()).toBeVisible()
})

test('unknown nft shows not found with a way back to the catalog', async ({ page }) => {
  await page.goto('/nft/nao-existe')
  await expect(page.getByText(/NFT não encontrado/i)).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()
  await expect(page).toHaveURL(/\/$|\/#catalogo$|\/\?/)
})

test('sold-out edition is disabled with text and is not the default', async ({ page }) => {
  // i=3 (Eco Dourado): a primeira edição está esgotada.
  await page.goto('/nft/nft_eco-dourado')
  const chips = editions(page).getByRole('button')
  await expect(chips.first()).toBeDisabled()
  await expect(chips.first()).toContainText('Esgotada')
  await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Comprar NFT' })).toBeEnabled()
})

test('quantity is capped at availability', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  const available = Number(
    (await page.getByTestId('edition-available').textContent())?.match(/\d+/)?.[0],
  )
  expect(available).toBeGreaterThan(1)
  const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
  for (let i = 1; i < available; i++) await plus.click()
  await expect(plus).toBeDisabled()
  await expect(page.getByRole('group', { name: /quantidade/i }).locator('output')).toHaveText(
    String(available),
  )
})

test('edition persists in URL across reload and resets quantity', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await editions(page).getByRole('button', { name: '1/50' }).click()
  await expect(page).toHaveURL(/edicao=ed_neon-vessel_1-50/)
  await expect(page.getByRole('group', { name: /quantidade/i }).locator('output')).toHaveText('1')
  await page.reload()
  await expect(editions(page).getByRole('button', { name: '1/50' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('gallery thumbs switch the image and zoom opens a dialog', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  if (!isMobile(page)) {
    const thumbs = page.getByRole('group', { name: 'Imagens do NFT' }).getByRole('button')
    await thumbs.nth(1).click()
    await expect(thumbs.nth(1)).toHaveAttribute('aria-pressed', 'true')
  }
  await page.getByRole('button', { name: 'Ampliar imagem' }).click()
  const dialog = page.getByRole('dialog', { name: /neon vessel/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('img')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('add to cart gives feedback', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByText(/adicionado ao carrinho/i)).toBeVisible()
})
