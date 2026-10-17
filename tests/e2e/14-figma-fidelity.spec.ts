import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

/** Filtro dos frames mobile: #0A0604 a 45%, com o blur em dobro do stdDeviation do SVG. */
async function expectFrameShadow(el: Locator, geometry: string) {
  await expect(el).toHaveCSS('border-top-width', '0px')
  expect(await el.evaluate((node) => getComputedStyle(node).boxShadow)).toContain(
    `rgba(10, 6, 4, 0.45) ${geometry}`,
  )
}

test('mobile bottom bars float on the frame shadow instead of a top border', async ({ page }) => {
  test.skip(!isMobile(page), 'a navegação inferior e a barra de compra fixa só existem no mobile')
  await page.goto('/')
  await expectFrameShadow(
    page.getByRole('navigation', { name: 'Navegação inferior' }),
    '0px -10px 30px 0px',
  )

  await page.goto('/nft/nft_neon-vessel')
  const bar = page.getByRole('button', { name: 'Comprar NFT', exact: true }).locator('xpath=../..')
  await expectFrameShadow(bar, '0px 0px 20px 0px')
})

test('desktop purchase bar sits inline without the mobile shadow', async ({ page }) => {
  test.skip(isMobile(page), 'no mobile a barra flutua com a sombra do frame')
  await page.goto('/nft/nft_neon-vessel')
  const bar = page.getByRole('button', { name: 'Comprar NFT', exact: true }).locator('xpath=../..')
  await expect(bar).toHaveCSS('position', 'static')
  expect(await hasVisibleShadow(bar)).toBe(false)
})

test('selected edition chip has the primary border and medium primary-hi text', async ({
  page,
}) => {
  await page.goto('/nft/nft_neon-vessel')
  const selected = page
    .getByRole('group', { name: 'Edição' })
    .getByRole('button', { pressed: true })
  await expect(selected).toHaveCSS('border-top-color', PRIMARY)
  await expect(selected).toHaveCSS('color', 'rgb(232, 155, 85)')
  await expect(selected).toHaveCSS('font-weight', '500')
})

const INK = 'rgb(20, 13, 10)'

/** Pílula do frame: #D28A4C, contorno ink, sombra ink a 15% e alvo de toque de pelo menos 24 px. */
async function expectStepPill(group: Locator, [width, height]: [string, string]) {
  const plus = group.getByRole('button', { name: 'Aumentar quantidade' })
  await expect(plus).toHaveCSS('width', width)
  await expect(plus).toHaveCSS('height', height)
  await expect(plus).toHaveCSS('background-color', PRIMARY)
  await expect(plus).toHaveCSS('border-top-color', INK)
  expect(await plus.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(
    'rgba(20, 13, 10, 0.15) 0px 4px 12px -2px',
  )
  const hit = await plus.evaluate((el) => {
    const after = getComputedStyle(el, '::after')
    return [parseFloat(after.width), parseFloat(after.height)]
  })
  expect(Math.min(...hit)).toBeGreaterThanOrEqual(24)
}

test('detail quantity stepper uses the frame pills', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  const stepper = page.getByRole('group', { name: 'Quantidade de Neon Vessel' })
  const value = stepper.locator('output')
  if (isMobile(page)) {
    await expectStepPill(stepper, ['20px', '30px'])
    await expect(value).toHaveCSS('font-size', '18px')
    await expect(value).toHaveCSS('font-weight', '500')
  } else {
    await expectStepPill(stepper, ['33px', '49.5px'])
    await expect(value).toHaveCSS('font-size', '20px')
    await expect(value).toHaveCSS('font-weight', '400')
  }
})

test('desktop cart quantity stepper uses the frame pills', async ({ page }) => {
  test.skip(isMobile(page), 'o card mobile do frame usa círculos de 23 px (A-035)')
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  const stepper = page.getByRole('main').getByRole('group', { name: 'Quantidade de Neon Vessel' })
  await expectStepPill(stepper, ['20px', '30px'])
  await expect(stepper.locator('output')).toHaveCSS('font-size', '17px')
})

/**
 * Topo do rótulo de cada linha do resumo. Subtotal, Desconto e Taxa têm a mesma fonte, então a
 * diferença entre topos é a das linhas de base do frame; o Total (16 px) desloca ~1 px.
 */
async function labelTop(scope: Locator, testId: string) {
  const box = await scope.getByTestId(testId).locator('xpath=../../dt').boundingBox()
  return box!.y
}

async function expectSummaryRhythm(scope: Locator, totalGap: number) {
  const subtotalTop = await labelTop(scope, 'summary-subtotal')
  const discountTop = await labelTop(scope, 'summary-discount')
  const feeTop = await labelTop(scope, 'summary-fee')
  const totalTop = await labelTop(scope, 'summary-total')
  const [discount, fee, total] = [
    discountTop - subtotalTop,
    feeTop - discountTop,
    totalTop - feeTop,
  ]
  expect(discount).toBeCloseTo(32, 0)
  expect(fee).toBeCloseTo(32, 0)
  expect(Math.abs(total - totalGap)).toBeLessThanOrEqual(2)
  await expect(scope.getByTestId('summary-discount')).toHaveCSS('font-size', '15px')
  await expect(scope.getByTestId('summary-total').locator('xpath=../../dt')).toHaveCSS(
    'font-size',
    '16px',
  )
}

test('cart summary rows follow the frame 32px rhythm', async ({ page }) => {
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  // Do rótulo da Taxa ao do Total: 46,4 px no frame mobile e 70,4 px no desktop.
  await expectSummaryRhythm(page.getByRole('main'), isMobile(page) ? 46.4 : 70.4)
})

test('desktop checkout summary rows follow the frame 32px rhythm', async ({ page }) => {
  test.skip(isMobile(page), 'o Pagamento mobile do frame não tem o resumo (A-036)')
  await openCheckout(page)
  await expectSummaryRhythm(page.getByRole('region', { name: 'Seus NFTs' }), 70.4)
})

/** Borda esquerda e direita do elemento em relação ao viewport. */
async function edges(page: Page, el: Locator) {
  const box = (await el.boundingBox())!
  return { left: box.x, right: page.viewportSize()!.width - box.x - box.width }
}

test('mobile pages keep the frame 24px side margins and full-bleed sheets', async ({ page }) => {
  test.skip(!isMobile(page), 'no desktop a coluna de 1200 px já tem respiro próprio')
  await page.goto('/')
  const grid = await edges(page, page.locator('#catalogo-grade'))
  expect(grid.left).toBeCloseTo(24, 0)
  expect(grid.right).toBeCloseTo(24, 0)

  await page.goto('/nft/nft_neon-vessel')
  const carousel = page.getByRole('region', { name: 'Mais desta coleção' }).getByRole('list')
  // Os <li> do skeleton dão lugar aos cards (outra key): mede só depois que o card real entrou.
  const firstCard = carousel
    .getByRole('listitem')
    .filter({ has: page.getByRole('article') })
    .first()
  await expect(firstCard).toBeVisible()
  const strip = await edges(page, carousel)
  expect(strip.left).toBeCloseTo(0, 0)
  expect(strip.right).toBeCloseTo(0, 0)
  expect((await edges(page, firstCard)).left).toBeCloseTo(24, 0)

  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  const sheet = await edges(page, page.getByRole('region', { name: 'Resumo da carteira' }))
  expect(sheet.left).toBeCloseTo(0, 0)
  expect(sheet.right).toBeCloseTo(0, 0)
})

