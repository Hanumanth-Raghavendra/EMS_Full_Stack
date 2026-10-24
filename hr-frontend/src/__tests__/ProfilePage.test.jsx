import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi, employeesApi } from '../api/endpoints'
import ProfilePage from '../pages/ProfilePage'
import { USERS, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    authApi: { changePassword: vi.fn() },
    employeesApi: { me: vi.fn(), updateMyContact: vi.fn() },
}))

const me = {
    employeeId: 3,
    employeeCode: 'EMP003',
    fullName: 'Ravi Kumar',
    email: 'ravi@example.com',
    phone: '9876543210',
    departmentName: 'Engineering',
    designationName: 'Engineer',
    dateOfJoining: '2025-01-06',
    status: 'ACTIVE',
}

describe('ProfilePage', () => {
    beforeEach(() => {
        employeesApi.me.mockResolvedValue(me)
    })

    it('saves contact details only when they changed', async () => {
        employeesApi.updateMyContact.mockResolvedValue({ ...me, phone: '9123456789' })
        renderPage(<ProfilePage />, { route: '/profile', user: USERS.EMPLOYEE })

        const save = await screen.findByRole('button', { name: 'Save contact details' })
        expect(save).toBeDisabled()
        await userEvent.clear(screen.getByLabelText(/mobile number/i))
        await userEvent.type(screen.getByLabelText(/mobile number/i), '9123456789')
        await userEvent.click(save)
        await waitFor(() =>
            expect(employeesApi.updateMyContact).toHaveBeenCalledWith({ email: 'ravi@example.com', phone: '9123456789' })
        )
        expect(await screen.findByText('Contact details saved.')).toBeInTheDocument()
    })

    it('changes the password and keeps the user signed in with the new session', async () => {
        authApi.changePassword.mockResolvedValue({
            token: 'new-token',
            expiresAt: '2099-01-01T00:00:00Z',
            user: USERS.EMPLOYEE,
        })
        const { store } = renderPage(<ProfilePage />, { route: '/profile', user: USERS.EMPLOYEE })
        await screen.findByRole('button', { name: 'Change password' })

        await userEvent.type(screen.getByLabelText(/current password/i), 'OldPass123')
        await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPass123')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPass123')
        await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

        await waitFor(() =>
            expect(authApi.changePassword).toHaveBeenCalledWith({ currentPassword: 'OldPass123', newPassword: 'NewPass123' })
        )
        expect(store.getState().auth.token).toBe('new-token')
        expect(await screen.findByText(/Other devices have been signed out/)).toBeInTheDocument()
    })

    it('shows a wrong current password next to the field', async () => {
        authApi.changePassword.mockRejectedValue({
            response: { status: 400, data: { message: 'x', fieldErrors: { currentPassword: 'Current password is incorrect.' } } },
        })
        renderPage(<ProfilePage />, { route: '/profile', user: USERS.EMPLOYEE })
        await screen.findByRole('button', { name: 'Change password' })
        await userEvent.type(screen.getByLabelText(/current password/i), 'Wrong1234')
        await userEvent.type(screen.getByLabelText(/^new password/i), 'NewPass123')
        await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPass123')
        await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
        expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument()
    })
})
