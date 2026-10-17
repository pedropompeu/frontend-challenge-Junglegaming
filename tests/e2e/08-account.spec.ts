import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Locator, Page } from '@playwright/test'
import { addToCart } from './cart-helpers'
import { DEMO_PASSWORD, expect, isMobile, login, test } from './fixtures'

const AVATAR_PNG = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets/avatar.png')
const ANA_ADDRESS = '0x8f3a21c4b9e07d5a6c12f0e9b4d7a3c5e1f2b6d9'
const OTHER_ADDRESS = '0x1111111111111111111111111111111111111111'

async function openAccount(page: Page, to = '/perfil', email = 'ana@kurio.test') {
  await page.goto(to)
  await login(page, email)
  await expect(page).toHaveURL(new RegExp(`${to.replace('?', '\\?')}$`))
}

const main = (page: Page) => page.getByRole('main')
const field = (scope: Page | Locator, label: string) =>
  ('goto' in scope ? main(scope) : scope).getByLabel(label, { exact: true })
const toast = (page: Page, text: string | RegExp) =>
  page.locator('[data-sonner-toast]').filter({ hasText: text })

/** O que o servidor simulado gravou (a verdade, não o que a tela mostra). */
function storedProfile(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('kurio:mockdb:v2')
    const db = raw
      ? (JSON.parse(raw) as { profiles: Record<string, { avatarUrl: string | null }> })
      : null
    return db?.profiles.usr_ana ?? null
  })
}

async function chooseOption(scope: Locator, label: string, option: string) {
  await scope.getByRole('combobox', { name: label }).click()
  await scope.page().getByRole('option', { name: option, exact: true }).click()
}

