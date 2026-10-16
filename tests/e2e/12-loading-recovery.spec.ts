import type { Locator, Page } from '@playwright/test'
import { cartItem } from './cart-helpers'
import { expect, mocks, test } from './fixtures'
import { addToCart, gotoScenario } from './helpers/mocks'

// O cenário "slow" segura cada resposta por 2,5s: a leitura do skeleton cabe com folga nesse tempo.
test.setTimeout(60_000)

type Box = { x: number; y: number; width: number; height: number }

const cards = (page: Page) => page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  expect(box, 'elemento sem caixa (fora do layout)').not.toBeNull()
  return box!
}

/** O conteúdo entra no espaço que o skeleton reservou (±4 px), sem a página pular. */
function expectSameBox(content: Box, skeleton: Box, what: string) {
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(
      Math.abs(content[key] - skeleton[key]),
      `${what}: ${key} do conteúdo ${content[key]} vs skeleton ${skeleton[key]}`,
    ).toBeLessThanOrEqual(4)
  }
}

test('skeletons show during slow loading with reserved dimensions', async ({ page }) => {
  // Catálogo: a imagem do primeiro card ocupa o lugar da do primeiro skeleton.
  await gotoScenario(page, '/', 'slow')
  const gridSkeleton = page.getByTestId('catalog-skeleton')
  await expect(gridSkeleton).toBeVisible()
  const cardSkeleton = await boxOf(gridSkeleton.getByTestId('nft-card-skeleton-media').first())
  await expect(cards(page).first()).toBeVisible({ timeout: 15_000 })
  expectSameBox(await boxOf(cards(page).first().getByRole('img')), cardSkeleton, 'card')

  // Detalhe: a imagem principal ocupa o lugar do skeleton da galeria.
  await page.goto('/nft/nft_neon-vessel')
  const detailSkeleton = page.getByRole('status', { name: 'Carregando NFT' })
  await expect(detailSkeleton).toBeVisible({ timeout: 10_000 })
  const media = await boxOf(detailSkeleton.getByTestId('nft-detail-skeleton-media'))
  const image = page.getByRole('img', { name: /^Neon Vessel:/ }).first()
  await expect(image).toBeVisible({ timeout: 15_000 })
  expectSameBox(await boxOf(image), media, 'imagem do detalhe')

  // Resumo do carrinho: os valores entram nas linhas que o skeleton já desenhou. A medida é tirada
  // com a lista já carregada (só a cotação pendente): no mobile o resumo fica abaixo da lista, e o
  // skeleton da lista não sabe quantos itens o carrinho tem.
  await addToCart(page, 'nft_neon-vessel')
  await page.goto('/carrinho')
  await expect(cartItem(page, 'Neon Vessel')).toBeVisible({ timeout: 15_000 })
  const summarySkeleton = page.getByTestId('cart-summary-skeleton')
  await expect(summarySkeleton).toBeVisible()
  const rows = await boxOf(summarySkeleton.locator('dl'))
  const total = page.getByTestId('summary-total')
  await expect(total).toBeVisible({ timeout: 15_000 })
  expectSameBox(await boxOf(page.locator('dl').filter({ has: total })), rows, 'resumo')
})

test('reduced motion disables shimmer', async ({ page }) => {
  const infiniteAnimations = () =>
    page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity)
        .map((a) => (a as CSSAnimation).animationName ?? 'sem nome'),
    )
  const shimmer = page.locator('[data-slot="skeleton-shimmer"]').first()

  await gotoScenario(page, '/', 'slow')
  await expect(shimmer).toBeAttached()
  expect(await shimmer.evaluate((el) => getComputedStyle(el).animationName)).toBe('shimmer')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(shimmer).toBeAttached()
  expect(await shimmer.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  // Nada fica piscando em loop enquanto a página carrega.
  expect(await infiniteAnimations()).toEqual([])
})

test('failure feedback and recovery after retry', async ({ page }) => {
  // Sem conexão: a falha aparece como alerta com mensagem segura e saída.
  await gotoScenario(page, '/', 'offline')
  const failure = page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os NFTs' })
  await expect(failure).toBeVisible({ timeout: 15_000 })
  await expect(failure).toContainText('Sem conexão com o servidor')
  const retry = failure.getByRole('button', { name: 'Tentar novamente' })
  // Enquanto a rede não volta, tentar de novo mantém o aviso (sem tela em branco).
  await retry.click()
  await expect(failure).toBeVisible({ timeout: 15_000 })

  // A rede volta (cenário padrão; trocar de cenário recarrega a página com o banco recriado).
  await mocks(page).reset('default')
  await expect(cards(page)).toHaveCount(9, { timeout: 10_000 })

  // Falha pontual sem recarregar: "Tentar novamente" busca de novo e mostra o conteúdo.
  await page.goto('/rota-inexistente')
  await mocks(page).failNext('GET /nfts', { networkError: true, times: 3 })
  await page.getByRole('link', { name: 'Voltar ao Início' }).click()
  await expect(failure).toBeVisible({ timeout: 15_000 })
  await failure.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(cards(page)).toHaveCount(9)
  await expect(failure).toBeHidden()
})
