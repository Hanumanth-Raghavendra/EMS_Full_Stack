import { screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AppLayout from '../components/layout/AppLayout'
import RequireRole from '../components/routing/RequireRole'
import { USERS, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({}))

describe('navigation by role', () => {
    it('shows employees only their own workday links', () => {
        renderPage(<AppLayout />, { route: '/dashboard', user: USERS.EMPLOYEE })
        const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]
        expect(nav).toHaveTextContent('Dashboard')
        expect(nav).toHaveTextContent('Leave')
        expect(nav).not.toHaveTextContent('Employees')
        expect(nav).not.toHaveTextContent('User accounts')
        expect(nav).not.toHaveTextContent('Audit log')
    })

    it('shows HR people management but not the audit log', () => {
        renderPage(<AppLayout />, { route: '/dashboard', user: USERS.HR })
        const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]
        expect(nav).toHaveTextContent('Employees')
        expect(nav).toHaveTextContent('User accounts')
        expect(nav).not.toHaveTextContent('Audit log')
    })

    it('shows administrators everything', () => {
        renderPage(<AppLayout />, { route: '/dashboard', user: USERS.ADMIN })
        expect(screen.getAllByRole('navigation', { name: 'Main' })[0]).toHaveTextContent('Audit log')
    })

    it('blocks pages the role cannot open', () => {
        renderPage(<RequireRole roles={['ADMIN']} />, {
            route: '/audit-logs',
            path: '/',
            user: USERS.HR,
            extraRoutes: (
                <Route element={<RequireRole roles={['ADMIN']} />}>
                    <Route path="/audit-logs" element={<div>secret</div>} />
                </Route>
            ),
        })
        expect(screen.getByText("You don't have access to this page")).toBeInTheDocument()
        expect(screen.queryByText('secret')).not.toBeInTheDocument()
    })
})
