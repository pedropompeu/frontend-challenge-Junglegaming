import type { Page } from '@playwright/test'
import { addToCart } from './cart-helpers'
import { expect, isMobile, login, test } from './fixtures'

// Estilos que o Figma fixa e que já escaparam uma vez (context/achados.md A-032/A-033).
const SAND = 'rgb(207, 178, 140)'
const LINE = 'rgb(63, 35, 25)'
const BAND = 'rgb(56, 34, 15)'
const PRIMARY = 'rgb(210, 138, 76)'
const MOBILE_CTA = 'linear-gradient(to right, rgb(210, 138, 76), rgba(210, 138, 76, 0.8))'

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
  await expect(pagination.getByRole('link', { name: 'Página 2' })).toHaveCSS('border-top-color', LINE)

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
