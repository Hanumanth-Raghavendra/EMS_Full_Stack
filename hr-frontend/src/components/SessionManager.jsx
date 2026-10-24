import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { SESSION_EXPIRED_EVENT } from '../api/client'
import { authApi } from '../api/endpoints'
import { selectAuth, signedOut, userUpdated } from '../store/authSlice'

/**
 * Keeps the session honest:
 *  - signs out when the API rejects the token (expired, password changed, disabled);
 *  - signs out when the token's lifetime ends, even if the tab stays idle;
 *  - refreshes the profile once per session so role changes are picked up.
 */
export default function SessionManager() {
    const dispatch = useDispatch()
    const { token, expiresAt } = useSelector(selectAuth)

    useEffect(() => {
        const onExpired = (event) => {
            dispatch(signedOut(event.detail || 'Your session has ended. Please sign in again.'))
        }
        window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
    }, [dispatch])

    useEffect(() => {
        if (!token || !expiresAt) {
            return undefined
        }
        const remaining = new Date(expiresAt).getTime() - Date.now()
        // setTimeout overflows above ~24.8 days; sessions are much shorter.
        const delay = Math.min(Math.max(remaining, 0), 2_000_000_000)
        const timer = setTimeout(() => {
            dispatch(signedOut('Your session expired. Please sign in again.'))
        }, delay)
        return () => clearTimeout(timer)
    }, [token, expiresAt, dispatch])

    useEffect(() => {
        if (!token) {
            return
        }
        authApi
            .me()
            .then((profile) => dispatch(userUpdated(profile)))
            .catch(() => {
                // 401s are handled by the interceptor; anything else can wait.
            })
    }, [token, dispatch])

    return null
}
