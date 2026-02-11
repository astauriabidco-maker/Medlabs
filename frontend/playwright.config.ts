/**
 * Playwright E2E Test Configuration — MedLab Platform
 *
 * Run:
 *   npx playwright test                  # All tests
 *   npx playwright test --project=chromium # Chromium only
 *   npx playwright test --ui             # Interactive UI
 *   npx playwright test --headed         # With browser window
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 5_000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI
        ? [['html', { open: 'never' }], ['github']]
        : [['html', { open: 'on-failure' }]],

    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 10_000,
    },

    projects: [
        // Setup project — creates auth state
        {
            name: 'setup',
            testMatch: /global\.setup\.ts/,
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'e2e/.auth/admin.json',
            },
            dependencies: ['setup'],
        },
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                storageState: 'e2e/.auth/admin.json',
            },
            dependencies: ['setup'],
        },
        {
            name: 'mobile-chrome',
            use: {
                ...devices['Pixel 7'],
                storageState: 'e2e/.auth/admin.json',
            },
            dependencies: ['setup'],
        },
    ],

    // Auto-start dev servers for local development
    webServer: process.env.CI ? undefined : [
        {
            command: 'cd ../backend && npm run start:dev',
            port: 3005,
            timeout: 60_000,
            reuseExistingServer: true,
        },
        {
            command: 'npm run dev',
            port: 5173,
            timeout: 30_000,
            reuseExistingServer: true,
        },
    ],
});
