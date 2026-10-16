import { expect, isMobile, login, test } from './fixtures'

// Estilos que o Figma fixa e que já escaparam uma vez (context/achados.md A-032/A-033).
const SAND = 'rgb(207, 178, 140)'
const LINE = 'rgb(63, 35, 25)'
const BAND = 'rgb(56, 34, 15)'

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
