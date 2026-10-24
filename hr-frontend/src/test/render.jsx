import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AppProviders from '../context/AppProviders'
import { createStore } from '../store'

export const USERS = {
    ADMIN: {
        userId: 1,
        username: 'admin',
        role: 'ADMIN',
        employeeId: 1,
        employeeCode: 'EMP001',
        fullName: 'Asha Admin',
        email: 'asha@example.com',
    },
    HR: {
        userId: 2,
        username: 'hr',
        role: 'HR',
        employeeId: 2,
        employeeCode: 'EMP002',
        fullName: 'Harini Rao',
        email: 'harini@example.com',
    },
    EMPLOYEE: {
        userId: 3,
        username: 'ravi',
        role: 'EMPLOYEE',
        employeeId: 3,
        employeeCode: 'EMP003',
        fullName: 'Ravi Kumar',
        email: 'ravi@example.com',
    },
}

export function LocationProbe() {
    const location = useLocation()
    return <div data-testid="location">{location.pathname + location.search}</div>
}

/**
 * Renders a page inside every provider the app uses, at `route`, optionally
 * signed in as one of USERS.
 */
export function renderPage(element, { route = '/', path = '*', user = null, extraRoutes = null, auth = {} } = {}) {
    const store = createStore({
        auth: {
            token: user ? 'test-token' : null,
            expiresAt: user ? '2099-01-01T00:00:00Z' : null,
            user,
            status: 'idle',
            error: null,
            signedOutReason: null,
            previousUsername: null,
            ...auth,
        },
    })
    const result = render(
        <AppProviders store={store}>
            <MemoryRouter initialEntries={[route]}>
                <Routes>
                    <Route path={path} element={element} />
                    {extraRoutes}
                    <Route path="*" element={<div data-testid="other-route" />} />
                </Routes>
                <LocationProbe />
            </MemoryRouter>
        </AppProviders>
    )
    return { store, ...result }
}

export function page(content, extra = {}) {
    return {
        content,
        page: 0,
        size: 20,
        totalElements: content.length,
        totalPages: 1,
        first: true,
        last: true,
        ...extra,
    }
}
