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
