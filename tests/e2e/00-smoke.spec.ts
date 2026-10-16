import { test, expect } from './fixtures'

test('smoke: app boots with title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Kurio/)
})

test('smoke: mock control is available', async ({ page }) => {
  await page.goto('/')
  await expect
    .poll(() => page.evaluate(() => typeof (window as unknown as { __kurioMocks?: unknown }).__kurioMocks))
    .toBe('object')
})

test('smoke: mock socket.io server handshakes and pushes nft.updated', async ({ page }) => {
  await page.goto('/')
  await expect
    .poll(() => page.evaluate(() => typeof (window as unknown as { __kurioMocks?: unknown }).__kurioMocks))
    .toBe('object')
  const frames = await page.evaluate(async () => {
    type Control = { mutateNft(id: string, p: unknown): unknown }
    const control = (window as unknown as { __kurioMocks: Control }).__kurioMocks
    const db = JSON.parse(localStorage.getItem('kurio:mockdb:v1') ?? '{}') as {
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
