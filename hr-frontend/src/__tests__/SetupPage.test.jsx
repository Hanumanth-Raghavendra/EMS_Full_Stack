import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { setupApi } from '../api/endpoints'
import SetupPage from '../pages/SetupPage'
import { renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    setupApi: { status: vi.fn(), createFirstAdmin: vi.fn() },
}))

function fill(label, value) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('SetupPage', () => {
    it('validates before calling the API', async () => {
        setupApi.status.mockResolvedValue({ setupRequired: true, setupTokenRequired: true })
        renderPage(<SetupPage />, { route: '/setup', path: '/setup' })

        await screen.findByRole('heading', { name: 'Create the administrator' })
        fill(/^password/i, 'Passw0rd!')
        fill(/confirm password/i, 'Different1')
        await userEvent.click(screen.getByRole('button', { name: 'Create administrator' }))

        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
        expect(screen.getByText('First name is required.')).toBeInTheDocument()
        expect(screen.getByText('Enter the setup token.')).toBeInTheDocument()
        expect(setupApi.createFirstAdmin).not.toHaveBeenCalled()
    })

    it('creates the administrator and returns to sign in', async () => {
        setupApi.status.mockResolvedValue({ setupRequired: true, setupTokenRequired: false })
        setupApi.createFirstAdmin.mockResolvedValue({ username: 'boss' })
        renderPage(<SetupPage />, { route: '/setup', path: '/setup' })

        await screen.findByRole('heading', { name: 'Create the administrator' })
        fill(/first name/i, 'Asha')
        fill(/last name/i, 'Admin')
        fill(/employee code/i, 'EMP001')
        fill(/work email/i, 'asha@example.com')
        fill(/^username/i, 'boss')
        fill(/^password/i, 'Passw0rd!')
        fill(/confirm password/i, 'Passw0rd!')
        await userEvent.click(screen.getByRole('button', { name: 'Create administrator' }))

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
        expect(setupApi.createFirstAdmin).toHaveBeenCalledWith(
            expect.objectContaining({ employeeCode: 'EMP001', username: 'boss', password: 'Passw0rd!', phone: null })
        )
    })

    it('can link an existing employee instead', async () => {
        setupApi.status.mockResolvedValue({ setupRequired: true, setupTokenRequired: false })
        setupApi.createFirstAdmin.mockResolvedValue({ username: 'admin' })
        renderPage(<SetupPage />, { route: '/setup', path: '/setup' })

        await userEvent.click(await screen.findByRole('button', { name: /already an employee/i }))
        fill(/your employee code/i, 'EMP042')
        fill(/^password/i, 'Passw0rd!')
        fill(/confirm password/i, 'Passw0rd!')
        await userEvent.click(screen.getByRole('button', { name: 'Create administrator' }))

        await waitFor(() =>
            expect(setupApi.createFirstAdmin).toHaveBeenCalledWith(
                expect.objectContaining({ existingEmployeeCode: 'EMP042', username: 'admin' })
            )
        )
    })

    it('explains when setup is already complete', async () => {
        setupApi.status.mockResolvedValue({ setupRequired: false })
        renderPage(<SetupPage />, { route: '/setup', path: '/setup' })
        expect(await screen.findByText('Setup is already complete')).toBeInTheDocument()
    })
})
