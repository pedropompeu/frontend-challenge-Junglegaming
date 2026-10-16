import type { Locator, Page } from '@playwright/test'
import { addToCart } from './cart-helpers'
import { openCheckout, placeOrder } from './checkout-helpers'
import { expect, isMobile, login, test } from './fixtures'

// Estilos que o Figma fixa e que já escaparam uma vez (context/achados.md A-032/A-033).
const SAND = 'rgb(207, 178, 140)'
const LINE = 'rgb(63, 35, 25)'
const BAND = 'rgb(56, 34, 15)'
const PRIMARY = 'rgb(210, 138, 76)'
const MOBILE_CTA = 'linear-gradient(to right, rgb(210, 138, 76), rgba(210, 138, 76, 0.8))'
/** 0,3 px de #D28A4C no frame: a 1x o Chromium pinta 1 px com ~30% de cobertura. */
const DIVIDER = 'rgba(210, 138, 76, 0.3)'

test('hero description uses sand, not the CTA orange', async ({ page }) => {
  await page.goto('/')
  const text = page.getByRole('region', { name: 'Destaques' }).locator('h2 + p').first()
  await expect(text).toHaveCSS('color', SAND)
})

test('nft description uses sand, not the CTA orange', async ({ page }) => {
  test.skip(isMobile(page), 'as abas do NFT só existem no desktop')
  await page.goto('/nft/nft_neon-vessel')
  const description = page.getByRole('tabpanel', { name: 'Detalhes do NFT' }).locator('p').first()
  await expect(description).toHaveCSS('color', SAND)
})

test('footer band uses the frame band color', async ({ page }) => {
  await page.goto('/')
  const band = page.getByRole('contentinfo').getByText('contato@email.com').locator('..')
  await expect(band).toHaveCSS('background-color', BAND)
})

test('fields, chips and pagination use the line border, not line-strong', async ({ page }) => {
  await page.goto('/')
  const pagination = page.getByRole('navigation', { name: 'Paginação' })
  await expect(pagination.getByRole('link', { name: 'Página 2' })).toHaveCSS(
    'border-top-color',
    LINE,
  )

  await page.goto('/nft/nft_neon-vessel')
  const chip = page
    .getByRole('group', { name: 'Edição' })
    .getByRole('button', { pressed: false, disabled: false })
    .first()
  await expect(chip).toHaveCSS('border-top-color', LINE)

  await page.goto('/perfil')
  await expect(page.getByLabel('Senha', { exact: true })).toHaveCSS('border-top-color', LINE)
  await login(page, 'ana@kurio.test')
  const name = page.getByRole('main').getByLabel('Nome de exibição', { exact: true })
  await expect(name).toHaveCSS('border-top-color', LINE)
})

async function expectCtaFill(page: Page, name: string) {
  const cta = page.getByRole('button', { name, exact: true })
  if (isMobile(page)) {
    await expect(cta).toHaveCSS('background-image', MOBILE_CTA)
  } else {
    await expect(cta).toHaveCSS('background-image', 'none')
    await expect(cta).toHaveCSS('background-color', PRIMARY)
  }
}

test('purchase CTAs are solid primary on desktop and fade to 80% on mobile', async ({ page }) => {
  await addToCart(page, 'nft_neon-vessel')
  await expectCtaFill(page, 'Comprar NFT')
  await page.goto('/carrinho')
  await expectCtaFill(page, 'Conectar e finalizar')
})

test('no control keeps the old primary-hi gradient', async ({ page }) => {
  await addToCart(page, 'nft_neon-vessel')
  for (const url of ['/', '/nft/nft_neon-vessel', '/carrinho']) {
    await page.goto(url)
    await expect(page.getByRole('main')).toBeVisible()
    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll('body *')]
        .filter((el) => getComputedStyle(el).backgroundImage.includes('rgb(232, 155, 85)'))
        .map((el) => el.textContent?.trim() || el.getAttribute('class')),
    )
    expect(offenders, url).toEqual([])
  }
})

const placeholderSize = (field: Locator) =>
  field.evaluate((el) => getComputedStyle(el, '::placeholder').fontSize)

