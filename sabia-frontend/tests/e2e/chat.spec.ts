import { test, expect } from '@playwright/test'

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'gestor@sabia.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/kb/)
  })

  test('navigates to chat and shows empty state', async ({ page }) => {
    await page.goto('/chat')
    await expect(page.locator('text=Como posso ajudar?')).toBeVisible()
  })

  test('sends message and receives response', async ({ page }) => {
    await page.goto('/chat')
    await page.fill('textarea[placeholder="Digite sua dúvida..."]', 'Como emitir uma nota fiscal?')
    await page.keyboard.press('Enter')

    // Wait for streaming response
    await expect(page.locator('text=Para emitir uma nota fiscal')).toBeVisible({ timeout: 30000 })
  })

  test('shows confidence badge on assistant message', async ({ page }) => {
    await page.goto('/chat')
    await page.fill('textarea[placeholder="Digite sua dúvida..."]', 'Teste')
    await page.keyboard.press('Enter')

    await expect(page.locator('[data-testid="confidence-badge"]').first()).toBeVisible({ timeout: 30000 })
  })

  test('new conversation button works', async ({ page }) => {
    await page.goto('/chat')
    await page.fill('textarea[placeholder="Digite sua dúvida..."]', 'Primeira mensagem')
    await page.keyboard.press('Enter')
    await expect(page.locator('text=Primeira mensagem')).toBeVisible({ timeout: 30000 })

    await page.click('button:has-text("Nova")')
    await expect(page.locator('text=Como posso ajudar?')).toBeVisible()
  })
})