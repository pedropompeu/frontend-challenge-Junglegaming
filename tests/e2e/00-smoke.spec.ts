import { test, expect } from './fixtures'

test('smoke: app boots with title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Kurio/)
})
