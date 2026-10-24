import { test } from '@playwright/test'
import { signIn, signOut } from './helpers'

/**
 * Captures documentation screenshots from a stack started with DEMO_DATA=true.
 * Run with: npx playwright test tests/screenshots.spec.js
 */
const OUT = process.env.SCREENSHOT_DIR || 'screenshots'
const PASSWORD = process.env.DEMO_PASSWORD || 'Demo@12345'

test.skip(!process.env.CAPTURE_SCREENSHOTS, 'Set CAPTURE_SCREENSHOTS=1 against a demo-data stack')

async function shot(page, name) {
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
}

test('documentation screenshots', async ({ page }) => {
    await page.goto('/login')
    await shot(page, 'login')

    await signIn(page, 'admin', PASSWORD)
    await shot(page, 'dashboard-admin')
    for (const [path, name] of [
        ['/employees', 'employees'],
        ['/attendance', 'attendance'],
        ['/leave?tab=approvals', 'leave-approvals'],
        ['/projects', 'projects'],
        ['/users', 'users'],
        ['/roles', 'roles'],
        ['/audit-logs', 'audit-log'],
    ]) {
        await page.goto(path)
        await shot(page, name)
    }
    await signOut(page)

    await signIn(page, 'employee', PASSWORD)
    await shot(page, 'dashboard-employee')
    await page.goto('/leave')
    await shot(page, 'leave-employee')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard')
    await shot(page, 'mobile-dashboard')
})
