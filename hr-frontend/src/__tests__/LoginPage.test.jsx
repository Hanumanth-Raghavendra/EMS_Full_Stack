import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi, setupApi } from '../api/endpoints'
import LoginPage from '../pages/LoginPage'
import { USERS, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    authApi: { login: vi.fn(), me: vi.fn() },
    setupApi: { status: vi.fn() },
}))

describe('LoginPage', () => {
    beforeEach(() => {
        setupApi.status.mockResolvedValue({ setupRequired: false, demoMode: false, demoAccounts: [] })
    })

    it('signs in and goes to the dashboard', async () => {
        authApi.login.mockResolvedValue({ token: 't', expiresAt: '2099-01-01T00:00:00Z', user: USERS.EMPLOYEE })
        const { store } = renderPage(<LoginPage />, { route: '/login', path: '/login' })

        await userEvent.type(screen.getByLabelText(/username/i), '  ravi ')
        await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd!')
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'))
        expect(authApi.login).toHaveBeenCalledWith({ username: 'ravi', password: 'Passw0rd!' })
        expect(store.getState().auth.user.username).toBe('ravi')
    })

    it('returns to the page that needed a sign-in for the same person', async () => {
        authApi.login.mockResolvedValue({ token: 't', expiresAt: '2099-01-01T00:00:00Z', user: USERS.EMPLOYEE })
        renderPage(<LoginPage />, {
            route: { pathname: '/login', state: { from: '/leave?tab=mine' } },
            path: '/login',
            auth: { previousUsername: 'ravi' },
        })

        await userEvent.type(screen.getByLabelText(/username/i), 'ravi')
        await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd!')
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/leave?tab=mine'))
    })

    it("does not send the next person to the previous user's page after a reload", async () => {
        // Reloading the sign-in page keeps the history state but loses the store.
        authApi.login.mockResolvedValue({ token: 't', expiresAt: '2099-01-01T00:00:00Z', user: USERS.EMPLOYEE })
        renderPage(<LoginPage />, {
            route: { pathname: '/login', state: { from: '/audit-logs', by: 'admin' } },
            path: '/login',
        })

        await userEvent.type(screen.getByLabelText(/username/i), 'ravi')
        await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd!')
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'))
    })

    it("does not send the next person to the previous user's page", async () => {
        authApi.login.mockResolvedValue({ token: 't', expiresAt: '2099-01-01T00:00:00Z', user: USERS.EMPLOYEE })
        renderPage(<LoginPage />, {
            route: { pathname: '/login', state: { from: '/audit-logs' } },
            path: '/login',
            auth: { previousUsername: 'admin' },
        })

        await userEvent.type(screen.getByLabelText(/username/i), 'ravi')
        await userEvent.type(screen.getByLabelText(/^password/i), 'Passw0rd!')
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'))
    })

    it('shows the server message when sign-in fails', async () => {
        authApi.login.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid username or password.' } } })
        renderPage(<LoginPage />, { route: '/login', path: '/login' })

        await userEvent.type(screen.getByLabelText(/username/i), 'ravi')
        await userEvent.type(screen.getByLabelText(/^password/i), 'wrong-pass1')
        await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument()
        expect(screen.getByTestId('location')).toHaveTextContent('/login')
    })

    it('keeps the button disabled until both fields are filled', async () => {
        renderPage(<LoginPage />, { route: '/login', path: '/login' })
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
        await userEvent.type(screen.getByLabelText(/username/i), 'ravi')
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    })

    it('offers demo accounts that fill the form', async () => {
        setupApi.status.mockResolvedValue({
            setupRequired: false,
            demoMode: true,
            demoAccounts: [{ username: 'hr', password: 'Demo@12345', role: 'HR' }],
        })
        renderPage(<LoginPage />, { route: '/login', path: '/login' })

        await userEvent.click(await screen.findByRole('button', { name: /hr/i }))
        expect(screen.getByLabelText(/username/i)).toHaveValue('hr')
        expect(screen.getByLabelText(/^password/i)).toHaveValue('Demo@12345')
    })

    it('points to setup when no administrator exists', async () => {
        setupApi.status.mockResolvedValue({ setupRequired: true, demoMode: false, demoAccounts: [] })
        renderPage(<LoginPage />, { route: '/login', path: '/login' })
        expect(await screen.findByText(/no administrator yet/i)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Set up' })).toHaveAttribute('href', '/setup')
    })

    it('shows why the user was signed out', async () => {
        const { store } = renderPage(<LoginPage />, { route: '/login', path: '/login' })
        store.dispatch({ type: 'auth/signedOut', payload: 'Your session expired. Please sign in again.' })
        expect(await screen.findByText('Your session expired. Please sign in again.')).toBeInTheDocument()
    })
})
