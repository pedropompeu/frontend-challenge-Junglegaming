import type { Order } from '../../src/contracts'
import { formatEth } from '../../src/shared/lib/money'
import { cartItem, main, trackQuotes } from './cart-helpers'
import {
  ANA_ADDRESS,
  connectWallet,
  countOrderPosts,
  goToReview,
  isOrderPost,
  openCheckout,
  review,
  walletStatus,
} from './checkout-helpers'
import { expect, login, test } from './fixtures'

test('full purchase from catalog to confirmed receipt', async ({ page }) => {
  // Relógio controlado: a liquidação padrão leva 3s e o teste a adianta.
  await page.clock.install()
  const quotes = trackQuotes(page)
  await page.goto('/entrar')
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/$/)

  const card = page.getByRole('list', { name: 'NFTs' }).getByRole('listitem').first()
  const name = (await card.getByRole('heading').textContent())!.trim()
  await card.getByRole('heading').getByRole('link').click()
  await expect(page).toHaveURL(/\/nft\/nft_/)
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
  await expect(cartItem(page, name)).toBeVisible()
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)

  // Perfil pré-preenchido com a sessão e a carteira principal.
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Souza')
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('ana_kurio')
  await expect(page.getByLabel('Endereço da carteira')).toHaveValue(ANA_ADDRESS)
  await expect(page.getByRole('radio', { name: /Carteira principal/ })).toBeChecked()
  await expect(walletStatus(page)).toContainText('Carteira não conectada')
  await connectWallet(page, 'MetaMask')

  await goToReview(page)
  await expect(review(page).getByText(name)).toBeVisible()
  await expect(review(page).getByText('Carteira principal')).toBeVisible()
  const created = page.waitForResponse(isOrderPost)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const response = await created
  expect(response.status()).toBe(202)
  const order = (await response.json()) as Order
  await expect(page).toHaveURL(new RegExp(`/pedido/${order.id}$`))
  await expect(main(page).getByText('Pendente')).toBeVisible()

  await page.clock.fastForward(3000)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible()
  const quote = quotes.byId.get(order.quoteId)
  expect(quote, 'o pedido usa uma cotação vista pela página').toBeDefined()
  // No desktop o recibo é um modal (portal fora do main): a tabela é buscada na página.
  const items = page.getByRole('table', { name: 'Itens do pedido' }).locator('tbody tr')
  await expect(items).toHaveCount(quote!.lines.length)
  for (const line of quote!.lines) {
    await expect(items.filter({ hasText: line.name })).toContainText(`x ${line.quantity}`)
  }
  await expect(page.getByTestId('receipt-fee')).toHaveText(formatEth(quote!.networkFee))
  await expect(page.getByTestId('receipt-total')).toHaveText(formatEth(quote!.total))

  await page.goto('/carrinho')
  await expect(main(page).getByText('Seu carrinho está vazio')).toBeVisible()
})

test('form validation and review before submit', async ({ page }) => {
  const posts = countOrderPosts(page)
  await openCheckout(page)
  const displayName = page.getByLabel('Nome de exibição')
  const email = page.getByLabel('E-mail', { exact: true })
  const note = page.getByLabel('Observação do colecionador')
  const address = page.getByLabel('Endereço da carteira')

  await displayName.fill('')
  await email.fill('ana@')
  await note.fill('x'.repeat(281))
  await page.getByRole('checkbox', { name: 'Usar outra carteira?' }).check()
  await address.fill('0x123')
  await page.getByRole('button', { name: 'Revisar pedido' }).click()
  await expect(main(page).getByText('Informe o nome de exibição')).toBeVisible()
  await expect(main(page).getByText('E-mail inválido')).toBeVisible()
  await expect(main(page).getByText('Endereço inválido para a rede escolhida')).toBeVisible()
  await expect(main(page).getByText('Use até 280 caracteres')).toBeVisible()
  await expect(displayName).toBeFocused()
  await expect(review(page)).toHaveCount(0)

  await displayName.fill('Ana S.')
  await email.fill('ana@kurio.test')
  await note.fill('Presente para minha irmã')
  await page.getByRole('checkbox', { name: 'Usar outra carteira?' }).uncheck()
  await expect(address).toHaveValue(ANA_ADDRESS)
  await goToReview(page)
  await expect(review(page).getByText('Ana S.')).toBeVisible()
  await expect(review(page).getByText('Presente para minha irmã')).toBeVisible()
  await expect(review(page).getByText('Carteira principal')).toBeVisible()
  await expect(review(page).getByText('Ethereum')).toBeVisible()
  await expect(review(page).getByTestId('review-total')).not.toBeEmpty()
  // Sem carteira conectada não há como confirmar.
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()

  await review(page).getByRole('button', { name: 'Editar dados' }).click()
  await expect(displayName).toHaveValue('Ana S.')
  await expect(note).toHaveValue('Presente para minha irmã')
  expect(posts.count).toBe(0)
})
