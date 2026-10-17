import type { Page } from '@playwright/test'
import { expect, isMobile, mocks, test } from './fixtures'

const cards = (page: Page) => page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')

/** No mobile os filtros ficam numa gaveta; no desktop, na barra lateral. */
async function inFilters(page: Page, run: () => Promise<void>) {
  if (!isMobile(page)) return run()
  const trigger = page.getByRole('button', { name: 'Filtros' })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Filtros' })).toBeVisible()
  await run()
  await page.getByRole('button', { name: 'Ver resultados' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
}

test('search, combined filters, sort and pagination compose the URL and survive reload/back', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: /buscar/i }).fill('neon')
  await expect(page).toHaveURL(/q=neon/)

  await page.goto('/')
  await expect(cards(page).first()).toBeVisible()
  await inFilters(page, async () => {
    await page.getByRole('button', { name: 'Polygon', exact: true }).click()
    await page.getByRole('combobox', { name: /ordenar/i }).click()
    await page.getByRole('option', { name: /menor preço/i }).click()
  })
  await expect(page).toHaveURL(/sort=price-asc/)
  await page.getByRole('link', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/networks=polygon.*page=2|page=2.*networks=polygon/)

  await inFilters(page, () => page.getByRole('button', { name: 'Ethereum', exact: true }).click())
  await expect(page).toHaveURL(/networks=polygon%2Cethereum|networks=polygon,ethereum/)
  await expect(page).not.toHaveURL(/page=2/)

  await page.reload()
  await inFilters(page, () =>
    expect(page.getByRole('button', { name: 'Ethereum', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    ),
  )
  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
})

test('categories toggle on and off and combine in the URL', async ({ page }) => {
  await page.goto('/')
  await expect(cards(page).first()).toBeVisible()
  const music = () => page.getByRole('button', { name: /^Música \(\d+\)$/ })
  const games = () => page.getByRole('button', { name: /^Jogos \(\d+\)$/ })
  await inFilters(page, async () => {
    await music().click()
    await games().click()
  })
  await expect(page).toHaveURL(/categories=musica%2Cjogos|categories=musica,jogos/)
  const count = async (b: () => ReturnType<typeof music>) =>
    Number(/\((\d+)\)/.exec((await b().textContent()) ?? '')![1])
  await inFilters(page, async () => {
    await expect(music()).toHaveAttribute('aria-pressed', 'true')
    const expected = (await count(music)) + (await count(games))
    await expect(page.getByText(`${expected} NFTs`, { exact: true })).toBeAttached()
    await music().click()
  })
  await expect(page).toHaveURL(/categories=jogos/)
  await expect(page).not.toHaveURL(/musica/)
})

test('empty result shows empty state', async ({ page }) => {
  await page.goto('/?q=zzzzzz')
  await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page).not.toHaveURL(/q=/)
  await expect(cards(page)).toHaveCount(9)
})

test('server error shows retry and recovers', async ({ page }) => {
  // A Início busca o catálogo ao montar; armar a falha numa rota sem catálogo e navegar no cliente.
  await page.goto('/rota-inexistente')
  await mocks(page).failNext('GET /nfts', { status: 503, code: 'TRANSIENT', times: 3 })
  await page.getByRole('link', { name: 'Voltar ao Início' }).click()
  const retry = page.getByRole('button', { name: 'Tentar novamente' })
  await expect(retry).toBeVisible({ timeout: 10_000 })
  await retry.click()
  await expect(cards(page)).toHaveCount(9)
})

test('out-of-order responses never show stale results', async ({ page }) => {
  await page.goto('/?scenario=jitter')
  await expect(cards(page).first()).toBeVisible({ timeout: 10_000 })
  const box = page.getByRole('searchbox', { name: /buscar/i })
  // Cada letra passa do debounce (300 ms) e dispara uma requisição com latência de 50 ms a 1,5 s.
  await box.pressSequentially('jazz', { delay: 350 })
  await expect(page).toHaveURL(/q=jazz/)
  await expect(page.getByRole('list', { name: 'NFTs' })).toHaveAttribute('aria-busy', 'false', {
    timeout: 10_000,
  })
  await page.waitForTimeout(1600)
  const texts = await cards(page).allInnerTexts()
  expect(texts.length).toBeGreaterThan(0)
  for (const t of texts) expect(t.toLowerCase()).toContain('jazz')
})

test('invalid and out-of-range search params are normalized', async ({ page }) => {
  await page.goto('/?sort=foo&page=99')
  await expect(page).toHaveURL(/page=6/)
  await expect(page).not.toHaveURL(/sort=foo/)
  await expect(cards(page).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Página 6' })).toHaveAttribute('aria-current', 'page')
})

test('card navigates to detail', async ({ page }) => {
  await page.goto('/')
  const first = cards(page).first().getByRole('link').first()
  await first.click()
  await expect(page).toHaveURL(/\/nft\/nft_/)
})

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY))

test('filters keep the scroll position; pagination brings the catalog to the top', async ({
  page,
}) => {
  await page.goto('/')
  await expect(cards(page)).toHaveCount(9)
  const tabs = page.getByRole('tablist', { name: 'Seções do catálogo' })
  await tabs.evaluate((el) => el.scrollIntoView({ block: 'start' }))
  const before = await scrollY(page)
  expect(before).toBeGreaterThan(200)

  await tabs.getByRole('tab', { name: 'Em alta' }).click()
  await expect(page).toHaveURL(/tab=trending/)
  await expect(page.getByRole('list', { name: 'NFTs' })).toHaveAttribute('aria-busy', 'false')
  expect(Math.abs((await scrollY(page)) - before)).toBeLessThanOrEqual(2)

  if (!isMobile(page)) {
    await page.getByRole('button', { name: 'Polygon', exact: true }).click()
    await expect(page).toHaveURL(/networks=polygon/)
    await expect(page.getByRole('list', { name: 'NFTs' })).toHaveAttribute('aria-busy', 'false')
    expect(Math.abs((await scrollY(page)) - before)).toBeLessThanOrEqual(2)
  }

  await page.goto('/')
  await expect(cards(page)).toHaveCount(9)
  const pagination = page.getByRole('navigation', { name: 'Paginação' })
  await pagination.evaluate((el) => el.scrollIntoView({ block: 'end' }))
  await pagination.getByRole('link', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  // Nem fica lá embaixo nem volta ao hero: o topo do catálogo encosta no topo da tela.
  await expect
    .poll(() =>
      page.locator('#catalogo').evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    )
    .toBeGreaterThanOrEqual(0)
  const top = await page.locator('#catalogo').evaluate((el) => el.getBoundingClientRect().top)
  expect(top).toBeLessThanOrEqual(40)
  expect(await scrollY(page)).toBeGreaterThan(200)
})
