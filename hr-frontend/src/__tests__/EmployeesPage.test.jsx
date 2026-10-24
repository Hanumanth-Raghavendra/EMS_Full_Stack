import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { departmentsApi, employeesApi } from '../api/endpoints'
import EmployeesPage from '../pages/EmployeesPage'
import { USERS, page, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    employeesApi: { list: vi.fn(), remove: vi.fn() },
    departmentsApi: { list: vi.fn() },
}))

const people = [
    {
        employeeId: 1,
        employeeCode: 'EMP001',
        fullName: 'Asha Admin',
        email: 'asha@example.com',
        departmentName: 'Engineering',
        designationName: 'Manager',
        dateOfJoining: '2024-01-10',
        status: 'ACTIVE',
        username: 'admin',
        accountRole: 'ADMIN',
        canManage: false,
    },
    {
        employeeId: 3,
        employeeCode: 'EMP003',
        fullName: 'Ravi Kumar',
        email: 'ravi@example.com',
        departmentName: 'Engineering',
        designationName: 'Engineer',
        dateOfJoining: '2025-03-01',
        status: 'INACTIVE',
        username: null,
        accountRole: null,
        canManage: true,
    },
]

describe('EmployeesPage', () => {
    beforeEach(() => {
        departmentsApi.list.mockResolvedValue([{ departmentId: 1, departmentName: 'Engineering' }])
        employeesApi.list.mockResolvedValue(page(people))
    })

    it('lists employees with their account and status', async () => {
        renderPage(<EmployeesPage />, { route: '/employees', user: USERS.HR })
        const row = (await screen.findByText('Ravi Kumar')).closest('tr')
        expect(within(row).getByText('No account')).toBeInTheDocument()
        expect(within(row).getByText('Inactive')).toBeInTheDocument()
        expect(within(row).getByRole('button', { name: 'Edit Ravi Kumar' })).toBeInTheDocument()

        const adminRow = screen.getByText('Asha Admin').closest('tr')
        expect(within(adminRow).getByText('Restricted')).toBeInTheDocument()
        expect(within(adminRow).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('searches on the server after typing stops', async () => {
        renderPage(<EmployeesPage />, { route: '/employees', user: USERS.HR })
        await screen.findByText('Ravi Kumar')
        await userEvent.type(screen.getByLabelText('Search'), 'ravi')
        await waitFor(() =>
            expect(employeesApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ravi', page: 0 }))
        )
    })

    it('asks for confirmation before deleting', async () => {
        employeesApi.remove.mockResolvedValue(null)
        renderPage(<EmployeesPage />, { route: '/employees', user: USERS.HR })
        await userEvent.click(await screen.findByRole('button', { name: 'Delete Ravi Kumar' }))

        const dialog = await screen.findByRole('dialog')
        expect(dialog).toHaveTextContent(/set them to Inactive instead/)
        await userEvent.click(within(dialog).getByRole('button', { name: 'Delete permanently' }))

        await waitFor(() => expect(employeesApi.remove).toHaveBeenCalledWith(3))
        expect(await screen.findByText('Ravi Kumar was deleted.')).toBeInTheDocument()
    })

    it('shows a helpful empty state', async () => {
        employeesApi.list.mockResolvedValue(page([]))
        renderPage(<EmployeesPage />, { route: '/employees', user: USERS.ADMIN })
        expect(await screen.findByText('No employees yet')).toBeInTheDocument()
    })
})
