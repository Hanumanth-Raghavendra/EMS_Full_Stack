import { describe, expect, it, vi } from 'vitest'
import reducer, { buildInitialState, login, sessionStarted, signedOut } from '../store/authSlice'
import { createStore } from '../store'
import { SESSION_KEY, loadSession } from '../store/session'

vi.mock('../api/endpoints', () => ({
    authApi: { login: vi.fn() },
}))

const session = {
    token: 'abc',
    expiresAt: '2099-01-01T00:00:00Z',
    user: { username: 'ravi', role: 'EMPLOYEE', fullName: 'Ravi Kumar' },
}

describe('auth slice', () => {
    it('stores the session after a successful login', () => {
        const state = reducer(buildInitialState(null), login.fulfilled(session, 'id', {}))
        expect(state.token).toBe('abc')
        expect(state.user.username).toBe('ravi')
        expect(state.status).toBe('idle')
    })

    it('keeps the error message when login fails', () => {
        const state = reducer(buildInitialState(null), login.rejected(null, 'id', {}, 'Invalid username or password.'))
        expect(state.error).toBe('Invalid username or password.')
        expect(state.token).toBeNull()
    })

    it('records why the user was signed out', () => {
        const started = reducer(buildInitialState(null), sessionStarted(session))
        const state = reducer(started, signedOut('Your session expired.'))
        expect(state.token).toBeNull()
        expect(state.user).toBeNull()
        expect(state.signedOutReason).toBe('Your session expired.')
    })
})

describe('session persistence', () => {
    it('saves and clears the session in localStorage', () => {
        const store = createStore()
        store.dispatch(sessionStarted(session))
        expect(JSON.parse(window.localStorage.getItem(SESSION_KEY)).token).toBe('abc')

        store.dispatch(signedOut())
        expect(window.localStorage.getItem(SESSION_KEY)).toBeNull()
    })

    it('ignores expired or corrupt sessions', () => {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, expiresAt: '2000-01-01T00:00:00Z' }))
        expect(loadSession()).toBeNull()
        window.localStorage.setItem(SESSION_KEY, '{not json')
        expect(loadSession()).toBeNull()
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        expect(loadSession().user.username).toBe('ravi')
    })
})
