import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { employeesApi, usersApi } from '../api/endpoints'
import UsersPage from '../pages/UsersPage'
import { USERS, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    usersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), resetPassword: vi.fn(), remove: vi.fn() },
    employeesApi: { options: vi.fn() },
}))

const accounts = [
    {
        userId: 1,
        username: 'admin',
        employeeName: 'Asha Admin',
        employeeCode: 'EMP001',
        role: 'ADMIN',
        enabled: true,
        employeeActive: true,
        canManage: false,
        self: false,
    },
    {
        userId: 3,
        username: 'ravi',
        employeeName: 'Ravi Kumar',
        employeeCode: 'EMP003',
        role: 'EMPLOYEE',
        enabled: false,
        employeeActive: true,
        canManage: true,
        self: false,
    },
]

describe('UsersPage', () => {
    beforeEach(() => {
        usersApi.list.mockResolvedValue(accounts)
        employeesApi.options.mockResolvedValue([
            { employeeId: 5, employeeCode: 'EMP005', fullName: 'Neha Shah' },
        ])
    })

    it('marks accounts HR cannot manage', async () => {
        renderPage(<UsersPage />, { route: '/users', user: USERS.HR })
        const adminRow = (await screen.findByText('Asha Admin, EMP001')).closest('tr')
        expect(within(adminRow).getByText('Restricted')).toBeInTheDocument()
        const raviRow = screen.getByText('Ravi Kumar, EMP003').closest('tr')
        expect(within(raviRow).getByText('No, disabled')).toBeInTheDocument()
        expect(within(raviRow).getByRole('button', { name: 'Reset password for ravi' })).toBeInTheDocument()
    })

    it('only offers HR the employee role and suggests a username', async () => {
        usersApi.create.mockResolvedValue({ username: 'neha.shah', employeeName: 'Neha Shah' })
        renderPage(<UsersPage />, { route: '/users', user: USERS.HR })
        await userEvent.click(await screen.findByRole('button', { name: 'Create account' }))
        const dialog = await screen.findByRole('dialog')

        await userEvent.click(within(dialog).getByRole('combobox', { name: /role/i }))
        const roles = within(await screen.findByRole('listbox')).getAllByRole('option')
        expect(roles.map((option) => option.textContent)).toEqual(['Employee'])
        await userEvent.keyboard('{Escape}')

        await userEvent.click(within(dialog).getByRole('combobox', { name: /employee/i }))
        await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: /Neha Shah/ }))
        expect(within(dialog).getByLabelText(/username/i)).toHaveValue('neha.shah')

        await userEvent.type(within(dialog).getByLabelText(/temporary password/i), 'Welcome123')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Create account' }))
        await waitFor(() =>
            expect(usersApi.create).toHaveBeenCalledWith({
                employeeId: 5,
                username: 'neha.shah',
                password: 'Welcome123',
                role: 'EMPLOYEE',
                enabled: true,
            })
        )
    })

    it('validates the new password before resetting', async () => {
        usersApi.resetPassword.mockResolvedValue(null)
        renderPage(<UsersPage />, { route: '/users', user: USERS.ADMIN })
        await userEvent.click(await screen.findByRole('button', { name: 'Reset password for ravi' }))
        const dialog = await screen.findByRole('dialog')
        await userEvent.type(within(dialog).getByLabelText(/new password/i), 'short')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Reset password' }))
        expect(usersApi.resetPassword).not.toHaveBeenCalled()

        await userEvent.clear(within(dialog).getByLabelText(/new password/i))
        await userEvent.type(within(dialog).getByLabelText(/new password/i), 'NewPass123')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Reset password' }))
        await waitFor(() => expect(usersApi.resetPassword).toHaveBeenCalledWith(3, 'NewPass123'))
    })
})
