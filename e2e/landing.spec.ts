import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BotWave/i);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=BOT')).toBeVisible();
  });

  test('should have login/signup buttons', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.locator('a[href*="login"], button:has-text("Login"), a:has-text("Login"), a:has-text("LOG IN"), a:has-text("GET STARTED")').first();
    await expect(loginLink).toBeVisible();
  });

  test('should render particle background canvas', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});
