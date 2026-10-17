import { test, expect } from './fixtures'

test('smoke: app boots with title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Kurio/)
})

test('each screen has its own title and a single meta description', async ({ page }) => {
  const screens: Array<[string, string]> = [
    ['/', 'Kurio — Marketplace de NFTs'],
    ['/nft/nft_neon-vessel', 'Neon Vessel — Kurio'],
    ['/carrinho', 'Carrinho — Kurio'],
    ['/entrar', 'Entrar — Kurio'],
    ['/cadastro', 'Criar conta — Kurio'],
  ]
  const descriptions = new Set<string | null>()
  for (const [path, title] of screens) {
    await page.goto(path)
    await expect(page).toHaveTitle(title)
    const meta = page.locator('meta[name="description"]')
    await expect(meta).toHaveCount(1)
    descriptions.add(await meta.getAttribute('content'))
  }
  // Uma descrição por tela, e a do detalhe fala do próprio NFT.
  expect(descriptions.size).toBe(screens.length)
  expect([...descriptions][1]).toContain('Neon Vessel')
})

test('smoke: mock control is available', async ({ page }) => {
  await page.goto('/')
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as unknown as { __kurioMocks?: unknown }).__kurioMocks),
    )
    .toBe('object')
})

test('smoke: mock socket.io server handshakes and pushes nft.updated', async ({ page }) => {
  await page.goto('/')
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as unknown as { __kurioMocks?: unknown }).__kurioMocks),
    )
    .toBe('object')
  const frames = await page.evaluate(async () => {
    type Control = { mutateNft(id: string, p: unknown): unknown }
    const control = (window as unknown as { __kurioMocks: Control }).__kurioMocks
    const db = JSON.parse(localStorage.getItem('kurio:mockdb:v2') ?? '{}') as {
      nfts: Array<{ id: string; editions: Array<{ id: string }> }>
    }
    const nft = db.nfts[0]!
    const url = `${location.origin.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`
    const socket = new WebSocket(url)
    const received: string[] = []
    await new Promise<void>((resolve) => {
      socket.addEventListener('message', (e) => {
        received.push(String(e.data))
        if (String(e.data).startsWith('40')) {
          control.mutateNft(nft.id, { editions: [{ id: nft.editions[0]!.id, available: 1 }] })
        }
        if (String(e.data).startsWith('42')) resolve()
      })
    })
    socket.close()
    return received
  })
  expect(frames[0]).toMatch(/^0\{/)
  expect(frames[1]).toMatch(/^40/)
  expect(frames[2]).toMatch(/^42\["nft\.updated",\{"eventId":"evt_/)
})

test('layout has no horizontal overflow at 390/768/1440', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('contentinfo')).toBeAttached()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  }
})

test('unknown route shows 404', async ({ page }) => {
  await page.goto('/nao-existe')
  await expect(page.getByRole('heading', { name: /página não encontrada/i })).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: /início/i })).toBeVisible()
})

test('out-of-scope nav is marked unavailable', async ({ page }, testInfo) => {
  await page.goto('/')
  // O mobile do Figma não tem a nav do topo; lá o item fora de escopo é o Scan da bottom nav.
  const target =
    testInfo.project.name === 'chromium-mobile'
      ? page.getByRole('navigation', { name: 'Navegação inferior' }).getByRole('button', {
          name: 'Escanear',
        })
      : page.getByRole('link', { name: 'Criadores', exact: true })
  await expect(target).toHaveAttribute('aria-disabled', 'true')
  // O Playwright não clica em `aria-disabled` (semântica correta); o usuário ainda pode clicar.
  await target.click({ force: true })
  await expect(page.getByText('Indisponível nesta demonstração')).toBeVisible()
})
