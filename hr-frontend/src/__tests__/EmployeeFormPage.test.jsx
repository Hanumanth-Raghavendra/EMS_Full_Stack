import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { departmentsApi, designationsApi, employeesApi } from '../api/endpoints'
import EmployeeFormPage from '../pages/EmployeeFormPage'
import { USERS, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    employeesApi: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
    departmentsApi: { list: vi.fn() },
    designationsApi: { list: vi.fn() },
}))

async function choose(label, option) {
    await userEvent.click(screen.getByRole('combobox', { name: label }))
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: option }))
}

function fill(label, value) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('EmployeeFormPage', () => {
    beforeEach(() => {
        departmentsApi.list.mockResolvedValue([{ departmentId: 1, departmentName: 'Engineering' }])
        designationsApi.list.mockResolvedValue([{ designationId: 7, designationName: 'Software Engineer' }])
    })

    it('validates in the browser before saving', async () => {
        renderPage(<EmployeeFormPage />, { route: '/employees/new', path: '/employees/new', user: USERS.HR })
        await screen.findByRole('combobox', { name: /department/i })
        fill(/first name/i, 'R4vi')
        fill(/mobile number/i, '12345')
        await userEvent.click(screen.getByRole('button', { name: 'Add employee' }))

        expect(screen.getByText(/Use letters only/)).toBeInTheDocument()
        expect(screen.getByText(/10-digit mobile number/)).toBeInTheDocument()
        expect(screen.getByText('Choose a department.')).toBeInTheDocument()
        expect(employeesApi.create).not.toHaveBeenCalled()
    })

    it('loads designations for the chosen department and saves', async () => {
        employeesApi.create.mockResolvedValue({ fullName: 'Ravi Kumar' })
        renderPage(<EmployeeFormPage />, { route: '/employees/new', path: '/employees/new', user: USERS.HR })

        expect(await screen.findByRole('combobox', { name: /designation/i })).toHaveAttribute('aria-disabled', 'true')
        fill(/first name/i, 'Ravi')
        fill(/last name/i, 'Kumar')
        fill(/employee code/i, 'emp-003')
        fill(/date of joining/i, '2025-01-06')
        fill(/work email/i, 'ravi@example.com')
        fill(/mobile number/i, '9876543210')
        await choose(/department/i, 'Engineering')
        await waitFor(() => expect(designationsApi.list).toHaveBeenCalledWith(1))
        await choose(/designation/i, 'Software Engineer')
        await userEvent.click(screen.getByRole('button', { name: 'Add employee' }))

        await waitFor(() =>
            expect(employeesApi.create).toHaveBeenCalledWith(
                expect.objectContaining({ employeeCode: 'emp-003', departmentId: 1, designationId: 7, status: 'ACTIVE' })
            )
        )
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/employees'))
    })

    it('shows field errors returned by the server', async () => {
        employeesApi.create.mockRejectedValue({
            response: {
                status: 409,
                data: {
                    message: 'Another employee already uses this email.',
                    fieldErrors: { email: 'Another employee already uses this email.' },
                },
            },
        })
        renderPage(<EmployeeFormPage />, { route: '/employees/new', path: '/employees/new', user: USERS.HR })
        await screen.findByRole('combobox', { name: /department/i })
        fill(/first name/i, 'Ravi')
        fill(/last name/i, 'Kumar')
        fill(/employee code/i, 'EMP003')
        fill(/date of joining/i, '2025-01-06')
        fill(/work email/i, 'taken@example.com')
        fill(/mobile number/i, '9876543210')
        await choose(/department/i, 'Engineering')
        await choose(/designation/i, 'Software Engineer')
        await userEvent.click(screen.getByRole('button', { name: 'Add employee' }))

        expect(await screen.findAllByText('Another employee already uses this email.')).toHaveLength(2)
    })

    it('blocks editing records the user may not manage', async () => {
        employeesApi.get.mockResolvedValue({ employeeId: 1, fullName: 'Asha Admin', canManage: false })
        renderPage(<EmployeeFormPage />, {
            route: '/employees/1/edit',
            path: '/employees/:employeeId/edit',
            user: USERS.HR,
        })
        expect(await screen.findByText(/Only administrators can change/)).toBeInTheDocument()
    })
})