const SURFACE_2 = 'rgb(47, 29, 21)'
const KHAKI = 'rgb(179, 148, 99)'

async function expectFrameCircle(button: Locator, color: string) {
  const box = (await button.boundingBox())!
  expect([box.width, box.height]).toEqual([34, 34])
  await expect(button).toHaveCSS('background-color', SURFACE_2)
  await expect(button).toHaveCSS('border-top-width', '1px')
  await expect(button).toHaveCSS('border-top-color', LINE)
  await expect(button).toHaveCSS('color', color)
}

test('mobile back and favorite buttons are the frame 34px circles', async ({ page }) => {
  test.skip(!isMobile(page), 'os botões circulares são do topo mobile')
  await page.goto('/nft/nft_neon-vessel')
  const back = page
    .getByRole('link', { name: 'Voltar' })
    .or(page.getByRole('button', { name: 'Voltar' }))
  await expectFrameCircle(back, SAND)
  // x 28 e y 24 no frame "Detalhes do NFT"; o coração fica à mesma distância da direita.
  const backEdges = await edges(page, back)
  expect(backEdges.left).toBeCloseTo(28, 0)
  expect((await back.boundingBox())!.y).toBeCloseTo(24, 0)
  const favorite = page.getByRole('button', { name: /^(Favoritar|Remover) Neon Vessel/ }).first()
  await expectFrameCircle(favorite, 'rgb(232, 155, 85)')
  expect((await edges(page, favorite)).right).toBeCloseTo(28, 0)

  await page.goto('/carrinho')
  const cartBack = page.getByRole('main').getByRole('link', { name: 'Voltar' })
  await expectFrameCircle(cartBack, KHAKI)
  expect((await edges(page, cartBack)).left).toBeCloseTo(28, 0)
})

test('mobile title bar keeps the title on one line, clear of the back and demo buttons', async ({
  page,
}) => {
  test.skip(!isMobile(page), 'o título só aparece no topo mobile')
  await openCheckout(page)
  const main = page.getByRole('main')
  const back = main
    .getByRole('button', { name: 'Voltar' })
    .or(main.getByRole('link', { name: 'Voltar' }))
  const backBox = (await back.boundingBox())!
  const title = page.getByRole('heading', { level: 1, name: 'Pagamento com carteira' })
  const titleBox = (await title.boundingBox())!
  expect(titleBox.height).toBeLessThanOrEqual(30)
  // O frame deixa 24,5 px entre o círculo e o título; a 390 px sobra menos, mas nunca encosta.
  expect(titleBox.x - (backBox.x + backBox.width)).toBeGreaterThanOrEqual(12)
  // O botão da demo (fora do frame) fica no canto superior direito do checkout.
  const demo = (await page.getByRole('button', { name: 'Cenários (demo)' }).boundingBox())!
  expect(demo.x - (titleBox.x + titleBox.width)).toBeGreaterThanOrEqual(4)
})

test('mobile detail art sits in the frame 28px margins over the hero gradient', async ({
  page,
}) => {
  test.skip(!isMobile(page), 'a moldura da arte e o gradiente são do topo mobile')
  await page.goto('/nft/nft_neon-vessel')
  await expect(page.getByTestId('detail-hero')).toHaveCSS(
    'background-image',
    'linear-gradient(138deg, rgb(36, 22, 18), rgb(47, 29, 21))',
  )
  // x 28, y 66, 361×356 e r24 no frame "Detalhes do NFT".
  const art = page.locator('img[fetchpriority="high"]')
  const artEdges = await edges(page, art)
  expect(artEdges.left).toBeCloseTo(28, 0)
  expect(artEdges.right).toBeCloseTo(28, 0)
  const artBox = (await art.boundingBox())!
  expect(artBox.y).toBeCloseTo(66, 0)
  expect(artBox.height).toBeCloseTo((artBox.width * 356) / 361, 0)
  await expect(art).toHaveCSS('border-top-left-radius', '24px')
  // A folha (r31) sobe 30 px sobre o pé da arte.
  const sheet = page.getByTestId('detail-sheet')
  const sheetBox = (await sheet.boundingBox())!
  expect(artBox.y + artBox.height - sheetBox.y).toBeCloseTo(30, 0)
  await expect(sheet).toHaveCSS('border-top-left-radius', '31px')
})

test('mobile detail gallery scrolls between images under the frame dots', async ({ page }) => {
  test.skip(!isMobile(page), 'no desktop as miniaturas trocam a imagem')
  await page.goto('/nft/nft_neon-vessel')
  const strip = page.getByRole('list', { name: 'Imagens de Neon Vessel' })
  const art = (await strip.boundingBox())!
  // Pílula de 28×7 na imagem atual e círculos de 7 px, todos #D28A4C, 7 px entre si, centralizados
  // a 50 px do pé da arte (Group 62 do frame).
  const dots = page.getByTestId('gallery-dots').locator('span')
  await expect(dots).toHaveCount(3)
  const boxes = await Promise.all([0, 1, 2].map(async (i) => (await dots.nth(i).boundingBox())!))
  expect(boxes.map((b) => [b.width, b.height])).toEqual([
    [28, 7],
    [7, 7],
    [7, 7],
  ])
  expect(boxes[1]!.x - (boxes[0]!.x + 28)).toBeCloseTo(7, 0)
  expect(boxes[2]!.x - (boxes[1]!.x + 7)).toBeCloseTo(7, 0)
  expect((boxes[0]!.x + boxes[2]!.x + 7) / 2).toBeCloseTo(art.x + art.width / 2, 0)
  expect(art.y + art.height - (boxes[0]!.y + 7)).toBeCloseTo(50, 0)
  await expect(dots.nth(1)).toHaveCSS('background-color', PRIMARY)

  // O teclado rola a faixa como o dedo: a seta leva à próxima imagem, que o zoom passa a mostrar.
  await strip.focus()
  await page.keyboard.press('ArrowRight')
  await expect(dots.nth(1)).toHaveCSS('width', '28px')
  await expect(dots.nth(0)).toHaveCSS('width', '7px')
  const second = await strip.getByRole('img').nth(1).getAttribute('src')
  await page.getByRole('button', { name: 'Ampliar imagem' }).click()
  await expect(page.getByRole('dialog').getByRole('img')).toHaveAttribute('src', second!)
})

