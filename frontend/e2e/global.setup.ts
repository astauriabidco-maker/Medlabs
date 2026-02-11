/**
 * Global Setup — Authenticate once, reuse across all tests
 *
 * Strategy: Use the demo quick-login buttons (Super Admin, Lab Admin)
 * which pre-fill the form, then click "Sign in".
 */
import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ADMIN_AUTH_FILE = join(__dirname, '.auth/admin.json');
const LAB_AUTH_FILE = join(__dirname, '.auth/lab.json');

setup('authenticate as Super Admin', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Use the demo quick-login button to pre-fill credentials
    await page.getByRole('button', { name: 'Super Admin' }).click();

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for successful redirect
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

    // Persist auth state
    await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

setup('authenticate as Lab Admin', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Use the demo quick-login button
    await page.getByRole('button', { name: 'Lab Admin' }).click();

    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

    await page.context().storageState({ path: LAB_AUTH_FILE });
});
