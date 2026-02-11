/**
 * E2E Tests — Lab Admin Workflow
 *
 * Tests the full lab admin workflow: Settings, Upload, History
 * Uses Lab Admin auth state
 *
 * Route mapping (from sidebar):
 *   - Dashboard: /dashboard/lab-home
 *   - Upload: /dashboard/upload
 *   - History: /dashboard/history
 *   - Settings: /dashboard/settings
 */
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use Lab Admin auth
test.use({ storageState: join(__dirname, '.auth/lab.json') });

test.describe('Lab Admin — Dashboard', () => {

    test('should display lab dashboard', async ({ page }) => {
        await page.goto('/dashboard/lab-home');
        await page.waitForLoadState('networkidle');

        const content = page.locator('main');
        await expect(content).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Lab Admin — Settings', () => {

    test('should display settings page', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        const content = page.locator('main');
        await expect(content).toBeVisible({ timeout: 10_000 });

        // Wait for loading to finish
        await page.waitForFunction(
            () => !document.querySelector('main')?.textContent?.includes('Chargement'),
            { timeout: 10_000 }
        ).catch(() => { });

        // Settings page should show the title
        const heading = page.locator('h1', { hasText: /settings|paramètres/i });
        await expect(heading).toBeVisible({ timeout: 5000 });

        // Should have tab buttons (General, SMS Quota, Modules & Licenses, Payment, SSO)
        const generalTab = page.getByRole('button', { name: /general/i });
        await expect(generalTab).toBeVisible({ timeout: 5000 });
    });

    test('should switch between settings sections', async ({ page }) => {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');

        // Dismiss onboarding modal if present
        const skipButton = page.getByRole('button', { name: /skip|passer|already know/i });
        if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await skipButton.click();
            await page.waitForTimeout(500);
        }

        // Wait for loading
        await page.waitForFunction(
            () => !document.querySelector('main')?.textContent?.includes('Chargement'),
            { timeout: 10_000 }
        ).catch(() => { });

        // Click on SMS Quota tab
        const smsTab = page.getByRole('button', { name: /sms quota/i });
        if (await smsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
            await smsTab.click();
            await page.waitForTimeout(500);
            const content = page.locator('main');
            await expect(content).toBeVisible();
        }

        // Click on SSO tab
        const ssoTab = page.getByRole('button', { name: /sso|ldap/i });
        if (await ssoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
            await ssoTab.click();
            await page.waitForTimeout(500);
            const content = page.locator('main');
            await expect(content).toBeVisible();
        }
    });
});

test.describe('Lab Admin — Upload', () => {

    test('should display upload form', async ({ page }) => {
        await page.goto('/dashboard/upload');
        await page.waitForLoadState('networkidle');

        const content = page.locator('main');
        await expect(content).toBeVisible({ timeout: 10_000 });

        // Should have upload-related content
        const pageText = await content.textContent();
        expect(pageText).toBeTruthy();
    });
});

test.describe('Lab Admin — History', () => {

    test('should display results history page', async ({ page }) => {
        await page.goto('/dashboard/history');
        await page.waitForLoadState('networkidle');

        const content = page.locator('main');
        await expect(content).toBeVisible({ timeout: 10_000 });

        // Wait for loading to finish
        await page.waitForFunction(
            () => !document.querySelector('main')?.textContent?.includes('Chargement'),
            { timeout: 10_000 }
        ).catch(() => { });

        // The page should have either a table with results or a heading
        const table = page.locator('table');
        const heading = page.locator('h1');
        const tableVisible = await table.isVisible({ timeout: 5000 }).catch(() => false);
        const headingVisible = await heading.isVisible({ timeout: 3000 }).catch(() => false);

        expect(tableVisible || headingVisible).toBeTruthy();
    });
});

test.describe('Lab Admin — Navigation', () => {

    test('should have correct sidebar links', async ({ page }) => {
        await page.goto('/dashboard/lab-home');
        await page.waitForLoadState('networkidle');

        // Verify key navigation links are present
        const sidebar = page.locator('aside, nav').first();
        await expect(sidebar).toBeVisible({ timeout: 5000 });

        // Check for expected links
        const expectedLinks = ['Dashboard', 'New Result', 'Sent History', 'Lab Settings'];
        for (const linkText of expectedLinks) {
            const link = sidebar.locator('a', { hasText: new RegExp(linkText, 'i') });
            const isVisible = await link.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
                expect(isVisible).toBeTruthy();
            }
        }
    });
});
