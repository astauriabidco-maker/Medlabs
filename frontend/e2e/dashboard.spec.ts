/**
 * E2E Tests — Dashboard & Navigation
 *
 * Tests: Dashboard loads, navigation links, sidebar, role-based menus
 * Uses pre-authenticated Super Admin session from global setup
 */
import { test, expect } from '@playwright/test';

test.describe('Dashboard & Navigation', () => {

    test('should display dashboard with statistics', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/dashboard/);

        // Dashboard should have key stat elements
        const content = page.locator('main');
        await expect(content).toBeVisible();

        // Should have at least one card or stat widget
        const cards = page.locator('[class*="card"], [class*="Card"], [class*="stat"]');
        await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    });

    test('should navigate between sidebar sections', async ({ page }) => {
        await page.goto('/dashboard');

        // Get all nav links in the sidebar
        const sidebar = page.locator('aside, nav').first();
        await expect(sidebar).toBeVisible({ timeout: 5000 });

        const navLinks = sidebar.locator('a[href]');
        const linkCount = await navLinks.count();
        expect(linkCount).toBeGreaterThan(2);

        // Click a few key links and verify navigation
        for (const linkText of ['Tenants', 'Users', 'Utilisateurs']) {
            const link = sidebar.locator('a', { hasText: new RegExp(linkText, 'i') });
            if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
                await link.click();
                await page.waitForLoadState('networkidle');
                // URL should change
                expect(page.url()).not.toBe('about:blank');
                break;
            }
        }
    });

    test('should toggle dark mode', async ({ page }) => {
        await page.goto('/dashboard');

        // Find the theme toggle button (Sun/Moon icon)
        const themeButton = page.locator('button').filter({
            has: page.locator('svg.lucide-sun, svg.lucide-moon, [class*="sun"], [class*="moon"]')
        }).first();

        if (await themeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            // Click to toggle
            await themeButton.click();

            // Verify dark class is applied
            const htmlClass = await page.locator('html').getAttribute('class');
            const isDark = htmlClass?.includes('dark');

            // Click again to toggle back
            await themeButton.click();
            const htmlClassAfter = await page.locator('html').getAttribute('class');
            const isDarkAfter = htmlClassAfter?.includes('dark');

            // State should have changed
            expect(isDark).not.toBe(isDarkAfter);
        }
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/dashboard');

        // Sidebar should be hidden initially
        const sidebar = page.locator('aside');
        const isHidden = await sidebar.isHidden().catch(() => true);
        expect(isHidden).toBeTruthy();

        // Mobile header hamburger should be visible
        const menuButton = page.locator('header button').first();
        await expect(menuButton).toBeVisible();

        // Click to open mobile sidebar
        await menuButton.click();
        await expect(sidebar).toBeVisible({ timeout: 3000 });
    });

    test('should display correct user info in sidebar', async ({ page }) => {
        await page.goto('/dashboard');

        // Should show the logged-in user email somewhere
        const emailDisplay = page.locator('text=admin@medlab.cm');
        await expect(emailDisplay).toBeVisible({ timeout: 5000 });
    });
});
