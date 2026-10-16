import type { Page } from '@playwright/test'
import { expect, login, mocks, test } from './fixtures'

const favoriteButton = (page: Page, name: RegExp) => page.getByRole('button', { name }).first()

async function signIn(page: Page, path = '/nft/nft_neon-vessel', email = 'ana@kurio.test') {
  await page.goto(`/entrar?redirect=${encodeURIComponent(path)}`)
  await login(page, email)
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`))
}

test('favorite persists for authenticated user', async ({ page }) => {
  await signIn(page)
  const btn = favoriteButton(page, /^Favoritar Neon Vessel$/)
  await expect(btn).toHaveAttribute('aria-pressed', 'false')
  // Recarregar com o PUT em voo o perderia: espera o servidor confirmar.
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().includes('/favorites/nft_neon-vessel'),
  )
  await btn.click()
  await saved
  const pressed = favoriteButton(page, /^Remover Neon Vessel dos favoritos$/)
  await expect(pressed).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(favoriteButton(page, /^Remover Neon Vessel dos favoritos$/)).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.goto('/favoritos')
  const list = page.getByRole('list', { name: 'Favoritos' })
  await expect(list.getByRole('link', { name: 'Neon Vessel' })).toBeVisible()
})

test('favorites page shows an empty state', async ({ page }) => {
  // Bruno começa sem favoritos no seed (a Ana já tem dois).
  await signIn(page, '/favoritos', 'bruno@kurio.test')
  await expect(page.getByText(/nenhum favorito ainda/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /explorar o mercado/i })).toBeVisible()
})

test('failed mutation rolls back and informs', async ({ page }) => {
  await signIn(page)
  await mocks(page).failNext('PUT /favorites/:nftId', { status: 503, code: 'TRANSIENT' })
  // O rótulo muda com o estado; o padrão cobre os dois.
  const target = favoriteButton(page, /^(Favoritar Neon Vessel|Remover Neon Vessel dos favoritos)$/)
  await expect(target).toHaveAttribute('aria-pressed', 'false')
  // O estado otimista dura só o tempo da resposta: registra cada valor de aria-pressed.
  await target.evaluate((el) => {
    const seen: string[] = []
    ;(window as unknown as { __pressed: string[] }).__pressed = seen
    new MutationObserver(() => seen.push(el.getAttribute('aria-pressed') ?? '')).observe(el, {
      attributeFilter: ['aria-pressed'],
    })
  })
  await target.click()
  await expect(page.getByText(/não foi possível atualizar favoritos/i).first()).toBeVisible()
  await expect(target).toHaveAttribute('aria-pressed', 'false')
  const seen = await page.evaluate(() => (window as unknown as { __pressed: string[] }).__pressed)
  expect(seen).toEqual(['true', 'false'])
})

test('anonymous favorite asks login', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  await favoriteButton(page, /^Favoritar Neon Vessel$/).click()
  await expect(page).toHaveURL(/\/entrar\?redirect=%2Fnft%2Fnft_neon-vessel/)
})

test('favorite from the catalog card toggles on the home grid', async ({ page }) => {
  await signIn(page, '/')
  const card = favoriteButton(page, /^Favoritar Neon Vessel$/)
  await card.click()
  await expect(favoriteButton(page, /^Remover Neon Vessel dos favoritos$/)).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
