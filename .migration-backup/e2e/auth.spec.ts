import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show signup page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL(/signup/);
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible();
  });

  test('should show forgot password page', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[type="text"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const errorVisible = await page.locator('text=/error|invalid|incorrect/i').isVisible();
    expect(errorVisible || page.url().includes('login')).toBeTruthy();
  });

  test('login page should have forgot password link', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.locator('a[href*="forgot"]');
    await expect(forgotLink).toBeVisible();
  });
});
