import type { Page } from '@playwright/test'
import { formatEth } from '../../src/shared/lib/money'
import {
  addToCart,
  cartItem,
  expectSummaryMatches,
  main,
  quantityOf,
  trackQuotes,
} from './cart-helpers'
import { expect, login, mocks, test } from './fixtures'

const toast = (page: Page, text: RegExp | string) =>
  page.locator('[data-sonner-toast]').filter({ hasText: text })

/** Eventos só chegam a quem está conectado: espera o socket da página subir. */
async function waitForSocket(page: Page, userId: string | null = null) {
  await expect
    .poll(async () => (await mocks(page).connections()).some((c) => c.userId === userId))
    .toBe(true)
}

test('price change while browsing updates cart, announces and refreshes summary', async ({
  page,
}) => {
  const quotes = trackQuotes(page)
  const { items } = await addToCart(page, 'nft_neon-vessel')
  const item = items[0]!
  await page.goto('/carrinho')
  await expectSummaryMatches(page, quotes)
  await waitForSocket(page)

  await mocks(page).mutateNft(item.nftId, { editions: [{ id: item.editionId, price: '2.5' }] })

  const message = new RegExp(
    `Preço de Neon Vessel \\(.+\\) mudou de ${formatEth(item.unitPrice).replace('.', '\\.')} para 2\\.5 ETH`,
  )
  await expect(toast(page, message)).toBeVisible()
  await expect(page.locator('#kurio-announcer-polite')).toHaveText(message)
  const row = cartItem(page, 'Neon Vessel')
  await expect(row.getByText(formatEth('2.5')).first()).toBeVisible()
  await expect(row.getByText('Preço atualizado')).toBeVisible()
  await expect.poll(() => quotes.last?.lines[0]?.unitPrice).toBe('2.5')
  await expectSummaryMatches(page, quotes)

  // O aviso da linha some na próxima interação com ela.
  await row.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(quantityOf(page, 'Neon Vessel')).toHaveText('2')
  await expect(row.getByText('Preço atualizado')).toHaveCount(0)
})

test('availability drop caps quantity', async ({ page }) => {
  const quotes = trackQuotes(page)
  const { items } = await addToCart(page, 'nft_neon-vessel')
  const item = items[0]!
  // Estoque conhecido antes de abrir o carrinho: 5 unidades.
  await mocks(page).mutateNft(item.nftId, { editions: [{ id: item.editionId, available: 5 }] })
  await page.goto('/carrinho')
  const row = cartItem(page, 'Neon Vessel')
  const plus = row.getByRole('button', { name: 'Aumentar quantidade' })
  const minus = row.getByRole('button', { name: 'Diminuir quantidade' })
  await plus.click()
  await expect(quantityOf(page, 'Neon Vessel')).toHaveText('2')
  await plus.click()
  await expect(quantityOf(page, 'Neon Vessel')).toHaveText('3')
  // A cotação vem do carrinho do servidor: só segue quando ele já guardou as 3 unidades.
  await expect.poll(() => quotes.last?.lines[0]?.quantity).toBe(3)
  await expectSummaryMatches(page, quotes)
  await waitForSocket(page)

  await mocks(page).mutateNft(item.nftId, { editions: [{ id: item.editionId, available: 1 }] })

  await expect(toast(page, /Estoque de Neon Vessel \(.+\) mudou: só resta 1 unidade/)).toBeVisible()
  await expect(row.getByText('Só resta 1 unidade desta edição')).toBeVisible()
  await expect(row.getByText('Estoque atualizado')).toBeVisible()
  await expect(plus).toBeDisabled()
  const checkout = main(page).getByRole('button', { name: 'Conectar e finalizar' })
  await expect(checkout).toBeDisabled()
  await expect(main(page).getByText(/ajuste as quantidades destacadas/i)).toBeVisible()

  // O servidor recusa qualquer quantidade acima do estoque: o "−" vai direto ao que resta.
  await minus.click()
  await expect(quantityOf(page, 'Neon Vessel')).toHaveText('1')
  await expect(row.getByText('Só resta 1 unidade desta edição')).toHaveCount(0)
  await expect(plus).toBeDisabled()
  await expect.poll(() => quotes.last?.lines[0]?.quantity).toBe(1)
  await expectSummaryMatches(page, quotes)
  await expect(checkout).toBeEnabled()
})

test('switching user clears private cache and socket', async ({ page }) => {
  await page.goto('/favoritos')
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/favoritos$/)
  const favorites = page.getByRole('list', { name: 'Favoritos' }).getByRole('listitem')
  await expect(favorites.first()).toBeVisible()
  await waitForSocket(page, 'usr_ana')
  await addToCart(page, 'nft_neon-vessel')

  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect
    .poll(async () => (await mocks(page).connections()).map((c) => c.userId))
    .not.toContain('usr_ana')

  await page.goto('/favoritos')
  await login(page, 'bruno@kurio.test')
  await expect(page).toHaveURL(/\/favoritos$/)
  await expect(page.getByText(/nenhum favorito ainda/i)).toBeVisible()
  await expect(favorites).toHaveCount(0)
  await waitForSocket(page, 'usr_bruno')
  expect((await mocks(page).connections()).map((c) => c.userId)).not.toContain('usr_ana')

  await page.goto('/carrinho')
  await expect(main(page).getByText(/seu carrinho está vazio/i)).toBeVisible()
})
