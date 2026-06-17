import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test('should show admin login page', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page).toHaveURL(/admin\/login/);
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should reject invalid admin credentials', async ({ page }) => {
    await page.goto('/admin/login');
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');

    if (await usernameInput.isVisible()) {
      await usernameInput.fill('wrongadmin');
    }
    await passwordInput.fill('wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    expect(page.url()).toContain('admin/login');
  });

  test('should redirect unauthenticated from admin dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL(/admin\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/admin\/login/);
  });
});
