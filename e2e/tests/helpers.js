import { expect } from '@playwright/test'

export const API_URL = process.env.API_URL || 'http://localhost:8080'

export async function signIn(page, username, password) {
    await page.goto('/login')
    await page.getByLabel('Username').fill(username)
    await page.getByLabel(/^Password/).fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)
}

export async function signOut(page) {
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login/)
}

/** Clicks a link in the sidebar. */
export async function nav(page, label) {
    await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: label, exact: true }).click()
}

/** Picks an option from a MUI select identified by its label. */
export async function choose(scope, label, option) {
    await scope.getByRole('combobox', { name: label }).click()
    // The option list renders in a popover attached to the page, not inside the scope.
    const page = typeof scope.page === 'function' ? scope.page() : scope
    await page.getByRole('option', { name: option }).click()
}

export async function expectToast(page, text) {
    await expect(page.getByRole('alert').filter({ hasText: text })).toBeVisible()
}

function iso(date) {
    const pad = (value) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Two consecutive weekdays at least a few days ahead, in the same year. */
export function upcomingWorkdays() {
    const start = new Date()
    start.setDate(start.getDate() + 4)
    for (;;) {
        const next = new Date(start)
        next.setDate(next.getDate() + 1)
        const weekdays = [start.getDay(), next.getDay()].every((day) => day !== 0 && day !== 6)
        if (weekdays && start.getFullYear() === next.getFullYear()) {
            return [iso(start), iso(next)]
        }
        start.setDate(start.getDate() + 1)
    }
}
