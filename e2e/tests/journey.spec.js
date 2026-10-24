import { expect, test } from '@playwright/test'
import { API_URL, choose, expectToast, nav, signIn, signOut, upcomingWorkdays } from './helpers'

/**
 * The whole lifecycle on an EMPTY database:
 * first-time setup -> organisation -> employee -> account -> leave request
 * -> approval -> audit trail, plus the security rules along the way.
 */
test.describe.serial('first day with EMS', () => {
    const admin = { username: 'admin', password: 'AdminPass1' }
    const employee = { username: 'ravi.kumar', password: 'Welcome123' }

    test('API is healthy and protected', async ({ request }) => {
        const health = await request.get(`${API_URL}/actuator/health`)
        expect(health.ok()).toBeTruthy()

        const anonymous = await request.get(`${API_URL}/api/employees`)
        expect(anonymous.status()).toBe(401)
        expect((await anonymous.json()).message).toContain('sign in')
    })

    test('administrator completes first-time setup', async ({ page }) => {
        await page.goto('/login')
        await expect(page.getByText('This installation has no administrator yet.')).toBeVisible()
        await page.getByRole('link', { name: 'Set up' }).click()

        await expect(page.getByRole('heading', { name: 'Create the administrator' })).toBeVisible()
        await page.getByLabel('First name').fill('Asha')
        await page.getByLabel('Last name').fill('Menon')
        await page.getByLabel('Employee code').fill('EMP001')
        await page.getByLabel('Work email').fill('asha.menon@example.com')
        await page.getByLabel('Username').fill(admin.username)
        await page.getByLabel(/^Password/).fill(admin.password)
        await page.getByLabel('Confirm password').fill(admin.password)
        await page.getByRole('button', { name: 'Create administrator' }).click()

        await expect(page).toHaveURL(/\/login/)
        await expectToast(page, 'Administrator account created')
        await expect(page.getByLabel('Username')).toHaveValue(admin.username)
    })

    test('setup cannot be repeated', async ({ request }) => {
        const response = await request.post(`${API_URL}/api/setup/first-admin`, {
            data: {
                employeeCode: 'EVIL1',
                firstName: 'Mallory',
                lastName: 'Intruder',
                email: 'mallory@example.com',
                username: 'mallory',
                password: 'Mallory123',
            },
        })
        expect(response.status()).toBe(409)
    })

    test('administrator sets up the organisation and hires someone', async ({ page }) => {
        await signIn(page, admin.username, admin.password)

        // Check in from the dashboard time card
        await page.getByRole('button', { name: 'Check in' }).click()
        await expectToast(page, 'Checked in')
        await expect(page.getByRole('button', { name: 'Check out' })).toBeVisible()

        // Department + designation
        await nav(page, 'Departments')
        await page.getByRole('button', { name: 'Add department' }).first().click()
        let dialog = page.getByRole('dialog')
        await dialog.getByLabel('Name').fill('Engineering')
        await dialog.getByRole('button', { name: 'Add department' }).click()
        await expectToast(page, 'Department added.')
        await expect(page.getByRole('cell', { name: 'Engineering', exact: true })).toBeVisible()

        await nav(page, 'Designations')
        await page.getByRole('button', { name: 'Add designation' }).click()
        dialog = page.getByRole('dialog')
        await dialog.getByLabel('Name').fill('Software Engineer')
        await choose(dialog, 'Department', 'Engineering')
        await dialog.getByRole('button', { name: 'Add designation' }).click()
        await expectToast(page, 'Designation added.')

        // Employee
        await nav(page, 'Employees')
        await page.getByRole('link', { name: 'Add employee' }).click()
        await page.getByLabel('First name').fill('Ravi')
        await page.getByLabel('Last name').fill('Kumar')
        await page.getByLabel('Employee code').fill('EMP002')
        await page.getByLabel('Date of joining').fill('2025-01-06')
        await page.getByLabel('Work email').fill('ravi.kumar@example.com')
        await page.getByLabel('Mobile number').fill('9876543210')
        await choose(page, 'Department', 'Engineering')
        await choose(page, 'Designation', 'Software Engineer')
        await page.getByRole('button', { name: 'Add employee' }).click()
        await expectToast(page, 'Ravi Kumar was added.')
        await expect(page.getByText('Ravi Kumar', { exact: true })).toBeVisible()

        // Duplicate email is rejected with a clear message
        await page.getByRole('link', { name: 'Add employee' }).click()
        await page.getByLabel('First name').fill('Other')
        await page.getByLabel('Last name').fill('Person')
        await page.getByLabel('Employee code').fill('EMP003')
        await page.getByLabel('Date of joining').fill('2025-01-06')
        await page.getByLabel('Work email').fill('RAVI.KUMAR@example.com')
        await page.getByLabel('Mobile number').fill('9876543211')
        await choose(page, 'Department', 'Engineering')
        await choose(page, 'Designation', 'Software Engineer')
        await page.getByRole('button', { name: 'Add employee' }).click()
        await expect(page.getByText('Another employee already uses this email.').first()).toBeVisible()
        await page.getByRole('link', { name: 'Cancel' }).click()

        // Login account for the new employee
        await nav(page, 'User accounts')
        await page.getByRole('button', { name: 'Create account' }).click()
        dialog = page.getByRole('dialog')
        await choose(dialog, 'Employee', /Ravi Kumar/)
        await expect(dialog.getByLabel('Username')).toHaveValue(employee.username)
        await dialog.getByLabel('Temporary password').fill(employee.password)
        await dialog.getByRole('button', { name: 'Create account' }).click()
        await expectToast(page, 'Account ravi.kumar created')

        await signOut(page)
    })

    test('employee applies for leave and cannot reach admin pages', async ({ page }) => {
        await signIn(page, employee.username, employee.password)
        await expect(page.getByRole('link', { name: 'User accounts' })).toHaveCount(0)

        await page.goto('/users')
        await expect(page.getByText("You don't have access to this page")).toBeVisible()

        const [start, end] = upcomingWorkdays()
        await nav(page, 'Leave')
        await page.getByRole('button', { name: 'Apply for leave' }).first().click()
        const dialog = page.getByRole('dialog')
        await dialog.getByLabel('From').fill(start)
        await dialog.getByLabel('To').fill(end)
        await expect(dialog.getByRole('status')).toContainText('2 working days')
        await dialog.getByLabel('Reason').fill('Sister’s wedding')
        await dialog.getByRole('button', { name: 'Submit request' }).click()
        await expectToast(page, 'Leave request submitted for approval.')
        await expect(page.getByRole('cell', { name: 'Pending' })).toBeVisible()

        await signOut(page)
    })

    test('administrator approves the request and sees it in the audit log', async ({ page }) => {
        await signIn(page, admin.username, admin.password)
        await page.goto('/leave?tab=approvals')
        const row = page.getByRole('row').filter({ hasText: 'Ravi Kumar' })
        await row.getByRole('button', { name: 'Approve' }).click()
        await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click()
        await expectToast(page, 'Leave request approved.')
        await expect(page.getByText('Nothing waiting for approval')).toBeVisible()

        await nav(page, 'Audit log')
        await expect(page.getByRole('cell', { name: 'Approved', exact: true })).toBeVisible()
        await expect(page.getByRole('cell', { name: 'Initial setup' })).toBeVisible()
    })

    test('the employee sees the approval and a lowered balance', async ({ page }) => {
        await signIn(page, employee.username, employee.password)
        await nav(page, 'Leave')
        await expect(page.getByRole('cell', { name: /Approved/ })).toBeVisible()
        await expect(page.getByText('10 of 12 left')).toBeVisible()
    })
})
