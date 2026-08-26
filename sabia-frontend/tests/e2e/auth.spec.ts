import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows login form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@test.com')
    await page.fill('input[type="password"]', 'wrong')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Credenciais inválidas')).toBeVisible()
  })

  test('logs in successfully with valid credentials', async ({ page }) => {
    // Uses seeded gestor from database
    await page.fill('input[type="email"]', 'gestor@sabia.local')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Should redirect to /kb
    await expect(page).toHaveURL(/\/kb/)
    await expect(page.locator('text=Base de Conhecimento')).toBeVisible()
  })

  test('redirects to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/login/)
  })
})