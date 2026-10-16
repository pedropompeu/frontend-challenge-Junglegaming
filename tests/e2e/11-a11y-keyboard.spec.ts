import type { Locator, Page } from '@playwright/test'
import { expect, isMobile, test } from './fixtures'
import { addToCart, login } from './helpers/mocks'

const cards = (page: Page) => page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')

/**
 * Descreve o elemento focado quando o foco não aparece. O indicador pode estar no próprio
 * elemento ou no `::after` (o link do card desenha o contorno sobre o card inteiro).
 */
function focusProblem(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return 'foco perdido no <body>'
    const shows = (s: CSSStyleDeclaration) =>
      s.outlineStyle !== 'none' && Number.parseFloat(s.outlineWidth) > 0
    if (shows(getComputedStyle(el)) || shows(getComputedStyle(el, '::after'))) return null
    const name = el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? ''
    return `<${el.tagName.toLowerCase()}> "${name}" sem contorno de foco`
  })
}

/** Tab até `target` ficar focado, conferindo o indicador de foco em cada parada. */
async function tabTo(page: Page, target: Locator, max = 80) {
  const problems: string[] = []
  for (let i = 0; i < max; i += 1) {
    await page.keyboard.press('Tab')
    const problem = await focusProblem(page)
    if (problem) problems.push(problem)
    if (await target.evaluate((el) => el === document.activeElement)) {
      expect(problems).toEqual([])
      return
    }
  }
  throw new Error(`O Tab não chegou ao alvo em ${max} paradas`)
}

/** Tab e Shift+Tab várias voltas: o foco nunca sai do diálogo. */
async function expectFocusTrapped(page: Page, dialog: Locator) {
  const inside = () => dialog.evaluate((el) => el.contains(document.activeElement))
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press(key)
      expect(await inside(), `${key} #${i + 1} levou o foco para fora do diálogo`).toBe(true)
    }
  }
}

async function openWithKeyboard(trigger: Locator) {
  await trigger.focus()
  await trigger.press('Enter')
}

test('keyboard-only purchase path has visible focus', async ({ page }) => {
  await page.goto('/')
  await expect(cards(page).first()).toBeVisible()
  const card = cards(page).first().getByRole('link')
  const name = await card.innerText()
  await tabTo(page, card)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()

  await tabTo(page, page.getByRole('button', { name: 'Adicionar ao carrinho' }))
  await page.keyboard.press('Enter')
  await expect(page.getByText(/adicionado ao carrinho/i).first()).toBeVisible()
})

test('dialogs trap focus and restore it', async ({ page }) => {
  await page.goto('/nft/nft_neon-vessel')
  const zoom = page.getByRole('button', { name: 'Ampliar imagem' })
  await openWithKeyboard(zoom)
  const image = page.getByRole('dialog', { name: 'Neon Vessel' })
  await expect(image).toBeVisible()
  await expectFocusTrapped(page, image)
  await page.keyboard.press('Escape')
  await expect(image).toBeHidden()
  await expect(zoom).toBeFocused()

  await page.goto('/')
  await expect(cards(page).first()).toBeVisible()
  if (isMobile(page)) {
    // No mobile o login é uma tela cheia; o diálogo da Início é a gaveta de filtros.
    const trigger = page.getByRole('button', { name: 'Filtros' })
    await openWithKeyboard(trigger)
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    await expectFocusTrapped(page, sheet)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
  } else {
    const trigger = page.getByRole('banner').getByRole('link', { name: 'Entrar' })
    await openWithKeyboard(trigger)
    const auth = page.getByRole('dialog', { name: 'Entrar na Kurio' })
    await expect(auth).toBeVisible()
    await expectFocusTrapped(page, auth)
    await page.keyboard.press('Escape')
    await expect(auth).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
    await expect(trigger).toBeFocused()
  }

  const panel = page.getByRole('button', { name: 'Cenários (demo)' })
  await openWithKeyboard(panel)
  const sheet = page.getByRole('dialog', { name: 'Cenários de demonstração' })
  await expect(sheet).toBeVisible()
  await expectFocusTrapped(page, sheet)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(panel).toBeFocused()
})