test('mobile detail sheet uses the frame type sizes and rating badge', async ({ page }) => {
  test.skip(!isMobile(page), 'o selo e os tamanhos são da folha mobile')
  await page.goto('/nft/nft_neon-vessel')
  const title = page.getByRole('heading', { level: 1, name: 'Neon Vessel' })
  await expect(title).toHaveCSS('font-size', '20px')
  // Selo de 27 px com contorno #D28A4C, estrela #E3A44E e a nota em 500.
  const badge = page.getByTestId('rating-badge').filter({ visible: true })
  expect((await badge.boundingBox())!.height).toBeCloseTo(27, 0)
  await expect(badge).toHaveCSS('border-top-color', PRIMARY)
  await expect(badge.locator('svg')).toHaveCSS('fill', 'rgb(227, 164, 78)')
  await expect(badge.getByText('4.8', { exact: true })).toHaveCSS('font-weight', '500')
  // A descrição começa 12 px abaixo da linha do título (463 − 451 no frame).
  const row = (await title.locator('..').boundingBox())!
  const about = (await page
    .getByRole('region', { name: 'Sobre este NFT' })
    .getByText(/^Neon Vessel faz parte/)
    .boundingBox())!
  expect(about.y - (row.y + row.height)).toBeCloseTo(12, 0)
  await expect(page.locator('#edition-label')).toHaveCSS('font-size', '15px')
  const info = page.locator('dl').filter({ hasText: 'ID do token' })
  await expect(info).toHaveCSS('font-size', '15px')
  const rows = info.locator(':scope > div')
  const [first, second] = [(await rows.nth(0).boundingBox())!, (await rows.nth(1).boundingBox())!]
  expect(second.y - first.y).toBeCloseTo(32, 0)
})

test('mobile edition chips are the frame 28px ellipses, 12px apart', async ({ page }) => {
  test.skip(!isMobile(page), 'as elipses são dos chips mobile')
  await page.goto('/nft/nft_neon-vessel')
  const chips = page.getByRole('group', { name: 'Edição' }).getByRole('button')
  await expect(chips.first()).toHaveCSS('height', '28px')
  await expect(chips.first()).toHaveCSS('border-top-left-radius', '50%')
  const [a, b] = [(await chips.nth(0).boundingBox())!, (await chips.nth(1).boundingBox())!]
  expect(b.x - (a.x + a.width)).toBeCloseTo(12, 0)
})

test('mobile purchase bar uses the frame 40px sheet, 60px CTA and khaki cart', async ({ page }) => {
  test.skip(!isMobile(page), 'a barra fixa é do mobile')
  await page.goto('/nft/nft_neon-vessel')
  const cta = page.getByRole('button', { name: 'Comprar NFT', exact: true })
  const bar = cta.locator('xpath=../..')
  // "Buy Bar" do frame: rx 40, "Qtd." 15/500 e preço 20 bold.
  await expect(bar).toHaveCSS('border-top-left-radius', '40px')
  const qtd = bar.getByText('Qtd.', { exact: true })
  await expect(qtd).toHaveCSS('font-size', '15px')
  await expect(qtd).toHaveCSS('font-weight', '500')
  const price = bar.locator('span[aria-hidden="true"]').filter({ hasText: 'ETH' }).first()
  await expect(price).toHaveCSS('font-size', '20px')
  // CTA de 60 px com texto 16 bold; carrinho em círculo de 60 px com o ícone khaki.
  expect((await cta.boundingBox())!.height).toBeCloseTo(60, 0)
  await expect(cta).toHaveCSS('font-size', '16px')
  const cart = bar.getByRole('button', { name: 'Adicionar ao carrinho' })
  const cartBox = (await cart.boundingBox())!
  expect([cartBox.width, cartBox.height]).toEqual([60, 60])
  await expect(cart).toHaveCSS('color', KHAKI)
  expect(cartBox.x - ((await cta.boundingBox())!.x + (await cta.boundingBox())!.width)).toBeCloseTo(
    12,
    0,
  )
})

test('mobile cart items are the frame 100px cards with square art and the stepper by the price', async ({
  page,
}) => {
  test.skip(!isMobile(page), 'o card é do carrinho mobile; o desktop é a tabela')
  await addToCart(page, 'nft_neon-vessel')
  await addToCart(page, 'nft_eco-dourado')
  await page.goto('/carrinho')
  const cards = page.getByRole('list', { name: 'Itens do carrinho' }).locator(':scope > li')
  await expect(cards).toHaveCount(2)
  const card = cards.first()
  // "Item 1" do frame: x 28, 358×100, rx 14, sombra dy 6 / blur 20 a 45%, 20 px até o próximo.
  const cardEdges = await edges(page, card)
  expect(cardEdges.left).toBeCloseTo(28, 0)
  expect(cardEdges.right).toBeCloseTo(28, 0)
  const box = (await card.boundingBox())!
  expect(box.height).toBeCloseTo(100, 0)
  await expect(card).toHaveCSS('border-top-left-radius', '14px')
  // O Tailwind antepõe as camadas vazias de ring: a do frame é a última.
  await expect(card).toHaveCSS('box-shadow', /rgba\(10, 6, 4, 0\.45\) 0px 6px 20px 0px$/)
  expect((await cards.nth(1).boundingBox())!.y - (box.y + box.height)).toBeCloseTo(20, 0)
  // Arte quadrada de 100 px e preço 18 bold.
  const art = (await card.locator('img').boundingBox())!
  expect([art.x, art.width, art.height]).toEqual([box.x, 100, 100])
  const price = card.locator('span[aria-hidden="true"]').filter({ hasText: 'ETH' }).first()
  await expect(price).toHaveCSS('font-size', '18px')
  // Stepper em círculos de 24 px (23 + o contorno centrado), a 16 px da borda e na linha do preço.
  const plus = card.getByRole('button', { name: 'Aumentar quantidade' })
  const plusBox = (await plus.boundingBox())!
  expect([plusBox.width, plusBox.height]).toEqual([24, 24])
  expect(box.x + box.width - (plusBox.x + plusBox.width)).toBeCloseTo(16, 0)
  const priceBox = (await price.boundingBox())!
  expect(plusBox.y + 12).toBeCloseTo(priceBox.y + priceBox.height / 2, 0)
  // A lixeira continua em todos os itens, acima do stepper.
  const trash = (await card
    .getByRole('button', { name: 'Remover Neon Vessel do carrinho' })
    .boundingBox())!
  expect(trash.y + trash.height).toBeLessThanOrEqual(plusBox.y)
})

test('mobile coupon field is the frame 50px pill with the apply button inside', async ({
  page,
}) => {
  test.skip(!isMobile(page), 'a pílula é do cupom mobile; o desktop é o campo r3')
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  const field = page.getByRole('textbox', { name: 'Código promocional' })
  // "Promo Input" do frame: 366×50 nas margens de 24, rx 25, contorno line e a sombra dos cards.
  const fieldEdges = await edges(page, field)
  expect(fieldEdges.left).toBeCloseTo(24, 0)
  expect(fieldEdges.right).toBeCloseTo(24, 0)
  const box = (await field.boundingBox())!
  expect(box.height).toBeCloseTo(50, 0)
  await expect(field).toHaveCSS('border-top-left-radius', '25px')
  await expect(field).toHaveCSS('border-top-color', LINE)
  await expect(field).toHaveCSS('box-shadow', /rgba\(10, 6, 4, 0\.45\) 0px 6px 20px 0px$/)
  expect(await placeholderSize(field)).toBe('13px')
  // "Aplicar" em pílula de 97×50 sobre a ponta direita do campo, texto 15 bold.
  const apply = page.getByRole('button', { name: 'Aplicar', exact: true })
  const applyBox = (await apply.boundingBox())!
  expect(applyBox.height).toBeCloseTo(50, 0)
  expect(applyBox.width).toBeCloseTo(97, 0)
  expect(applyBox.y).toBeCloseTo(box.y, 0)
  expect(applyBox.x + applyBox.width).toBeCloseTo(box.x + box.width, 0)
  await expect(apply).toHaveCSS('font-size', '15px')
  await expect(apply).toHaveCSS('font-weight', '700')
})

