import type { Locator, Page } from '@playwright/test'
import type { Order, Quote } from '../../src/contracts'
import type { KurioMocksControl } from '../../src/mocks/control'
import { formatEth } from '../../src/shared/lib/money'
import {
  addToCart,
  cartItem,
  expectSummaryMatches,
  main,
  quantityOf,
  trackQuotes,
} from './cart-helpers'
import {
  connectWallet,
  countOrderPosts,
  goToReview,
  isOrderPost,
  openCheckout,
  review,
} from './checkout-helpers'
import { expect, login, mocks, test } from './fixtures'

const toast = (page: Page, text: RegExp | string) =>
  page.locator('[data-sonner-toast]').filter({ hasText: text })

/** Eventos só chegam a quem está conectado: espera o socket da página subir. */
async function waitForSocket(page: Page, userId: string | null = null) {
  await expect
    .poll(async () => (await mocks(page).connections()).some((c) => c.userId === userId))
    .toBe(true)
}

type NftPatch = Parameters<KurioMocksControl['mutateNft']>[1]

/**
 * Muda o NFT no servidor e clica no botão no mesmo tick da página: o clique sai com a cotação
 * que a tela tinha, antes de o `nft.updated` chegar (a corrida que só o servidor consegue pegar).
 */
async function mutateAndClick(page: Page, button: Locator, nftId: string, patch: NftPatch) {
  const handle = await button.elementHandle()
  await page.evaluate(
    ([id, p, el]) => {
      window.__kurioMocks!.mutateNft(id, p)
      ;(el as HTMLElement).click()
    },
    [nftId, patch, handle] as const,
  )
}

const confirmButton = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })

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

test('price change during checkout blocks confirmation with stale quote', async ({ page }) => {
  const posts = countOrderPosts(page)
  const quotes = trackQuotes(page)
  await openCheckout(page, { scenario: 'price-change-checkout' })
  // Revisão aberta antes da carteira: o cenário muda o preço 1,5s depois da conexão.
  await goToReview(page)
  const reviewed = quotes.last!
  await connectWallet(page)

  const notice = review(page).getByText('Valores atualizados — revise antes de confirmar')
  await expect(notice).toBeVisible()
  const confirm = confirmButton(page)
  await expect(confirm).toBeDisabled()
  await expect.poll(() => quotes.last?.total).not.toBe(reviewed.total)
  const updated = quotes.last!
  expect(Number(updated.lines[0]!.unitPrice)).toBeGreaterThan(Number(reviewed.lines[0]!.unitPrice))
  await expect(page.getByTestId('review-total')).toHaveText(formatEth(updated.total))
  await review(page).getByRole('button', { name: 'Revisar novamente' }).click()
  await expect(notice).toHaveCount(0)
  await expect(confirm).toBeEnabled()

  // O preço muda de novo no instante do clique: o pedido sai com a cotação já vencida.
  const line = updated.lines[0]!
  const rejected = page.waitForResponse(isOrderPost)
  await mutateAndClick(page, confirm, line.nftId, {
    editions: [{ id: line.editionId, price: '9.5' }],
  })
  const stale = await rejected
  expect(stale.status()).toBe(409)
  const fresh = ((await stale.json()) as { error: { details: { quote: Quote } } }).error.details
    .quote
  const dialog = page.getByRole('dialog', { name: 'Os valores mudaram' })
  await expect(dialog).toBeVisible()
  const totalRow = dialog.getByRole('row', { name: /^Total/ })
  await expect(totalRow).toContainText(formatEth(updated.total))
  await expect(totalRow).toContainText(formatEth(fresh.total))
  await dialog.getByRole('button', { name: 'Revisar novamente' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('review-total')).toHaveText(formatEth(fresh.total))

  const created = page.waitForResponse(isOrderPost)
  await confirm.click()
  const accepted = await created
  expect(accepted.status()).toBe(202)
  expect(((await accepted.json()) as Order).total).toBe(fresh.total)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
  expect(posts.count).toBe(2)
})

test('edition sold out during checkout', async ({ page }) => {
  const posts = countOrderPosts(page)
  let refusedQuotes = 0
  page.on('response', (r) => {
    if (r.request().method() === 'POST' && r.url().endsWith('/api/quotes') && r.status() === 409)
      refusedQuotes += 1
  })
  await openCheckout(page, { scenario: 'sold-out-checkout' })
  // Revisão aberta antes da carteira: o cenário zera o estoque 1,5s depois da conexão.
  await goToReview(page)
  await connectWallet(page)

  await expect(toast(page, /Neon Vessel \(.+\) esgotou/)).toBeVisible()
  await expect(confirmButton(page)).toBeDisabled()
  await review(page).getByRole('link', { name: 'Voltar ao carrinho' }).click()

  await expect(page).toHaveURL(/\/carrinho$/)
  const row = cartItem(page, 'Neon Vessel')
  await expect(row.getByText('Esta edição esgotou')).toBeVisible()
  await expect(row.getByText('Estoque atualizado')).toBeVisible()
  await expect(main(page).getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  expect(posts.count).toBe(0)
  // Com o item acima do estoque, pedir a cotação só renderia um 409 e um segundo aviso.
  expect(refusedQuotes).toBe(0)
})

test('edition sold out at confirmation sends the buyer back to the cart', async ({ page }) => {
  const posts = countOrderPosts(page)
  const quotes = trackQuotes(page)
  await openCheckout(page)
  await connectWallet(page)
  await goToReview(page)

  // Esgota no instante do clique: só a revalidação do servidor (409) pega.
  const line = quotes.last!.lines[0]!
  const rejected = page.waitForResponse(isOrderPost)
  await mutateAndClick(page, confirmButton(page), line.nftId, {
    editions: [{ id: line.editionId, available: 0 }],
  })
  expect((await rejected).status()).toBe(409)

  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(toast(page, 'Esta edição esgotou. Ajuste o carrinho para continuar.')).toBeVisible()
  await expect(cartItem(page, 'Neon Vessel').getByText('Esta edição esgotou')).toBeVisible()
  expect(posts.count).toBe(1)
  expect(await mocks(page).orders()).toHaveLength(0)
})