/** Todo campo inválido aponta (`aria-describedby`) para um texto de erro visível. */
async function expectErrorsAssociated(page: Page, fields: string[]) {
  for (const label of fields) {
    const field = page.getByLabel(label, { exact: true })
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    const description = await field.evaluate((el) => {
      const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
      const missing = ids.filter((id) => !document.getElementById(id))
      const text = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
      return { missing, text: text.trim() }
    })
    expect(description.missing, `${label}: aria-describedby aponta para ids inexistentes`).toEqual(
      [],
    )
    expect(description.text, `${label}: sem texto de erro associado`).not.toBe('')
  }
}

test('form errors are associated and announced', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expectErrorsAssociated(page, ['E-mail', 'Senha'])
  // O foco vai ao primeiro campo inválido: o leitor de tela anuncia o rótulo e o erro dele.
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused()

  await page.getByLabel('E-mail', { exact: true }).fill('ana@')
  await page.getByLabel('Senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expectErrorsAssociated(page, ['E-mail'])
  await expect(page.getByLabel('Senha', { exact: true })).not.toHaveAttribute(
    'aria-invalid',
    'true',
  )
  // Um campo válido não aponta para descrições que não existem.
  const dangling = await page
    .getByLabel('Senha', { exact: true })
    .evaluate((el) =>
      (el.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((id) => id && !document.getElementById(id)),
    )
  expect(dangling).toEqual([])

  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expectErrorsAssociated(page, ['Nome de usuário', 'E-mail', 'Senha', 'Confirmar senha'])
})

test('page has no horizontal overflow at 200% zoom', async ({ page }) => {
  test.skip(
    isMobile(page),
    'Zoom de 200% sobre a janela de 1440 px: o mobile já é coberto a 390 px',
  )
  // 1440×900 com 200% de zoom deixa 720×450 px CSS para o layout.
  await page.setViewportSize({ width: 720, height: 450 })
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  await addToCart(page, 'nft_neon-vessel')
  for (const path of ['/', '/nft/nft_neon-vessel', '/carrinho', '/entrar', '/cadastro']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(await overflow(), path).toBeLessThanOrEqual(0)
  }

  await page.goto('/entrar?redirect=%2Fcheckout')
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/checkout$/)
  for (const path of ['/checkout', '/perfil', '/perfil/carteiras', '/favoritos']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect(await overflow(), path).toBeLessThanOrEqual(0)
  }
})

/** Níveis de heading na ordem do DOM (inclui os `sr-only`; ignora os ocultos e os `aria-hidden`). */
function skippedHeadings(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')]
      .filter((el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'))
      .map((el) => ({
        level: Number(el.getAttribute('aria-level') ?? el.tagName.slice(1)),
        text: el.textContent?.trim().slice(0, 40) ?? '',
      }))
    return headings.flatMap((h, i) =>
      i > 0 && h.level > headings[i - 1]!.level + 1
        ? [`h${headings[i - 1]!.level} "${headings[i - 1]!.text}" → h${h.level} "${h.text}"`]
        : [],
    )
  })
}

test('headings never skip a level on the main screens', async ({ page }) => {
  await page.goto('/entrar?redirect=%2Fnft%2Fnft_neon-vessel')
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/nft\/nft_neon-vessel$/)
  await addToCart(page, 'nft_neon-vessel')
  const screens = [
    ['/', page.getByRole('list', { name: 'NFTs' }).getByRole('listitem').first()],
    ['/nft/nft_neon-vessel', page.getByRole('heading', { level: 1, name: 'Neon Vessel' })],
    ['/carrinho', page.getByTestId('summary-total')],
    ['/checkout', page.getByTestId('summary-total')],
  ] as const
  for (const [path, ready] of screens) {
    await page.goto(path)
    await expect(ready).toBeVisible()
    expect(await skippedHeadings(page), path).toEqual([])
  }
})