test('mobile cart summary is the frame 40px sheet with 16px values and a 60px CTA', async ({
  page,
}) => {
  test.skip(!isMobile(page), 'a folha fixa do resumo é do carrinho mobile')
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  const sheet = page.getByRole('region', { name: 'Resumo da carteira' })
  // "Payment Summary" do frame: rx 40 sem contorno. Fixa sobre os cards (da mesma cor), ela
  // flutua na sombra da barra de compra para não sumir no card que passa por baixo.
  await expect(sheet).toHaveCSS('border-top-left-radius', '40px')
  await expectFrameShadow(sheet, '0px 0px 20px 0px')
  // Subtotal e Taxa em 16; o Total segue 18 bold.
  await expect(sheet.getByTestId('summary-subtotal')).toHaveCSS('font-size', '16px')
  await expect(sheet.getByTestId('summary-fee')).toHaveCSS('font-size', '16px')
  await expect(sheet.getByTestId('summary-total')).toHaveCSS('font-size', '18px')
  // ~11 px da pílula do cupom à linha do Subtotal e CTA de 60 px.
  const field = (await sheet.getByRole('textbox', { name: 'Código promocional' }).boundingBox())!
  const subtotalTop = await labelTop(sheet, 'summary-subtotal')
  expect(subtotalTop - (field.y + field.height)).toBeCloseTo(11, 0)
  const cta = (await sheet.getByRole('button', { name: 'Conectar e finalizar' }).boundingBox())!
  expect(cta.height).toBeCloseTo(60, 0)
})

/** Linha de base do primeiro texto: um inline-block vazio no começo da linha pousa nela. */
const baselineOf = (el: Locator) =>
  el.evaluate((node) => {
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0'
    node.prepend(probe)
    const y = probe.getBoundingClientRect().bottom + window.scrollY
    probe.remove()
    return y
  })

/** Posição do frame com 1 px de folga: o Figma posiciona em frações, o Chromium arredonda a fonte. */
function expectNear(actual: number, frame: number, what: string, tolerance = 1) {
  expect(Math.abs(actual - frame), `${what}: ${actual} (frame ${frame})`).toBeLessThanOrEqual(
    tolerance,
  )
}

test('desktop breadcrumbs are 15px bold on the frame baseline', async ({ page }) => {
  test.skip(isMobile(page), 'a trilha só aparece no desktop')
  await addToCart(page, 'nft_neon-vessel')
  const crumbs = page.getByRole('navigation', { name: 'Trilha' })
  // "Início / Mercado…" dos frames de Detalhes, Carrinho e Pagamento: 15 bold com base em y 114,8.
  for (const url of ['/nft/nft_neon-vessel', '/carrinho']) {
    await page.goto(url)
    await expect(crumbs).toHaveCSS('font-size', '15px')
    await expect(crumbs).toHaveCSS('font-weight', '700')
    expectNear(await baselineOf(crumbs), 114.8, url)
  }
  // No detalhe, miniaturas e moldura começam em y 129, 12 px abaixo da caixa da trilha.
  await page.goto('/nft/nft_neon-vessel')
  expectNear((await page.getByTestId('detail-hero').boundingBox())!.y, 129, 'detalhe')
  await openCheckout(page)
  await expect(crumbs).toHaveCSS('font-size', '15px')
  expectNear(await baselineOf(crumbs), 114.8, '/checkout')
})

const PRIMARY_HI = 'rgb(232, 155, 85)'

test('desktop cart table follows the frame columns, type and colors', async ({ page }) => {
  test.skip(isMobile(page), 'a tabela é do carrinho desktop; o mobile são cards')
  await addToCart(page, 'nft_neon-vessel')
  await addToCart(page, 'nft_eco-dourado')
  await page.goto('/carrinho')
  const main = page.getByRole('main')
  const head = main.getByText('NFTs', { exact: true }).locator('..')
  // Cabeçalhos 16 bold; a divisória deles e a do "Resumo da carteira" ficam na mesma linha, y 157.
  for (const cell of await head.locator('span').all()) {
    await expect(cell).toHaveCSS('font-size', '16px')
  }
  const headBox = (await head.boundingBox())!
  const titleBox = (await main.getByRole('heading', { name: 'Resumo da carteira' }).boundingBox())!
  expectNear(headBox.y + headBox.height, 157, 'divisória da tabela')
  expectNear(titleBox.y + titleBox.height, 157, 'divisória do resumo')
  // Colunas do frame: Preço em x 431,25, Quantidade em 569,5 e Total em 705,75.
  for (const [label, x] of [
    ['Preço', 431.25],
    ['Quantidade', 569.5],
    ['Total', 705.75],
  ] as const) {
    expectNear((await head.getByText(label, { exact: true }).boundingBox())!.x, x, label)
  }
  // Linhas de 70 px em y 169 e 251, arte com rx 6.
  const rows = main.getByRole('list', { name: 'Itens do carrinho' }).locator(':scope > li')
  await expect(rows).toHaveCount(2)
  expectNear((await rows.first().boundingBox())!.y, 169, 'item 1')
  expectNear((await rows.nth(1).boundingBox())!.y, 251, 'item 2')
  const row = rows.first()
  await expect(row.locator('img')).toHaveCSS('border-top-left-radius', '6px')
  // Nome 16 bold e, 21,2 px abaixo, a edição 14 em khaki.
  const name = row.getByRole('heading', { level: 3 })
  const edition = row.getByText(/^Edição:/)
  await expect(name).toHaveCSS('font-size', '16px')
  await expect(edition).toHaveCSS('color', KHAKI)
  expectNear((await baselineOf(edition)) - (await baselineOf(name)), 21.2, 'nome → edição')
  // Preço unitário 16 bold sand; o total da linha segue em primary-hi.
  const prices = row.locator('span[aria-hidden="true"]').filter({ hasText: 'ETH' })
  await expect(prices.first()).toHaveCSS('font-size', '16px')
  await expect(prices.first()).toHaveCSS('color', SAND)
  await expect(prices.nth(1)).toHaveCSS('color', PRIMARY_HI)
  // Lixeira em traço khaki, centrada em x 866,3.
  const trash = row.getByRole('button', { name: 'Remover Neon Vessel do carrinho' })
  await expect(trash).toHaveCSS('color', KHAKI)
  const trashBox = (await trash.boundingBox())!
  expectNear(trashBox.x + trashBox.width / 2, 866.3, 'lixeira')
})

