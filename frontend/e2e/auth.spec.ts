/**
 * E2E Tests — Authentication Flow
 *
 * Tests: Login, Invalid credentials, Protected routes
 * Uses placeholder-based selectors matching the actual Login.tsx form.
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    // Use a fresh context (no pre-auth) for login tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test('should show login page', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: /login|sign in|partner/i })).toBeVisible();
        await expect(page.getByPlaceholder('name@laboratory.cm')).toBeVisible();
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    });

    test('should login with valid credentials via demo button', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Click Super Admin demo button to pre-fill
        await page.getByRole('button', { name: 'Super Admin' }).click();

        // Submit
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should redirect to dashboard
        await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
    });

    test('should login with manual credentials', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder('name@laboratory.cm').fill('admin@medlab.cm');
        await page.getByPlaceholder('••••••••').fill('pass123');
        await page.getByRole('button', { name: /sign in/i }).click();

        await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        await page.getByPlaceholder('name@laboratory.cm').fill('wrong@medlab.cm');
        await page.getByPlaceholder('••••••••').fill('wrongpass');
        await page.getByRole('button', { name: /sign in/i }).click();

        // Should stay on login page and show error
        await page.waitForTimeout(3000);
        await expect(page).toHaveURL(/login/);

        // Error message should appear
        const errorBox = page.locator('.bg-red-50, [role="alert"]');
        await expect(errorBox).toBeVisible({ timeout: 5000 });
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/login/, { timeout: 10_000 });
    });

    test('should have demo account buttons', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // All 3 demo buttons should be visible
        await expect(page.getByRole('button', { name: 'Super Admin' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Lab Admin' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Technician' })).toBeVisible();
    });
});
