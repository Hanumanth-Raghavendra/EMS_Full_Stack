import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { departmentsApi } from '../api/endpoints'
import DepartmentsPage from '../pages/DepartmentsPage'
import { USERS, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    departmentsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

describe('DepartmentsPage', () => {
    beforeEach(() => {
        departmentsApi.list.mockResolvedValue([
            { departmentId: 1, departmentName: 'Engineering', description: 'Builds things', employeeCount: 4, designationCount: 2 },
        ])
    })

    it('adds a department and shows server-side conflicts on the field', async () => {
        departmentsApi.create.mockRejectedValueOnce({
            response: {
                status: 409,
                data: {
                    message: 'A department with this name already exists.',
                    fieldErrors: { departmentName: 'A department with this name already exists.' },
                },
            },
        })
        departmentsApi.create.mockResolvedValueOnce({ departmentId: 2 })
        renderPage(<DepartmentsPage />, { route: '/departments', user: USERS.HR })

        await userEvent.click(await screen.findByRole('button', { name: 'Add department' }))
        const dialog = await screen.findByRole('dialog')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Add department' }))
        expect(within(dialog).getByText('Department name is required.')).toBeInTheDocument()

        await userEvent.type(within(dialog).getByLabelText(/name/i), 'engineering')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Add department' }))
        expect(await within(dialog).findAllByText('A department with this name already exists.')).toHaveLength(2)

        await userEvent.clear(within(dialog).getByLabelText(/name/i))
        await userEvent.type(within(dialog).getByLabelText(/name/i), 'Finance')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Add department' }))
        await waitFor(() =>
            expect(departmentsApi.create).toHaveBeenLastCalledWith({ departmentName: 'Finance', description: null })
        )
        expect(await screen.findByText('Department added.')).toBeInTheDocument()
    })

    it('shows why a department in use cannot be deleted', async () => {
        departmentsApi.remove.mockRejectedValue({
            response: { status: 409, data: { message: "Cannot delete 'Engineering': it still has 4 employee(s)." } },
        })
        renderPage(<DepartmentsPage />, { route: '/departments', user: USERS.ADMIN })
        await userEvent.click(await screen.findByRole('button', { name: 'Delete Engineering' }))
        await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }))
        expect(await screen.findByText(/still has 4 employee/)).toBeInTheDocument()
    })

    it('links employee counts to a filtered employee list', async () => {
        renderPage(<DepartmentsPage />, { route: '/departments', user: USERS.ADMIN })
        expect(await screen.findByRole('link', { name: '4' })).toHaveAttribute('href', '/employees?departmentId=1')
    })
})