test('desktop cart coupon is the frame 40px field with the apply button inside', async ({
  page,
}) => {
  test.skip(isMobile(page), 'o cupom mobile é a pílula de 50 px')
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  const label = page.locator('label', { hasText: 'Código promocional' })
  expectNear(await baselineOf(label), 194.4, 'rótulo')
  // "Promo Input" do frame: 332×40 em y 205, rx 3, contorno primary, placeholder 12 e sem sombra.
  const field = page.getByRole('textbox', { name: 'Código promocional' })
  const box = (await field.boundingBox())!
  expect([box.width, box.height]).toEqual([332, 40])
  expectNear(box.y, 205, 'campo')
  await expect(field).toHaveCSS('border-top-left-radius', '3px')
  await expect(field).toHaveCSS('border-top-color', PRIMARY)
  expect(await hasVisibleShadow(field)).toBe(false)
  expect(await placeholderSize(field)).toBe('12px')
  // "Aplicar" de 102×40 dentro do campo, na ponta direita: só os cantos direitos arredondados.
  const apply = page.getByRole('button', { name: 'Aplicar', exact: true })
  const applyBox = (await apply.boundingBox())!
  expect([applyBox.width, applyBox.height]).toEqual([102, 40])
  expect(applyBox.y).toBeCloseTo(box.y, 0)
  expect(applyBox.x + applyBox.width).toBeCloseTo(box.x + box.width, 0)
  await expect(apply).toHaveCSS('border-top-left-radius', '0px')
  await expect(apply).toHaveCSS('border-top-right-radius', '3px')
  await expect(apply).toHaveCSS('font-size', '15px')
  await expect(apply).toHaveCSS('font-weight', '700')
  await expect(apply).toHaveCSS('background-color', PRIMARY)
  await expect(apply).toHaveCSS('color', INK)
})

test('desktop cart summary and CTA sit on the frame baselines', async ({ page }) => {
  test.skip(isMobile(page), 'as posições são do frame desktop')
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  const main = page.getByRole('main')
  // Subtotal: rótulo com base em 284,8 e valor 18 em 284 (o 18 px arredonda a ascendente para 19).
  const subtotal = main.getByTestId('summary-subtotal')
  expectNear(await baselineOf(subtotal.locator('xpath=../../dt')), 284.8, 'rótulo do Subtotal')
  expectNear(await baselineOf(subtotal), 284, 'valor do Subtotal', 1.5)
  const total = main.getByTestId('summary-total').locator('xpath=../../dt')
  expectNear(await baselineOf(total), 419.2, 'rótulo do Total')
  // "Conectar e finalizar": 332×40 em y 445, rx 3, 15 bold.
  const cta = main.getByRole('button', { name: 'Conectar e finalizar' })
  const ctaBox = (await cta.boundingBox())!
  expect([ctaBox.width, ctaBox.height]).toEqual([332, 40])
  expectNear(ctaBox.y, 445, 'CTA')
  await expect(cta).toHaveCSS('border-top-left-radius', '3px')
  await expect(cta).toHaveCSS('font-size', '15px')
  // "Continuar explorando" 15 com base em 512,8.
  const more = main.getByRole('link', { name: 'Continuar explorando' })
  await expect(more).toHaveCSS('font-size', '15px')
  expectNear(await baselineOf(more), 512.8, 'Continuar explorando')
  // "Colecionadores também viram": 17 bold com base em 627,6, linha em 640,9 e cards em 673.
  const also = main.getByRole('heading', { name: 'Colecionadores também viram' })
  await expect(also).toHaveCSS('font-size', '17px')
  expectNear(await baselineOf(also), 627.6, 'Colecionadores')
  const alsoBox = (await also.boundingBox())!
  expectNear(alsoBox.y + alsoBox.height, 640.9, 'linha de Colecionadores')
  const cards = main.getByRole('region', { name: 'Colecionadores também viram' }).getByRole('list')
  expectNear((await cards.boundingBox())!.y, 673, 'cards')
})

/** Início do primeiro texto (x), pelo mesmo inline-block vazio do `baselineOf`. */
const textLeftOf = (el: Locator) =>
  el.evaluate((node) => {
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0'
    node.prepend(probe)
    const x = probe.getBoundingClientRect().left
    probe.remove()
    return x
  })

test('desktop order confirmation is the frame modal on the opaque ink page', async ({ page }) => {
  test.skip(isMobile(page), 'o recibo só é modal no desktop')
  await page.clock.install()
  await openCheckout(page)
  await addToCart(page, 'nft_eco-dourado')
  await page.goto('/checkout')
  await placeOrder(page)
  await page.clock.fastForward(3000)
  const dialog = page.getByRole('dialog', { name: 'Pedido confirmado' })
  await expect(dialog).toBeVisible()
  // O BG #140D0A do frame cobre a página inteira; o modal de 578 px fica em (431, 166).
  const overlay = page.locator('[data-slot="dialog-overlay"]')
  await expect(overlay).toHaveCSS('background-color', INK)
  const box = (await dialog.boundingBox())!
  expect(box.width).toBe(578)
  expectNear(box.x, 431, 'x do modal')
  expectNear(box.y, 166, 'y do modal')
  // Envelope em y 188 e subtítulo 16 bold com base em 298,2.
  const icon = dialog.getByRole('img', { name: 'Thank you' })
  expectNear((await icon.boundingBox())!.y, 188, 'envelope')
  expectNear(
    await baselineOf(dialog.getByText('Seus NFTs agora estão na sua carteira')),
    298.2,
    'subtítulo',
  )
  // Metadados entre as linhas de y 322 e 388: rótulos 14 com base 350,9 e valores 15 com base 369,3.
  const meta = dialog.locator('dl')
  const metaBox = (await meta.boundingBox())!
  expectNear(metaBox.y, 322, 'linha de cima')
  expectNear(metaBox.y + metaBox.height, 389, 'linha de baixo')
  const label = meta.locator('dt').first()
  const value = meta.locator('dd').first()
  await expect(label).toHaveCSS('font-size', '14px')
  await expect(value).toHaveCSS('font-size', '15px')
  expectNear(await baselineOf(label), 350.9, 'rótulos')
  expectNear(await baselineOf(value), 369.3, 'valores')
  expectNear((await label.boundingBox())!.x, 467, 'primeira coluna')
  // "Detalhes da transação" 15 bold em x 475 com base 422,8.
  const details = dialog.getByRole('heading', { name: 'Detalhes da transação' })
  await expect(details).toHaveCSS('font-size', '15px')
  expectNear(await baselineOf(details), 422.8, 'Detalhes da transação')
  // Cabeçalho 16 ("Subtotal" em 500) com base 451,2 e a linha logo abaixo, em 465.
  const table = dialog.getByRole('table', { name: 'Itens do pedido' })
  const nfts = table.getByRole('columnheader', { name: 'NFTs' })
  const subtotal = table.getByRole('columnheader', { name: 'Subtotal' })
  await expect(nfts).toHaveCSS('font-size', '16px')
  await expect(subtotal).toHaveCSS('font-size', '16px')
  await expect(subtotal).toHaveCSS('font-weight', '500')
  expectNear(await baselineOf(nfts), 451.2, 'cabeçalho')
  const headBox = (await table.locator('thead tr').boundingBox())!
  expectNear(headBox.y + headBox.height, 465, 'linha do cabeçalho')
  // Itens de 70 px a cada 82 a partir de y 477, arte com rx 8, nome 16 bold.
  const arts = table.locator('tbody img')
  await expect(arts).toHaveCount(2)
  const first = (await arts.first().boundingBox())!
  const last = (await arts.last().boundingBox())!
  expectNear(first.y, 477, 'item 1')
  expectNear(last.y - first.y, 82, 'passo dos itens')
  await expect(arts.first()).toHaveCSS('border-top-left-radius', '8px')
  await expect(table.locator('tbody tr').first().locator('p').first()).toHaveCSS(
    'font-size',
    '16px',
  )
  // Totais em x 644: "Taxa de rede" 15 com base 27,8 abaixo do último item e "Total" 16 bold
  // 30,4 abaixo dela; a linha fica 13,65 abaixo do Total.
  const itemsEnd = last.y + last.height
  const fee = table.getByRole('rowheader', { name: 'Taxa de rede' })
  const total = table.getByRole('rowheader', { name: 'Total' })
  expectNear(await textLeftOf(fee), 644, 'x da Taxa de rede')
  expectNear(await textLeftOf(total), 644, 'x do Total')
  await expect(total).toHaveCSS('font-size', '16px')
  const feeBase = await baselineOf(fee)
  const totalBase = await baselineOf(total)
  expectNear(feeBase - itemsEnd, 27.8, 'Taxa de rede')
  expectNear(totalBase - feeBase, 30.4, 'Total')
  const tableBox = (await table.boundingBox())!
  expectNear(tableBox.y + tableBox.height - totalBase, 14.2, 'linha do Total')
  // Nota 14 em 3 linhas de 22 px, como no frame, com a primeira base 28,4 abaixo da linha.
  const note = dialog.getByText(/^Transação confirmada na/)
  await expect(note).toHaveCSS('line-height', '22px')
  const noteBox = (await note.boundingBox())!
  expect(noteBox.height).toBe(66)
  expectNear((await baselineOf(note)) - (tableBox.y + tableBox.height), 28.4, 'nota')
  // "Ver no Etherscan": 48 de altura, rx 5, 16 bold, 20 px abaixo da nota; a faixa primary de
  // 10 px vem 48 px depois e fecha o modal.
  const etherscan = dialog.getByRole('link', { name: /Ver no Etherscan/ })
  const ethBox = (await etherscan.boundingBox())!
  expect(ethBox.height).toBe(48)
  expectNear(ethBox.y - (noteBox.y + noteBox.height), 20, 'Etherscan')
  await expect(etherscan).toHaveCSS('border-top-left-radius', '5px')
  await expect(etherscan).toHaveCSS('font-size', '16px')
  expectNear(box.y + box.height - (ethBox.y + ethBox.height), 58, 'faixa do rodapé')
})

