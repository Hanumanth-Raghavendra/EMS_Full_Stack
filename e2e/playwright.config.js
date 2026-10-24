import { defineConfig, devices } from '@playwright/test'

/**
 * Runs against an already running stack:
 *   BASE_URL (web app, default http://localhost:4173)
 *   API_URL  (API, default http://localhost:8080)
 */
export default defineConfig({
    testDir: './tests',
    timeout: 90_000,
    expect: { timeout: 15_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:4173',
        viewport: { width: 1360, height: 860 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 860 } } }],
})
