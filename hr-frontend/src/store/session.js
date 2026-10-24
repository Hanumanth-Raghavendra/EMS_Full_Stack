/** Persistence of the signed-in session in localStorage (best effort). */

export const SESSION_KEY = 'ems.session'

export function loadSession(now = Date.now()) {
    try {
        const raw = window.localStorage.getItem(SESSION_KEY)
        if (!raw) {
            return null
        }
        const session = JSON.parse(raw)
        if (!session?.token || !session?.user || !session?.expiresAt) {
            return null
        }
        if (new Date(session.expiresAt).getTime() <= now) {
            window.localStorage.removeItem(SESSION_KEY)
            return null
        }
        return session
    } catch {
        return null
    }
}

export function saveSession(session) {
    try {
        if (session?.token) {
            window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        } else {
            window.localStorage.removeItem(SESSION_KEY)
        }
    } catch {
        // Storage can be unavailable (private mode); the session then lasts for this tab only.
    }
}