/**
 * Linha de base do primeiro texto num contêiner flex (rótulos, itens da sidebar): lá o inline-block
 * do `baselineOf` viraria um item flex. Embrulha o texto num `span` só durante a medida.
 */
const textBaselineOf = (el: Locator) =>
  el.evaluate((node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    let text = walker.nextNode() as Text | null
    while (text && !text.textContent?.trim()) text = walker.nextNode() as Text | null
    if (!text) throw new Error('sem texto')
    const wrap = document.createElement('span')
    text.before(wrap)
    wrap.append(text)
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0'
    wrap.prepend(probe)
    const y = probe.getBoundingClientRect().bottom + window.scrollY
    wrap.before(text)
    wrap.remove()
    return y
  })

const AVATAR_PNG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets/avatar.png')

test('desktop profile follows the frame sidebar, rows, avatar and buttons', async ({ page }) => {
  test.skip(isMobile(page), 'o Figma não tem os formulários de perfil e pagamento no mobile')
  await page.goto('/perfil')
  await login(page, 'ana@kurio.test')
  const main = page.getByRole('main')
  const field = (label: string) => main.getByLabel(label, { exact: true })
  const label = (text: string) => main.locator('label').getByText(text, { exact: true })
  const top = async (el: Locator) => (await el.boundingBox())!.y
  await expect(field('Nome de exibição')).toHaveValue('Ana Souza')

  // Sidebar de 310×407 em y 101; "Meu perfil" 18 bold e itens de 45 px a partir de y 145.
  const nav = page.getByRole('navigation', { name: 'Meu perfil' })
  const navBox = (await nav.boundingBox())!
  expectNear(navBox.y, 101, 'topo da sidebar')
  expectNear(navBox.height, 407, 'altura da sidebar')
  const title = nav.getByRole('heading', { name: 'Meu perfil' })
  await expect(title).toHaveCSS('font-size', '18px')
  expectNear(await baselineOf(title), 134, 'base de "Meu perfil"')
  const active = nav.getByRole('link', { name: 'Dados do perfil' })
  expectNear(await top(active), 145, 'item ativo')
  expectNear(await textBaselineOf(active), 173.3, 'base de "Dados do perfil"')
  // A marca do item ativo: barra #D28A4C de 6 px na borda esquerda.
  expect(await active.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(
    'rgb(210, 138, 76) 6px 0px 0px 0px inset',
  )
  expectNear(
    await textBaselineOf(nav.getByRole('button', { name: 'Sair' })),
    485.8,
    'base de "Sair"',
  )

  // Título 16 bold; três linhas de campos a cada 103 px, rótulo a 18,7 px do topo do campo.
  const heading = page.getByRole('heading', { name: 'Perfil do colecionador' })
  await expect(heading).toHaveCSS('font-size', '16px')
  await expect(heading).toHaveCSS('font-weight', '700')
  expectNear(await baselineOf(heading), 115.2, 'base do título')
  for (const [name, base, y] of [
    ['Nome de exibição', 169.3, 188],
    ['E-mail', 272.3, 291],
    ['Apelido da carteira', 375.3, 394],
  ] as const) {
    expectNear(await textBaselineOf(label(name)), base, `base de "${name}"`)
    expectNear(await top(field(name)), y, `campo "${name}"`)
  }
  // O asterisco de 22 px fica 2,7 px abaixo da base do rótulo, e o campo opcional ao lado não desce.
  const star = label('Nome de exibição').locator('xpath=following-sibling::span[1]')
  expectNear(
    (await textBaselineOf(star)) - (await textBaselineOf(label('Nome de exibição'))),
    2.7,
    'asterisco',
  )
  expect(await top(field('Nome ENS'))).toBe(await top(field('E-mail')))

  // Avatar: rótulo em 368,3, círculo de 50 px em y 380, "Alterar" 98×40 r3 14 bold em (977, 385).
  const avatarGroup = main.getByRole('group', { name: 'Avatar' })
  expectNear(
    await baselineOf(avatarGroup.getByText('Avatar', { exact: true })),
    368.3,
    'rótulo Avatar',
  )
  const circle = avatarGroup.locator('span.rounded-full')
  const circleBox = (await circle.boundingBox())!
  expectNear(circleBox.y, 380, 'círculo do avatar')
  expect([circleBox.width, circleBox.height]).toEqual([50, 50])
  const change = avatarGroup.getByRole('button', { name: 'Alterar avatar' })
  const changeBox = (await change.boundingBox())!
  expect([changeBox.width, changeBox.height]).toEqual([98, 40])
  expectNear(changeBox.x, 977, '"Alterar" x')
  expectNear(changeBox.y, 385, '"Alterar" y')
  await expect(change).toHaveCSS('border-top-left-radius', '3px')
  await expect(change).toHaveCSS('font-size', '14px')
  await expect(change).toHaveCSS('font-weight', '700')

  // "Alterar senha" 16/500 em 480,2; campos de senha a cada 91 px a partir de y 533.
  const legend = main.locator('legend', { hasText: 'Alterar senha' })
  await expect(legend).toHaveCSS('font-size', '16px')
  await expect(legend).toHaveCSS('font-weight', '500')
  expectNear(await baselineOf(legend), 480.2, 'base de "Alterar senha"')
  expectNear(await textBaselineOf(label('Senha atual')), 519.3, 'base de "Senha atual"')
  for (const [name, y] of [
    ['Senha atual', 533],
    ['Confirmar nova senha', 715],
  ] as const) {
    expectNear(await top(field(name)), y, `campo "${name}"`)
  }

  // "Salvar" 131×40 r3 14 bold em (458, 787).
  const save = main.getByRole('button', { name: 'Salvar', exact: true })
  const saveBox = (await save.boundingBox())!
  expect([saveBox.width, saveBox.height]).toEqual([131, 40])
  expectNear(saveBox.x, 458, '"Salvar" x')
  expectNear(saveBox.y, 787, '"Salvar" y')
  await expect(save).toHaveCSS('border-top-left-radius', '3px')
  await expect(save).toHaveCSS('font-size', '14px')

  // Com avatar salvo, "Remover" aparece em 14 regular, 20 px depois do "Alterar" (x 1095).
  await page.locator('input[name="avatar"]').setInputFiles(AVATAR_PNG)
  const remove = avatarGroup.getByRole('button', { name: 'Remover avatar' })
  await expect(remove).toBeVisible()
  await expect(remove).toHaveCSS('font-size', '14px')
  await expect(remove).toHaveCSS('font-weight', '400')
  expectNear((await remove.boundingBox())!.x, 1095, '"Remover" x')
})

test('desktop wallets follow the frame titles, 89px rows and secondary actions', async ({
  page,
}) => {
  test.skip(isMobile(page), 'o Figma não tem os formulários de perfil e pagamento no mobile')
  await page.goto('/perfil/carteiras')
  await login(page, 'ana@kurio.test')
  const primary = page.getByRole('region', { name: 'Carteira principal' })
  const secondary = page.getByRole('region', { name: 'Carteira secundária' })
  const label = (text: string) => primary.locator('label').getByText(text, { exact: true })
  const top = async (el: Locator) => (await el.boundingBox())!.y
  await expect(primary.getByLabel('Nome de exibição', { exact: true })).toHaveValue('Ana Souza')

  // "Carteira principal" 17 bold em 115,6; o texto de apoio 14 em 137,9.
  const title = primary.getByRole('heading', { name: 'Carteira principal' })
  await expect(title).toHaveCSS('font-size', '17px')
  await expect(title).toHaveCSS('font-weight', '700')
  expectNear(await baselineOf(title), 115.6, 'base de "Carteira principal"')
  const intro = primary.getByText('Estas carteiras ficam disponíveis', { exact: false })
  await expect(intro).toHaveCSS('font-size', '14px')
  expectNear(await baselineOf(intro), 137.9, 'base do texto de apoio')

  // Linhas a cada 89 px, com a base do rótulo 4,7 px acima do campo; a coluna da direita acompanha.
  const rows = [
    ['Nome de exibição', 'Apelido da carteira'],
    ['Rede', 'Nome do perfil'],
    ['Endereço da carteira', 'ENS ou carteira secundária (opcional)'],
    ['Tipo de carteira', 'Código de indicação'],
    ['E-mail', 'Nome ENS'],
  ] as const
  const control = (name: string) =>
    name === 'Rede' || name === 'Tipo de carteira'
      ? primary.getByRole('combobox', { name })
      : primary.getByLabel(name, { exact: true })
  for (const [i, [left, right]] of rows.entries()) {
    expectNear(await textBaselineOf(label(left)), 192.3 + 89 * i, `base de "${left}"`)
    expectNear(await top(control(left)), 197 + 89 * i, `campo "${left}"`)
    expect(await top(control(right)), `campo "${right}"`).toBe(await top(control(left)))
  }

  // "Salvar carteira" 131×40 r3 14 bold em (458, 625).
  const save = primary.getByRole('button', { name: 'Salvar carteira' })
  const saveBox = (await save.boundingBox())!
  expect([saveBox.width, saveBox.height]).toEqual([131, 40])
  expectNear(saveBox.x, 458, '"Salvar carteira" x')
  expectNear(saveBox.y, 625, '"Salvar carteira" y')
  await expect(save).toHaveCSS('border-top-left-radius', '3px')
  await expect(save).toHaveCSS('font-size', '14px')
  await expect(save).toHaveCSS('font-weight', '700')

  // Secundária: título 17 em 711,6; círculo de 16 px com contorno primary de 1,5 centrado em
  // y 705, 8 px antes do texto 14; "Adicionar" 16/500, 8,6 px depois do texto.
  const secondaryTitle = secondary.getByRole('heading', { name: 'Carteira secundária' })
  await expect(secondaryTitle).toHaveCSS('font-size', '17px')
  expectNear(await baselineOf(secondaryTitle), 711.6, 'base de "Carteira secundária"')
  const same = secondary.getByRole('checkbox', { name: 'Igual à carteira principal' })
  const sameBox = (await same.boundingBox())!
  expect([sameBox.width, sameBox.height]).toEqual([16, 16])
  expectNear(sameBox.y + sameBox.height / 2, 705, 'centro do círculo')
  // Anel e não borda: o Chromium arredonda a largura da borda para 1 px em tela 1x.
  expect(await same.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(
    'rgb(210, 138, 76) 0px 0px 0px 1.5px inset',
  )
  const sameLabel = secondary.locator('label', { hasText: 'Igual à carteira principal' })
  await expect(sameLabel).toHaveCSS('font-size', '14px')
  expectNear(await textBaselineOf(sameLabel), 710.4, 'base de "Igual à carteira principal"')
  const sameLabelBox = (await sameLabel.boundingBox())!
  expectNear(sameLabelBox.x - (sameBox.x + sameBox.width), 8, 'círculo → texto')
  const add = secondary.getByRole('button', { name: 'Adicionar carteira secundária' })
  await expect(add).toHaveCSS('font-size', '16px')
  await expect(add).toHaveCSS('font-weight', '500')
  expectNear(await textBaselineOf(add), 711.2, 'base de "Adicionar"')
  const addBox = (await add.boundingBox())!
  expectNear(addBox.x - (sameLabelBox.x + sameLabelBox.width), 8.6, 'texto → "Adicionar"')
  const empty = secondary.getByText('Você ainda não adicionou uma carteira secundária.')
  await expect(empty).toHaveCSS('font-size', '14px')
  expectNear(await baselineOf(empty), 737.9, 'base do texto da secundária vazia')
})

test('mobile hero is the frame 190px card with the glow, type and art of the mask group', async ({
  page,
}) => {
  test.skip(!isMobile(page), 'o card compacto do hero é do frame mobile')
  await page.goto('/')
  const region = page.getByRole('region', { name: 'Destaques' })
  const slide = region.getByRole('group', { name: '1 de 3' }).locator(':scope > div')
  const hero = (await slide.boundingBox())!
  // Medidas relativas ao card (x 24, y 101 no frame de 414; o E2E roda em 390).
  expect(hero.height).toBeCloseTo(190, 0)
  await expect(slide).toHaveCSS('border-top-left-radius', '30px')
  const background = await slide.evaluate((el) => getComputedStyle(el).backgroundImage)
  expect(background).toContain('rgba(210, 138, 76, 0.2)')
  expect(background).toContain('rgba(210, 138, 76, 0.1)')
  // Dois círculos de r 124 em degradê #DD9A5F, recortados pelo card.
  const glows = slide.locator(':scope > [aria-hidden="true"]')
  await expect(glows).toHaveCount(2)
  for (const glow of await glows.all()) {
    const box = (await glow.boundingBox())!
    expect(box.width).toBeCloseTo(248, 0)
    expect(box.height).toBeCloseTo(248, 0)
    expect(await glow.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
      'rgba(221, 154, 95',
    )
  }
  expectNear((await glows.nth(0).boundingBox())!.x - hero.x, -80, 'círculo da esquerda')
  expectNear((await glows.nth(1).boundingBox())!.y - hero.y, -10, 'círculo da direita')

  const eyebrow = slide.getByText('Bem-vindo à Kurio')
  await expect(eyebrow).toHaveCSS('font-size', '12px')
  await expect(eyebrow).toHaveCSS('font-weight', '500')
  expectNear((await textLeftOf(eyebrow)) - hero.x, 16, 'margem do texto')
  expectNear((await baselineOf(eyebrow)) - hero.y, 18.2, 'base de "Bem-vindo à Kurio"')
  const title = slide.getByRole('heading', { level: 2 })
  await expect(title).toHaveCSS('font-size', '18px')
  await expect(title).toHaveCSS('line-height', '29px')
  expectNear((await baselineOf(title)) - hero.y, 49, 'base do título')
  const text = slide.locator('h2 + p')
  await expect(text).toHaveCSS('font-size', '12px')
  await expect(text).toHaveCSS('line-height', '18px')
  expectNear((await baselineOf(text)) - hero.y, 105.2, 'base da descrição')
  // "EXPLORAR" logo abaixo da descrição: base 13 px depois do fim do bloco (158,2 − 145,2).
  const explore = slide.getByRole('link', { name: /EXPLORAR/ })
  await expect(explore).toHaveCSS('font-size', '12px')
  await expect(explore).toHaveCSS('letter-spacing', 'normal')
  const textBox = (await text.boundingBox())!
  expectNear(
    (await textBaselineOf(explore)) - (textBox.y + textBox.height),
    13,
    'base de "EXPLORAR"',
  )
  const arrow = explore.locator('svg')
  await expect(arrow).toHaveCSS('color', PRIMARY)
  await expect(arrow).toHaveCSS('stroke-width', '1.5px')

  // Arte de 138 com r16 a 10,5 px do topo e 16 px da borda; miniatura de 58 sem contorno.
  const art = slide.getByRole('img', { name: /Macaco de pelo castanho/ })
  const artBox = (await art.boundingBox())!
  expect(artBox.width).toBeCloseTo(138, 0)
  await expect(art).toHaveCSS('border-top-left-radius', '16px')
  expectNear(artBox.y - hero.y, 10.5, 'topo da arte')
  expectNear(hero.x + hero.width - (artBox.x + artBox.width), 16, 'margem direita da arte')
  // Título em duas linhas mesmo em 390: a coluna vai até 6 px da arte.
  expect((await title.boundingBox())!.height).toBeCloseTo(58, 0)
  const thumb = slide.locator('img[alt=""]')
  const thumbBox = (await thumb.boundingBox())!
  expect(thumbBox.width).toBeCloseTo(58, 0)
  await expect(thumb).toHaveCSS('border-top-left-radius', '16px')
  await expect(thumb).toHaveCSS('border-top-width', '0px')
  expectNear(thumbBox.x - artBox.x, 14, 'miniatura → borda da arte')
  expectNear(
    thumbBox.y + thumbBox.height - (artBox.y + artBox.height),
    8,
    'miniatura abaixo da arte',
  )

  // Pontos de 7 px a 9 px da base, centrados no card; os alvos de 24 px ficam encostados.
  const dots = region.getByRole('button', { name: /Ir para o destaque/ }).locator('span')
  const centers = await Promise.all(
    (await dots.all()).map(async (dot) => {
      const box = (await dot.boundingBox())!
      expect(box.width).toBeCloseTo(7, 0)
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }),
  )
  expectNear(centers[1]!.x, hero.x + hero.width / 2, 'ponto do meio no centro do card')
  expectNear(centers[1]!.x - centers[0]!.x, 24, 'espaço entre os pontos')
  expectNear(hero.y + hero.height - centers[0]!.y, 9, 'pontos acima da base do card')

  // Na largura do frame (414) a descrição quebra como lá: 26 caracteres, três linhas.
  await page.setViewportSize({ width: 414, height: 896 })
  expect((await text.boundingBox())!.height).toBeCloseTo(54, 0)
  expect((await title.boundingBox())!.height).toBeCloseTo(58, 0)
})

test('mobile search is the frame 45px r10 field with the khaki placeholder and the 45px filter', async ({
  page,
}) => {
  test.skip(!isMobile(page), 'a busca com o filtro ao lado é do topo mobile')
  await page.goto('/')
  const search = page.getByRole('searchbox', { name: 'Buscar NFTs' }).filter({ visible: true })
  const box = (await search.boundingBox())!
  expect(box.height).toBeCloseTo(45, 0)
  await expect(search).toHaveCSS('border-top-left-radius', '10px')
  await expect(search).toHaveCSS('background-color', 'rgb(36, 22, 18)')
  // Placeholder e lupa #B39463, texto 14 negrito a 42 px da borda (x 66 − 24 no frame).
  const placeholder = await search.evaluate((el) => {
    const style = getComputedStyle(el, '::placeholder')
    return [style.color, style.fontWeight, style.fontSize]
  })
  expect(placeholder).toEqual([KHAKI, '700', '14px'])
  await expect(search).toHaveCSS('padding-left', '42px')
  const lupa = search.locator('..').locator('svg')
  const lupaBox = (await lupa.boundingBox())!
  expect(lupaBox.width).toBeCloseTo(22, 0)
  await expect(lupa).toHaveCSS('color', KHAKI)
  expectNear(lupaBox.x - box.x, 12, 'lupa → borda da busca')
  expectNear(lupaBox.y + lupaBox.height / 2, box.y + box.height / 2, 'lupa no meio da busca')
  // Filtro 45×45 r14 a 8 px da busca. O vetor do frame começa fora do botão: 56% → 100%.
  const filter = page.getByRole('button', { name: 'Filtros' })
  const filterBox = (await filter.boundingBox())!
  expect(filterBox.width).toBeCloseTo(45, 0)
  expect(filterBox.height).toBeCloseTo(45, 0)
  await expect(filter).toHaveCSS('border-top-left-radius', '14px')
  expectNear(filterBox.x - (box.x + box.width), 8, 'busca → filtro')
  const fill = await filter.evaluate((el) => getComputedStyle(el).backgroundImage)
  expect(fill).toBe('linear-gradient(137deg, rgba(210, 138, 76, 0.56), rgb(210, 138, 76))')
  await expect(filter.locator('svg')).toHaveCSS('stroke-width', '1.5px')
})
