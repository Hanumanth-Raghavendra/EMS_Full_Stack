import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    render,
    screen,
    fireEvent,
    waitFor,
} from '@testing-library/react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Login from './Login'
import { loginUser } from '../store/authSlice'

vi.mock('react-redux', () => ({
    useDispatch: vi.fn(),
    useSelector: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
}))

vi.mock('../store/authSlice', () => ({
    clearAuthError: vi.fn(() => ({
        type: 'auth/clearAuthError',
    })),
    loginUser: Object.assign(
        vi.fn(() => ({
            type: 'auth/loginUser',
        })),
        {
            fulfilled: {
                match: vi.fn(() => false),
            },
        }
    ),
}))

describe('Login component', () => {
    let mockDispatch
    let mockNavigate

    beforeEach(() => {
        vi.clearAllMocks()

        mockDispatch = vi.fn(() => Promise.resolve({}))
        mockNavigate = vi.fn()

        useDispatch.mockReturnValue(mockDispatch)
        useNavigate.mockReturnValue(mockNavigate)

        useSelector.mockReturnValue({
            loading: false,
            error: null,
            isAuthenticated: false,
        })
    })

    it('navigates to dashboard after successful login', async () => {
        loginUser.mockReturnValue({
            type: 'auth/loginUser',
        })

        loginUser.fulfilled.match.mockReturnValue(true)

        mockDispatch.mockResolvedValue({
            type: 'auth/loginUser/fulfilled',
        })

        render(<Login />)

        fireEvent.change(
            screen.getByLabelText('Username'),
            {
                target: { value: 'admin' },
            }
        )

        fireEvent.change(
            screen.getByLabelText('Password'),
            {
                target: { value: 'password123' },
            }
        )

        fireEvent.submit(
            screen
                .getByRole('button', { name: 'Sign in' })
                .closest('form')
        )

        expect(loginUser).toHaveBeenCalledWith({
            username: 'admin',
            password: 'password123',
        })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith(
                '/dashboard',
                { replace: true }
            )
        })
    })

    it('renders the login form', () => {
        render(<Login />)

        expect(
            screen.getByText('HR Management System')
        ).toBeInTheDocument()

        expect(
            screen.getByLabelText('Username')
        ).toBeInTheDocument()

        expect(
            screen.getByLabelText('Password')
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', {
                name: 'Sign in',
            })
        ).toBeInTheDocument()
    })

    it('does not login when username is empty', () => {
        render(<Login />)

        const form = screen
            .getByRole('button', { name: 'Sign in' })
            .closest('form')

        fireEvent.submit(form)

        expect(mockDispatch).toHaveBeenCalledTimes(1)
    })

    it('does not login when password is empty', () => {
        render(<Login />)

        fireEvent.change(
            screen.getByLabelText('Username'),
            {
                target: { value: 'admin' },
            }
        )

        const form = screen
            .getByRole('button', { name: 'Sign in' })
            .closest('form')

        fireEvent.submit(form)

        expect(mockDispatch).toHaveBeenCalledTimes(1)
    })

    it('navigates to setup when Initial Setup is clicked', () => {
        render(<Login />)

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Initial Setup',
            })
        )

        expect(mockNavigate).toHaveBeenCalledWith('/setup')
    })

    it('redirects authenticated users to dashboard', () => {
        useSelector.mockReturnValue({
            loading: false,
            error: null,
            isAuthenticated: true,
        })

        render(<Login />)

        expect(mockNavigate).toHaveBeenCalledWith(
            '/dashboard',
            { replace: true }
        )
    })

    it('displays authentication error when login fails', () => {
        useSelector.mockReturnValue({
            loading: false,
            error: 'Invalid username or password',
            isAuthenticated: false,
        })

        render(<Login />)

        expect(
            screen.getByText('Invalid username or password')
        ).toBeInTheDocument()
    })

    it('disables inputs and buttons while authentication is loading', () => {
        useSelector.mockReturnValue({
            loading: true,
            error: null,
            isAuthenticated: false,
        })

        render(<Login />)

        expect(
            screen.getByLabelText('Username')
        ).toBeDisabled()

        expect(
            screen.getByLabelText('Password')
        ).toBeDisabled()

        expect(
            screen.getByRole('button', {
                name: 'Signing in...',
            })
        ).toBeDisabled()
    })
})