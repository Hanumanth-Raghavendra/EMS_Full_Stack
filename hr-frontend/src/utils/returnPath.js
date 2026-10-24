/**
 * Where to go after signing in.
 *
 * Returns to the page that asked for a sign-in (a deep link, or the page open
 * when the session expired), but only for the same person: after someone else
 * signed out, the next user starts on their dashboard instead of landing on a
 * page that belonged to the previous user's session.
 */
export function returnPath(from, previousUsername, username) {
    const fallback = '/dashboard'
    if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/login')) {
        return fallback
    }
    if (previousUsername && username && previousUsername.toLowerCase() !== username.toLowerCase()) {
        return fallback
    }
    return from
}