/** O Tailwind compõe a sombra em camadas; "sem sombra" é toda camada transparente. */
const hasVisibleShadow = (field: Locator) =>
  field.evaluate((el) =>
    getComputedStyle(el)
      .boxShadow.split(/,(?![^(]*\))/)
      .some((layer) => layer.trim() !== 'none' && !layer.trim().startsWith('rgba(0, 0, 0, 0)')),
  )

test('auth fields follow the frame: 50px r10 on mobile, 40px r5 on desktop, no fill', async ({
  page,
}) => {
  await page.goto('/entrar')
  const email = page.getByLabel('E-mail', { exact: true })
  const password = page.getByLabel('Senha', { exact: true })
  const [height, radius] = isMobile(page) ? ['50px', '10px'] : ['40px', '5px']
  for (const field of [email, password]) {
    await expect(field).toHaveCSS('height', height)
    await expect(field).toHaveCSS('border-radius', radius)
    await expect(field).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    expect(await hasVisibleShadow(field)).toBe(false)
  }
  expect(await placeholderSize(email)).toBe('14px')
})

test('desktop form fields are 40px with r3 and a 22px required asterisk', async ({ page }) => {
  test.skip(isMobile(page), 'o Figma não tem os formulários de perfil e pagamento no mobile')
  await page.goto('/perfil/carteiras')
  await login(page, 'ana@kurio.test')
  const primary = page.getByRole('region', { name: 'Carteira principal' })
  const address = primary.getByLabel('Endereço da carteira', { exact: true })
  await expect(address).toHaveCSS('height', '40px')
  await expect(address).toHaveCSS('border-radius', '3px')
  expect(await hasVisibleShadow(address)).toBe(false)
  expect(await placeholderSize(address)).toBe('14px')
  await expect(primary.getByText('*', { exact: true }).first()).toHaveCSS('font-size', '22px')
})

/** A base pinta toda borda com `line`, mesmo de largura 0: a largura prova que a linha existe. */
async function expectDivider(el: Locator, side: 'top' | 'bottom' = 'bottom') {
  await expect(el).toHaveCSS(`border-${side}-width`, '1px')
  await expect(el).toHaveCSS(`border-${side}-color`, DIVIDER)
}

test('desktop header, detail and cart dividers are the primary hairline', async ({ page }) => {
  test.skip(isMobile(page), 'as divisórias de 0,3 px só existem nos frames desktop')
  await addToCart(page, 'nft_neon-vessel')
  await expectDivider(page.getByRole('navigation', { name: 'Principal' }).locator('..'))
  const rating = page.getByText(/^\d+ avaliações de colecionadores$/).filter({ visible: true })
  await expectDivider(rating.locator('xpath=ancestor::div[1]'))
  await expectDivider(page.getByRole('tablist'))
  await expectDivider(page.getByRole('heading', { name: 'Mais desta coleção' }))

  await page.goto('/carrinho')
  const main = page.getByRole('main')
  await expectDivider(main.getByText('Quantidade', { exact: true }).locator('..'))
  await expectDivider(main.getByRole('heading', { name: 'Resumo da carteira' }))
  await expectDivider(main.getByRole('heading', { name: 'Colecionadores também viram' }))
})

test('desktop checkout, receipt and profile dividers are the primary hairline', async ({
  page,
}) => {
  test.skip(isMobile(page), 'as divisórias de 0,3 px só existem nos frames desktop')
  await page.clock.install()
  await openCheckout(page)
  const summary = page.getByRole('region', { name: 'Seus NFTs' })
  await expectDivider(summary.locator('[aria-hidden="true"]').filter({ hasText: 'Subtotal' }))
  // No Pagamento (e não no Carrinho) o frame separa o Total das taxas.
  await expectDivider(summary.getByTestId('summary-total').locator('xpath=../..'), 'top')

  await placeOrder(page)
  await page.clock.fastForward(3000)
  const table = page.getByRole('table', { name: 'Itens do pedido' })
  await expectDivider(table.locator('thead tr'))
  await expectDivider(table.getByTestId('receipt-total').locator('..'))

  await page.goto('/perfil')
  await expectDivider(page.getByRole('button', { name: 'Sair' }).locator('..'), 'top')
})