test('edit profile persists after reload', async ({ page }) => {
  await openAccount(page)
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Souza')
  await expect(field(page, 'Nome de usuário')).toHaveValue('ana_kurio')

  // Validação local: o erro fica no campo e recebe o foco.
  await field(page, 'Nome de usuário').fill('Ana Kurio')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(field(page, 'Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
  await expect(field(page, 'Nome de usuário')).toBeFocused()

  // Conflito do servidor vai para o campo.
  await field(page, 'Nome de usuário').fill('bruno_lima')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(main(page).getByText('Este nome de usuário já está em uso')).toBeVisible()
  await expect(field(page, 'Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

  await field(page, 'Nome de exibição').fill('Ana Colecionadora')
  await field(page, 'Nome de usuário').fill('ana_colecionadora')
  await field(page, 'Nome ENS').fill('anacoleciona')
  await field(page, 'Apelido da carteira').fill('Cofre')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(toast(page, 'Perfil atualizado')).toBeVisible()
  if (!isMobile(page)) {
    // O header usa a sessão: o nome novo aparece sem recarregar.
    await expect(page.getByRole('button', { name: 'Conta de Ana Colecionadora' })).toBeVisible()
  }

  await page.reload()
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Colecionadora')
  await expect(field(page, 'Nome de usuário')).toHaveValue('ana_colecionadora')
  await expect(field(page, 'Nome ENS')).toHaveValue('anacoleciona')
  await expect(field(page, 'Apelido da carteira')).toHaveValue('Cofre')

  // Itens da sidebar fora do escopo: visíveis, mas avisam em vez de aparentar sucesso.
  const nav = page.getByRole('navigation', { name: 'Meu perfil' })
  const activity = nav.getByRole('button', { name: 'Atividade' })
  await expect(activity).toHaveAttribute('aria-disabled', 'true')
  // O Playwright não clica em `aria-disabled` (semântica correta); o usuário ainda pode clicar.
  await activity.click({ force: true })
  await expect(toast(page, 'Indisponível nesta demonstração')).toBeVisible()
  await expect(page).toHaveURL(/\/perfil$/)
})

test('avatar upload and removal', async ({ page }) => {
  await openAccount(page)
  const avatar = main(page).getByRole('img', { name: 'Seu avatar' })
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Souza')
  await expect(avatar).toHaveCount(0)

  // Formato fora da lista: erro no campo, nada enviado.
  let chooser = page.waitForEvent('filechooser')
  await main(page).getByRole('button', { name: 'Alterar' }).click()
  await (
    await chooser
  ).setFiles({
    name: 'nota.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('não é imagem'),
  })
  await expect(main(page).getByText('Use uma imagem PNG, JPEG ou WebP')).toBeVisible()
  expect((await storedProfile(page))?.avatarUrl).toBeNull()

  chooser = page.waitForEvent('filechooser')
  await main(page).getByRole('button', { name: 'Alterar' }).click()
  await (await chooser).setFiles(AVATAR_PNG)
  await expect(toast(page, 'Avatar atualizado')).toBeVisible()
  await expect(avatar).toHaveAttribute('src', /^data:image\/webp;base64,/)
  await expect(main(page).getByText('Use uma imagem PNG, JPEG ou WebP')).toHaveCount(0)

  const saved = (await storedProfile(page))?.avatarUrl ?? ''
  expect(saved).toMatch(/^data:image\/webp;base64,/)
  expect(saved.length).toBeLessThanOrEqual(300_000)
  // Redimensionado: 256 px, não a imagem original.
  const size = await avatar.evaluate((img: HTMLImageElement) => [
    img.naturalWidth,
    img.naturalHeight,
  ])
  expect(size).toEqual([256, 256])
  if (!isMobile(page)) {
    await expect(page.getByRole('banner').locator('img')).toHaveAttribute('src', saved)
  }

  await page.reload()
  await expect(avatar).toHaveAttribute('src', saved)

  await main(page).getByRole('button', { name: 'Remover' }).click()
  await expect(toast(page, 'Avatar removido')).toBeVisible()
  await expect(avatar).toHaveCount(0)
  expect((await storedProfile(page))?.avatarUrl).toBeNull()
  await expect(main(page).getByRole('button', { name: 'Remover' })).toHaveCount(0)
})

test('password change with wrong current password shows field error, then succeeds', async ({
  page,
}) => {
  await openAccount(page)
  const current = field(page, 'Senha atual')
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Souza')

  await current.fill('Errada123')
  await field(page, 'Nova senha').fill('NovaSenha1')
  await field(page, 'Confirmar nova senha').fill('OutraSenha1')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(main(page).getByText('As senhas não conferem')).toBeVisible()

  await field(page, 'Confirmar nova senha').fill('NovaSenha1')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(current).toHaveAttribute('aria-invalid', 'true')
  await expect(main(page).getByText('Senha atual incorreta')).toBeVisible()
  await expect(current).toBeFocused()

  await current.fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(toast(page, 'Senha alterada')).toBeVisible()
  await expect(current).toHaveValue('')
  await expect(field(page, 'Nova senha')).toHaveValue('')
  await expect(field(page, 'Confirmar nova senha')).toHaveValue('')

  await page
    .getByRole('navigation', { name: 'Meu perfil' })
    .getByRole('button', { name: 'Sair' })
    .click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/entrar')
  await login(page, 'ana@kurio.test', DEMO_PASSWORD)
  await expect(
    page.getByRole('alert').filter({ hasText: /e-mail ou senha inválidos/i }),
  ).toBeVisible()
  await login(page, 'ana@kurio.test', 'NovaSenha1')
  await expect(page).toHaveURL(/\/$/)
})

test('primary and secondary wallets with validation errors', async ({ page }) => {
  await openAccount(page, '/perfil/carteiras')
  const primary = page.getByRole('region', { name: 'Carteira principal' })
  const secondary = page.getByRole('region', { name: 'Carteira secundária' })
  await expect(field(primary, 'Apelido da carteira')).toHaveValue('Carteira principal')
  await expect(field(primary, 'Endereço da carteira')).toHaveValue(ANA_ADDRESS)
  await expect(field(primary, 'Nome ENS')).toHaveValue('anasouza')
  await expect(
    secondary.getByText('Você ainda não adicionou uma carteira secundária.'),
  ).toBeVisible()

  // Endereço inválido para a rede: erro no campo, com foco.
  await field(primary, 'Endereço da carteira').fill('nao-e-endereco')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primary.getByText('Endereço inválido para a rede escolhida')).toBeVisible()
  await expect(field(primary, 'Endereço da carteira')).toHaveAttribute('aria-invalid', 'true')
  await expect(field(primary, 'Endereço da carteira')).toBeFocused()

  // Trocar a rede revalida o endereço contra o novo formato.
  await field(primary, 'Endereço da carteira').fill(OTHER_ADDRESS)
  await chooseOption(primary, 'Rede', 'Solana')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primary.getByText('Endereço inválido para a rede escolhida')).toBeVisible()

  await chooseOption(primary, 'Rede', 'Polygon')
  await chooseOption(primary, 'Tipo de carteira', 'Coinbase Wallet')
  await field(primary, 'Apelido da carteira').fill('Cofre Polygon')
  await field(primary, 'ENS ou carteira secundária (opcional)').fill('cofre.eth')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(toast(page, 'Carteira principal salva')).toBeVisible()

  // Secundária "Igual à carteira principal": copia os valores salvos da principal.
  await secondary.getByRole('checkbox', { name: 'Igual à carteira principal' }).check()
  await expect(field(secondary, 'Apelido da carteira')).toHaveValue('Cofre Polygon')
  await expect(field(secondary, 'Endereço da carteira')).toHaveValue(OTHER_ADDRESS)
  await field(secondary, 'Apelido da carteira').fill('Reserva')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(toast(page, 'Carteira secundária salva')).toBeVisible()

  await page.reload()
  await expect(field(primary, 'Apelido da carteira')).toHaveValue('Cofre Polygon')
  await expect(field(primary, 'Endereço da carteira')).toHaveValue(OTHER_ADDRESS)
  await expect(primary.getByRole('combobox', { name: 'Rede' })).toHaveText('Polygon')
  await expect(primary.getByRole('combobox', { name: 'Tipo de carteira' })).toHaveText(
    'Coinbase Wallet',
  )
  await expect(field(primary, 'ENS ou carteira secundária (opcional)')).toHaveValue('cofre.eth')
  await expect(field(secondary, 'Apelido da carteira')).toHaveValue('Reserva')
  await expect(field(secondary, 'Endereço da carteira')).toHaveValue(OTHER_ADDRESS)
})

test('wallet saved from checkout returns to checkout', async ({ page }) => {
  await page.goto('/entrar')
  await login(page, 'bruno@kurio.test')
  await expect(page).toHaveURL(/\/$/)
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/checkout')
  await main(page).getByRole('link', { name: 'Cadastrar carteira' }).click()
  await expect(page).toHaveURL(/\/perfil\/carteiras\?redirect=%2Fcheckout$/)

  const primary = page.getByRole('region', { name: 'Carteira principal' })
  // Carteira nova já vem com nome e e-mail do perfil.
  await expect(field(primary, 'Nome de exibição')).toHaveValue('Bruno Lima')
  await expect(field(primary, 'E-mail')).toHaveValue('bruno@kurio.test')
  await field(primary, 'Apelido da carteira').fill('Principal do Bruno')
  await chooseOption(primary, 'Rede', 'Ethereum')
  await field(primary, 'Nome do perfil').fill('bruno_lima')
  await field(primary, 'Endereço da carteira').fill(OTHER_ADDRESS)
  await chooseOption(primary, 'Tipo de carteira', 'MetaMask')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()

  await expect(page).toHaveURL(/\/checkout$/)
  await expect(main(page).getByRole('radio', { name: /Principal do Bruno/ })).toBeVisible()
})

test('profile works on mobile', async ({ page }) => {
  test.skip(!isMobile(page), 'layout mobile')
  await openAccount(page)
  const overflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const nav = page.getByRole('navigation', { name: 'Meu perfil' })
  await expect(nav).toBeVisible()
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Souza')
  expect(await overflow()).toBeLessThanOrEqual(0)
  await expect(nav.getByRole('link', { name: 'Dados do perfil' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await nav.getByRole('link', { name: 'Carteiras' }).click()
  await expect(page).toHaveURL(/\/perfil\/carteiras$/)
  await expect(nav.getByRole('link', { name: 'Carteiras' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  await expect(
    field(page.getByRole('region', { name: 'Carteira principal' }), 'Nome de exibição'),
  ).toHaveValue('Ana Souza')
  expect(await overflow()).toBeLessThanOrEqual(0)

  // O último item da lista rolável continua alcançável.
  await nav.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/$/)
})
