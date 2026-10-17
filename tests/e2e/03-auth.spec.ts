import type { Page } from '@playwright/test'
import { expect, login, mocks, test } from './fixtures'

/** O perfil carregado: o nome de exibição preenche o formulário do `main`. */
const profileName = (page: Page) =>
  page.getByRole('main').getByLabel('Nome de exibição', { exact: true })

test('register validates fields and maps the email conflict to the field', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome de usuário', { exact: true }).fill('nova_colecionadora')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.test')
  await page.getByLabel('Senha', { exact: true }).fill('fraca')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('fraca')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  const password = page.getByLabel('Senha', { exact: true })
  await expect(password).toHaveAttribute('aria-invalid', 'true')
  await expect(password).toBeFocused()
  await expect(page.getByText(/pelo menos 8 caracteres/)).toBeVisible()

  await password.fill('Kurio@123')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Kurio@123')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  const email = page.getByLabel('E-mail', { exact: true })
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toBeFocused()
  await expect(page.getByText(/e-mail já está cadastrado/i)).toBeVisible()

  await email.fill('nova@kurio.test')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('wrong password shows an error without leaving the form', async ({ page }) => {
  await page.goto('/entrar')
  await login(page, 'ana@kurio.test', 'Errada123')
  await expect(
    page.getByRole('alert').filter({ hasText: /e-mail ou senha inválidos/i }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/entrar/)
})

test('login and register warn that new demo accounts stay in this browser', async ({ page }) => {
  await page.goto('/entrar')
  await expect(page.getByText(/contas novas ficam salvas só no navegador/)).toBeVisible()
  await expect(page.getByText('ana@kurio.test', { exact: true })).toBeVisible()

  await page.goto('/cadastro')
  await expect(page.getByText(/a conta fica salva só neste navegador/)).toBeVisible()
})

test('login returns to previous flow', async ({ page }) => {
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/entrar\?redirect=/)
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/perfil$/)
  await expect(profileName(page)).toHaveValue('Ana Souza')
})

test('session survives reload', async ({ page }) => {
  await page.goto('/perfil')
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/perfil$/)
  await page.reload()
  await expect(page).toHaveURL(/\/perfil$/)
  await expect(profileName(page)).toHaveValue('Ana Souza')
})

test('session expiry redirects to login and resumes the flow', async ({ page }) => {
  await page.goto('/perfil')
  await login(page, 'ana@kurio.test')
  await expect(profileName(page)).toHaveValue('Ana Souza')
  await mocks(page).expireSession()
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/entrar\?.*motivo=expirada/)
  await expect(page.getByText(/sua sessão expirou/i).first()).toBeVisible()
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/perfil$/)
})

test('expiry during navigation warns and returns to the same page after login', async ({
  page,
}) => {
  await page.goto('/entrar')
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: /neon vessel/i }).first()).toBeVisible()
  // Qualquer requisição em voo detectaria a expiração antes do clique.
  await page.waitForLoadState('networkidle')
  await mocks(page).expireSession()
  await page
    .getByRole('link', { name: /neon vessel/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/entrar\?.*redirect=%2Fnft%2Fnft_neon-vessel.*motivo=expirada/)
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: /sua sessão expirou/i }),
  ).toBeVisible()
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/nft\/nft_neon-vessel$/)
})

test('logout clears session and private drafts', async ({ page }) => {
  await page.goto('/perfil')
  await login(page, 'ana@kurio.test')
  await expect(page).toHaveURL(/\/perfil$/)
  await page.evaluate(() => {
    sessionStorage.setItem('kurio:checkout-draft:usr_ana', '{}')
    sessionStorage.setItem('kurio:checkout-attempt:usr_ana', '{}')
    localStorage.setItem('kurio:pending-order:usr_ana', '"ord_1"')
  })
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/$/)
  const leftovers = await page.evaluate(() => ({
    session: localStorage.getItem('kurio:session'),
    draft: sessionStorage.getItem('kurio:checkout-draft:usr_ana'),
    attempt: sessionStorage.getItem('kurio:checkout-attempt:usr_ana'),
    pending: localStorage.getItem('kurio:pending-order:usr_ana'),
  }))
  expect(leftovers).toEqual({ session: null, draft: null, attempt: null, pending: null })
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/entrar\?redirect=/)
})

test('closing the login returns to where the user was', async ({ page }) => {
  await page.goto('/entrar?redirect=%2Fnft%2Fnft_neon-vessel')
  const isDesktop = (page.viewportSize()?.width ?? 1440) >= 768
  if (isDesktop) {
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
  } else {
    await page.getByRole('link', { name: 'Voltar' }).click()
  }
  await expect(page).toHaveURL(/\/nft\/nft_neon-vessel$/)
})

test('closing an expired login whose redirect is private goes to the Início', async ({ page }) => {
  await page.goto('/entrar?redirect=%2Fcheckout&motivo=expirada')
  await expect(page.getByText(/sua sessão expirou/i).first()).toBeVisible()
  const isDesktop = (page.viewportSize()?.width ?? 1440) >= 768
  if (isDesktop) {
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
  } else {
    await page.getByRole('link', { name: 'Voltar' }).click()
  }
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('dialog')).toBeHidden()
})
